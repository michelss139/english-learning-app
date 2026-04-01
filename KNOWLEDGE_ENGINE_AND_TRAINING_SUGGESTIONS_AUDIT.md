# Audyt: Knowledge engine + „Co trenować” (stan aktualny)

**Data:** 2026-03-28  
**Cel:** Jeden spójny opis **całego** działającego na stronie systemu: (1) **zbierania i agregacji wiedzy** użytkownika o jednostkach treningowych, (2) **sugestii „co ćwiczyć dalej”** na podstawie tej wiedzy i powiązanych sygnałów.  
**Zastępuje:** `CO_TRENOWAC_AUDIT.md` oraz `INTELLIGENT_SUGGESTIONS_V2_AUDIT.md` (treść legacy: §7; historia dokumentacji: §9).

---

## 1. Jak to się układa (jedno zdanie)

Odpowiedzi użytkownika (pakiety słówek, klastry, gramatyka, irregular) **aktualizują** wiersze w **`user_learning_unit_knowledge`** przez **`updateLearningUnitKnowledge`**. Widget **„Co trenować”** i blok **„Twój plan na teraz”** na profilu **ciągną ranking** z **`GET /api/suggestions`**, który czyta tę tabelę (+ słabsze formy irregular z **`irregular_verb_runs`**). **Nie** korzystają już z endpointu `intelligent-suggestions-v2`.

---

## 2. Rdzeń: `user_learning_unit_knowledge`

**Implementacja aktualizacji:** `lib/knowledge/updateLearningUnitKnowledge.ts`

### 2.1 Typy jednostek (`unit_type` → `unit_id`)

| `unit_type` | Znaczenie `unit_id` | Kontrakt |
|-------------|---------------------|----------|
| `sense` | UUID sensu leksykonu (`lexicon_senses.id`) | Jedno „znaczenie słówka” (fiszki packów aktualizują knowledge **per sense**). |
| `cluster` | Slug klastra (np. `make-do`) | Grupa kolokacji / typowych błędów. |
| `irregular` | UUID czasownika w `irregular_verbs` | Jedna „kartka” czasownika (wiedza ogólna); **szczegółowe** słabe formy są dodatkowo liczone z **runów** (patrz §4). |
| `grammar` | **Slug ćwiczenia** (temat), np. `present-simple` | **Nigdy** `question_id` — agregacja na poziomie tematu (`isRegisteredGrammarExerciseSlug`). |

### 2.2 Stany (`knowledge_state`)

Wartości: `new` | `unstable` | `improving` | `mastered` (logika w `computeKnowledgeState` / `computeSessionKnowledgeState` przy `mode: "session"`).

Przykładowe reguły (uproszczenie): pojedyncza pierwsza próba → `mastered` lub `unstable`; seria błędów po ostatnim sukcesie → `unstable`; poprawki po błędzie → `improving` / `mastered` w zależności od bilansu.

### 2.3 Liczniki i pola

Przy **`payload.mode === "answer"`** (pojedyncza odpowiedź): inkrementacja `total_attempts`, `correct_count` / `wrong_count`, znaczniki czasu `last_correct_at` / `last_wrong_at`, `stability_score` (np. `correct*2 - wrong*3`), aktualizacja `knowledge_state`.

Przy **`payload.mode === "session"`**: batch po zakończeniu sesji (np. suma poprawnych/błędnych z sesji).

### 2.4 Zdarzenia vs wiedza

**`vocab_answer_events`** (i analogiczne eventy innych modułów) to **dziennik** odpowiedzi. **Źródłem prawdy dla sugestii „co trenować”** w aktualnym UI jest **`user_learning_unit_knowledge`** (oraz **`irregular_verb_runs`** dla form). MV opisane w §9 agregują eventy **osobno** i są używane wyłącznie przez **legacy** endpoint.

---

## 3. Kto wywołuje `updateLearningUnitKnowledge`

| Módł | Plik | `unitType` | Moment |
|------|------|------------|--------|
| Pakiety słownictwa | `app/api/vocab/packs/[slug]/answer/route.ts` | `sense` | Po sprawdzeniu odpowiedzi w packu (`is_correct`). |
| Klastry | `app/api/vocab/clusters/[slug]/questions/route.ts` | `cluster` | Po ocenie odpowiedzi. |
| Gramatyka | `app/api/grammar/answer/route.ts` | `grammar` | Po ocenie (`slug` tematu, nie id pytania). |
| Irregular | `app/api/irregular-verbs/submit/route.ts` | `irregular` | Po submit (w trybie zgodnym z implementacją). |

Błędy zapisu wiedzy są logowane; zwykle **nie** blokują odpowiedzi HTTP użytkownikowi.

---

## 4. `GET /api/suggestions` — „inteligentne” sugestie (aktualny silnik UI)

**Plik:** `app/api/suggestions/route.ts`  
**Auth:** `getUser()` (sesja).

### 4.1 Odpowiedź

```json
{ "top": Suggestion[], "list": Suggestion[] }
```

- **`top`:** do **2** pozycji (unikalne `href`).
- **`list`:** do **5** pozycji z pełnej listy po sortowaniu (mogą się powtarzać `href` względem teorii limitu — w kodzie `list` bierze `slice(0, LIST_LIMIT)` z `scored`).

Każdy `Suggestion`: `unitType`, `unitId`, `accuracy`, `priority`, opcjonalnie `form` / `label` (irregular), `href`, `displayName`.

### 4.2 Źródło 1: `user_learning_unit_knowledge`

- Pobierane są wiersze użytkownika.
- **`unit_type === "irregular"`** z tej tabeli **nie** dostaje osobnej karty sensu pack — służy głównie do **metadanych** (`knowledge_state`, `last_wrong_at`, `wrong_count`) przy liczeniu priorytetu dla form z runów (patrz niżej).
- Dla **`sense`, `cluster`, `grammar`:** brane pod uwagę tylko wiersze z **sumą prób** `correct + wrong >= MIN_ATTEMPTS` (**3**).
- **Accuracy** = `correct / (correct + wrong)`.
- **Priorytet (`priority`):**  
  `(1 - accuracy) * W_ACCURACY + wrong_count * W_WRONG + stateBonus + recencyBonus`  
  (`W_ACCURACY = 10`, `W_WRONG = 0.5`; bonus za `unstable` / `improving`; bonus jeśli ostatni błąd &lt; 24 h / 72 h).

### 4.3 Źródło 2: `irregular_verb_runs`

- Ostatnie runy użytkownika; per czasownik liczona **accuracy** osobno dla **past simple** i **past participle** (np. ostatnie **6** wpisów z niepustym polem formy).
- Minimum **2** próby na formę (`MIN_IRREGULAR_RUNS`), próg słabości **&lt; 0.85** (`WEAK_THRESHOLD`).
- Powstają osobne sugestie z `form` i linkiem `mode=targeted&targets=...`.

### 4.4 Linki (`buildHref`)

- `sense` → `/app/vocab` (zbiorcze „powtórz słówka”).
- `cluster` → `/app/vocab/cluster/${unitId}?autostart=1`
- `grammar` → `/app/grammar/${unitId}/practice`
- `irregular` (+ `form`) → `/app/irregular-verbs/train?mode=targeted&targets=...`

---

## 5. Warstwa UI (co użytkownik widzi)

### 5.1 GlobalTrainingSuggestion — „Co trenować”

**Plik:** `app/app/GlobalTrainingSuggestion.tsx`  
**Montowanie:** `app/app/layout.tsx` (nakładka na `/app/*`).

- Dane: **`GET /api/suggestions`** (`top` + `list`).
- **Fallback** statyczny, gdy brak `top`.
- **Irregular:** bundling wielu form w jedną kartę / jeden URL (limit form w implementacji).
- **Stabilność sesji:** `lockedOptions` / `activeSessionHref` — snapshot przy starcie, żeby lista nie migotała w trakcie treningu.
- Po zakończeniu treningu: `subscribeTrainingCompleted` → odświeżenie sugestii.

### 5.2 Profil — „Twój plan na teraz”

**Plik:** `app/app/profile/page.tsx`

- Ten sam **`GET /api/suggestions`** (Bearer w fetch).
- Karty z `buildDisplayCards(top, list)` — spójna logika z widgetem co do irregular.

### 5.3 Inne

**`components/SuggestionsPanel.tsx`** — konsumuje `list`; na moment audytu może być **nieużywany** na stronach — warto zweryfikować przed planowaniem nawigacji.

### 5.4 Eventy

**`lib/events/trainingEvents.ts`** — `emitTrainingCompleted` / subskrypcje (m.in. profil, globalny widget) do **refetch** sugestii po sesji.

---

## 6. Endpointy powiązane (nie mylić z głównym silnikiem „Co trenować”)

| Endpoint | Rola |
|----------|------|
| `GET /api/vocab/suggestions` | Inna heurystyka (słownictwo / historia błędów) — **nie** tożsame z `/api/suggestions`. |
| `GET /api/vocab/packs/[slug]/recommendations` | Rekomendacje **wewnątrz** treningu packa (`PackTrainingClient`). |
| `GET /api/app/suggestion` | Pojedyncza sugestia — **nie** napędza obecnego profilu / widgetu „Co trenować”. |

---

## 7. Legacy: `intelligent-suggestions-v2` i materialized views

### 7.1 Endpoint

**`app/api/app/intelligent-suggestions-v2/route.ts`** nadal istnieje. Zwracał m.in.:

- irregular (problemowe wg `user_learning_unit_knowledge`),
- **packi** i **klastry** z **materialized views** `mv_user_pack_accuracy`, `mv_user_cluster_accuracy`.

**Interfejs użytkownika nie wywołuje już tego endpointu** — zastąpił go **`GET /api/suggestions`** (profil + widget).

### 7.2 Materialized views

**Migracja:** `supabase/migrations/20260220_create_intelligent_suggestion_materialized_views.sql`

- **`mv_user_pack_accuracy`** — agregacja `vocab_answer_events` (`context_type = 'vocab_pack'`).
- **`mv_user_cluster_accuracy`** — agregacja dla `vocab_cluster`.
- Funkcja **`refresh_intelligent_suggestion_views()`** — odświeżenie MV (ew. cron operacyjny).

**Uwaga:** aktualny **`/api/suggestions`** **nie czyta** tych MV — opiera się na **`user_learning_unit_knowledge`** i **`irregular_verb_runs`**. MV mogą być nadal użyteczne do raportów, admina lub przyszłego powrotu packów/clusters do osobnego rankingu; warto utrzymać świadomość kosztu ich utrzymania vs brak konsumenta w UI.

### 7.3 Rekomendacje utrzymaniowe

1. **Produktowo:** oznaczyć `intelligent-suggestions-v2` jako **deprecated** / usunąć, jeśli brak planów na osobny feed pack/cluster oparty na MV.  
2. **Operacyjnie:** ocenić, czy **refresh MV** jest jeszcze potrzebny, jeśli żaden produkcyjny endpoint z UI z nich nie korzysta.

---

## 8. Powiązane dokumenty w repo

| Dokument | Uwaga |
|----------|--------|
| `PROJECT_TECHNICAL_AUDIT.md` | Szeroki przegląd projektu — aktualizacja odnośników do **tego** pliku. |
| `COACH_SYSTEM_AUDIT.md` | Coach / typewriter — powiązanie z flow treningu. |
| `IRREGULAR_VERBS_TECHNICAL_AUDIT.md` | Szczegóły irregular + submit. |
| `PROFILE_TRAINING_SUBSCRIPTION_AUDIT.md` | Subskrypcje profilu po treningu. |

---

## 9. Historia dokumentacji

- **2026-03-06 / 2026-03-19:** Rozdzielone opisy: `CO_TRENOWAC_AUDIT.md` (aktualny `/api/suggestions`) oraz `INTELLIGENT_SUGGESTIONS_V2_AUDIT.md` (legacy endpoint + MV).  
- **2026-03-28:** Scalenie w **ten dokument**: pełna ścieżka **knowledge engine → sugestie → UI**, z legacy w §7.

---

*Koniec audytu.*
