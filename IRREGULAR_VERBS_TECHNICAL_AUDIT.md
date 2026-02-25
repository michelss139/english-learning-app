# Audyt techniczny: system Irregular Verbs

**Data:** 2026-02-20  
**Cel:** Pełne zmapowanie stanu systemu irregular verbs przed integracją z knowledge engine.  
**Zakres:** Tylko opis stanu obecnego. Bez propozycji zmian, refaktoru ani sugestii.

---

## 1. Struktura bazy danych

### 1.1 Tabela `irregular_verbs`

| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK, default gen_random_uuid() |
| base | text | NOT NULL | forma bazowa (np. "go") |
| base_norm | text | NOT NULL | znormalizowana forma bazowa |
| past_simple | text | NOT NULL | forma Past Simple |
| past_simple_variants | text[] | NULL | warianty (np. ["were"] dla "be") |
| past_participle | text | NOT NULL | forma Past Participle |
| past_participle_variants | text[] | NULL | warianty (np. ["gotten"] dla "get") |
| created_at | timestamptz | NOT NULL | default now() |

- **PK:** id
- **Unique:** `irregular_verbs_base_norm_unique` na `(base_norm)`
- **Indeks:** `idx_irregular_verbs_base_norm` na `(base_norm)`
- **CHECK:** brak
- **RLS:** włączone
  - SELECT: wszyscy authenticated
  - INSERT/UPDATE/DELETE: tylko admin

---

### 1.2 Tabela `user_irregular_verbs`

| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| student_id | uuid | NOT NULL | FK → profiles(id) ON DELETE CASCADE |
| irregular_verb_id | uuid | NOT NULL | FK → irregular_verbs(id) ON DELETE CASCADE |
| created_at | timestamptz | NOT NULL | default now() |

- **PK:** (student_id, irregular_verb_id)
- **FK:** student_id → profiles(id), irregular_verb_id → irregular_verbs(id)
- **Indeksy:** `idx_user_irregular_verbs_student`, `idx_user_irregular_verbs_verb`
- **CHECK:** brak
- **RLS:** włączone
  - SELECT: student widzi własne, admin widzi wszystko
  - INSERT/DELETE: student własne, admin wszystko
  - UPDATE: brak (tabela de facto immutable poza insert/delete)

---

### 1.3 Tabela `irregular_verb_runs`

| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK, default gen_random_uuid() |
| student_id | uuid | NOT NULL | FK → profiles(id) ON DELETE CASCADE |
| irregular_verb_id | uuid | NOT NULL | FK → irregular_verbs(id) ON DELETE CASCADE |
| entered_past_simple | text | NULL | odpowiedź użytkownika (Past Simple) |
| entered_past_participle | text | NULL | odpowiedź użytkownika (Past Participle) |
| correct | boolean | NOT NULL | true gdy obie odpowiedzi poprawne |
| session_id | uuid | NULL | dodane w migracji 20260128 (XP/badges) |
| created_at | timestamptz | NOT NULL | default now() |

- **PK:** id
- **FK:** student_id → profiles(id), irregular_verb_id → irregular_verbs(id)
- **Indeksy:** `idx_irregular_verb_runs_student`, `idx_irregular_verb_runs_verb`, `idx_irregular_verb_runs_created`
- **CHECK:** brak
- **RLS:** włączone
  - SELECT: student własne, admin wszystko
  - INSERT: student własne, admin
  - UPDATE/DELETE: brak policies

---

### 1.4 Tabela `exercise_session_completions` (dla irregular)

| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK |
| student_id | uuid | NOT NULL | FK → profiles(id) |
| session_id | uuid | NOT NULL | |
| exercise_type | text | NOT NULL | 'pack' \| 'cluster' \| 'irregular' \| 'grammar_practice' |
| context_id | uuid | NULL | **dla irregular: zawsze NULL** |
| context_slug | text | NULL | **dla irregular: zawsze NULL** |
| completed_at | timestamptz | NOT NULL | default now() |

- **Unique:** (student_id, exercise_type, session_id)
- **Indeksy:** idx_exercise_session_completions_student, idx_exercise_session_completions_type
- **CHECK:** exercise_type in ('pack', 'cluster', 'irregular', 'grammar_practice')
- **RLS:** SELECT tylko dla auth.uid() = student_id

**Potwierdzenie:** dla irregular `context_id` i `context_slug` są zapisywane jako `null`.

---

### 1.5 Inne powiązane tabele

- **profiles** – student_id w user_irregular_verbs i irregular_verb_runs
- **user_xp** – aktualizowane przez awardXpAndBadges w complete
- **xp_events** – wpisy w complete (source: "irregular")
- **user_badges** – ewentualne odznaki za irregular
- **user_streaks** – updateStreak po complete

---

## 2. Flow użytkownika

### 2.1 Wejście na `/app/irregular-verbs/train`

1. **Przed wejściem:** użytkownik musi mieć min. 5 przypiętych czasowników (`user_irregular_verbs`).
2. **Strona listy** `/app/irregular-verbs`: użytkownik przypina/odpinuje czasowniki (toggle → `/api/irregular-verbs/pin`).
3. **Przycisk "Start testu"** → router.push(`/app/irregular-verbs/train`).
4. **Train page** (`page.tsx`):
   - Pobiera `user_irregular_verbs` (pinned_ids).
   - Jeśli brak pinned → zwraca `TrainClient` z błędem.
   - Jeśli są pinned → wybiera **losowy** `selectedVerbId = pinnedIds[Math.floor(Math.random() * pinnedIds.length)]`.
   - Pobiera dane czasownika z `irregular_verbs`.
   - Renderuje `TrainClient` z `initialVerb`.

### 2.2 Ładowanie danych

- **SSR:** pierwszy czasownik z `irregular_verbs` (losowy z pinned).
- **Client:** `loadNextVerb()` → POST `/api/irregular-verbs/next` z `exclude_ids`.

### 2.3 Wybór pytań

- **Źródło:** tylko czasowniki z `user_irregular_verbs` (pinned).
- **Algorytm:** `availableIds = pinned.filter(id => !excludeIds.includes(id))`.
- **Wybór:** `randomIndex = Math.floor(Math.random() * availableIds.length)`.
- **Shuffle:** tak – każdy następny czasownik jest losowy z pozostałych.
- **Limit:** brak stałego limitu. Sesja trwa do wyczerpania wszystkich pinned.
- **Kierunek:** zawsze base → past_simple + past_participle (brak en-pl / pl-en / mix).
- **Determinizm:** **NIE**. Wybór jest losowy przy każdym wywołaniu `/next` i przy SSR.

### 2.4 Moment zakończenia sesji

Sesja kończy się gdy:
- `loadNextVerb` zwraca 400: "All pinned verbs have been excluded"
- Client ustawia `setSessionComplete(true)` i `setCurrentVerb(null)`.

Czyli: sesja kończy się po przejściu **wszystkich** przypiętych czasowników (każdy maks. raz na sesję).

---

## 3. Zapis odpowiedzi

### 3.1 Kiedy zapis

- **Per pytanie:** tak. Każde wywołanie `handleSubmit` → POST `/api/irregular-verbs/submit`.
- **Przy zakończeniu:** osobno – complete jest wywoływany po `sessionComplete`, ale zapis runów jest przy każdym submit.

### 3.2 Jakie dane są zapisywane

W `irregular_verb_runs`:
- student_id
- irregular_verb_id
- entered_past_simple
- entered_past_participle
- correct (boolean – obie odpowiedzi poprawne)
- session_id
- created_at

### 3.3 Poprawność per pytanie

- Tak: `correct` = true gdy past_simple i past_participle poprawne.
- Brak osobnych pól na past_simple_correct / past_participle_correct w DB – te flagi są tylko w odpowiedzi API.

### 3.4 Czas

- `created_at` – zapisywany przy każdym insert do `irregular_verb_runs`.
- Brak osobnego pola na czas odpowiedzi (np. response_time_ms).

### 3.5 Kierunek

- Brak – irregular ma tylko jeden kierunek (base → past_simple, past_participle).
- Brak kolumny `direction` w `irregular_verb_runs`.

---

## 4. Complete route (`app/api/irregular-verbs/complete/route.ts`)

### 4.1 Liczenie correct / wrong

- `totalCount` – COUNT z `irregular_verb_runs` WHERE student_id, session_id.
- `wrongCount` – COUNT z `irregular_verb_runs` WHERE student_id, session_id, correct = false.
- `correctCount = totalCount - wrongCount` (Math.max(0, ...)).

### 4.2 Procenty

- Procenty nie są zapisywane w DB.
- `accuracy` jest obliczane w `getSessionSummary`: `correct / total` (0–1).
- W odpowiedzi complete zwracane jest `summary` z `getSessionSummary` (total, correct, wrong, accuracy).

### 4.3 Accuracy

- Nie zapisywane w `exercise_session_completions`.
- Obliczane na bieżąco w `getSessionSummary` z `irregular_verb_runs`.

### 4.4 Zapis do `exercise_session_completions`

```ts
await supabase.from("exercise_session_completions").upsert({
  student_id: userId,
  session_id: body.session_id,
  exercise_type: "irregular",
  context_id: null,
  context_slug: null,
}, { onConflict: "student_id,exercise_type,session_id" });
```

- **context_id:** null (potwierdzone).
- **context_slug:** null.

### 4.5 Przepływ complete

1. Walidacja session_id.
2. Pobranie totalCount i wrongCount z `irregular_verb_runs`.
3. `sessionHasToLearn` – sprawdza czy w sesji były błędy (dla repeatQualified w XP).
4. `awardXpAndBadges` – source: "irregular", sourceSlug: null, dedupeKey: "irregular:default".
5. `updateStreak`.
6. Upsert do `exercise_session_completions`.
7. `getSessionSummary` – zwraca total, correct, wrong, accuracy, wrong_items.

---

## 5. Historia użytkownika

### 5.1 Agregacja wyników

- Brak dedykowanej agregacji per użytkownik (np. widok typu "ostatnie 30 dni").
- Dane pochodzą z surowych `irregular_verb_runs` i `exercise_session_completions`.

### 5.2 Statystyka per `irregular_verb_id`

- Brak widoku/materialized view per verb.
- Można agregować ręcznie z `irregular_verb_runs` (GROUP BY irregular_verb_id).

### 5.3 Powiązanie z `user_vocab_items`

- **Brak.** Irregular verbs nie używają `user_vocab_items`.
- `user_vocab_items` odnosi się do `lexicon_senses` (słownictwo).
- Irregular ma własną strukturę: `user_irregular_verbs` (pinned) + `irregular_verb_runs` (logi).

### 5.4 Widok typu repeat_suggestions

- Brak odpowiednika `v2_vocab_repeat_suggestions` dla irregular.
- Suggestion route (`/api/app/suggestion`) może zwrócić irregular jako fallback:
  - gdy `toLearnSet` jest pusty → sprawdza `lastEvent` z `vocab_answer_events`;
  - jeśli brak → sprawdza `irregular_verb_runs` (ostatni run);
  - jeśli był irregular run → sugeruje `/app/irregular-verbs/train`.
- Irregular nie jest uwzględniany w logice "typowe błędy" opartej na `vocab_answer_events` (pack/cluster).

---

## 6. Tabela porównawcza: Packs vs Clusters vs Irregular

| Element | Packs | Clusters | Irregular |
|---------|-------|----------|-----------|
| **Tabela jednostek** | vocab_packs, vocab_pack_items | vocab_clusters, vocab_cluster_entries | irregular_verbs |
| **User–unit link** | brak (pack = zestaw) | user_unlocked_vocab_clusters | user_irregular_verbs (pinned) |
| **Tabela odpowiedzi** | vocab_answer_events | vocab_answer_events | irregular_verb_runs |
| **context_type** | vocab_pack | vocab_cluster | brak (osobna tabela) |
| **Kierunek** | en-pl / pl-en / mix | cluster-choice (brak direction) | brak (zawsze base→forms) |
| **Limit pytań** | 5 / 10 / all | limit (np. 10) | wszystkie pinned (bez limitu) |
| **Shuffle** | tak | tak | tak (losowy wybór) |
| **Zapis per odpowiedź** | vocab_answer_events | vocab_answer_events | irregular_verb_runs |
| **exercise_session_completions** | tak, context_id=pack.id | tak, context_id=cluster.id | tak, **context_id=null** |
| **updateLearningUnitKnowledge** | tak (answer, per sense) | tak (answer, per cluster) | **nie** |
| **user_vocab_items** | tak (sense_id) | nie bezpośrednio | **nie** |
| **v2_vocab_to_learn** | tak | tak | **nie** |
| **repeat_suggestions** | tak (vocab) | tak (vocab) | **nie** (tylko fallback) |
| **XP dedupe** | pack:slug:direction:count_mode | cluster:slug | irregular:default |
| **session_id** | w answer events | w answer events | w irregular_verb_runs |

---

## 7. Integracje

### 7.1 XP

- `awardXpAndBadges` w complete.
- source: "irregular", sourceSlug: null.
- dedupeKey: "irregular:default" (jeden klucz dla całego modułu).
- eligibleForAward: totalCount >= 5.
- repeatQualified: hasToLearn (czy w sesji były błędy).

### 7.2 Streak

- `updateStreak(supabase, userId)` po complete.

### 7.3 Completions (exercise_session_completions)

- Upsert przy complete.
- Używane w onboarding-status (czy użytkownik wykonał irregular).

### 7.4 Lessons / assignments

- TrainClient wywołuje `/api/lessons/assignments/${assignmentId}/complete` po award, jeśli `assignmentId` w query.
- Body: session_id, exercise_type: "irregular", context_slug: null.

### 7.5 Suggestion

- Irregular jako fallback gdy brak vocab_answer_events.
- Sprawdza ostatni `irregular_verb_runs` i sugeruje `/app/irregular-verbs/train`.

---

## 8. Problemy architektoniczne

### 8.1 Niespójności

1. **Osobna tabela odpowiedzi:** Packs i clusters używają `vocab_answer_events`; irregular ma `irregular_verb_runs`. Różna struktura, brak wspólnego modelu.
2. **Brak context_id:** W `exercise_session_completions` irregular ma context_id=null, podczas gdy pack/cluster mają konkretne ID. Uniemożliwia filtrowanie po "kontekście" irregular (np. gdyby w przyszłości były podgrupy).
3. **wrong_items w getSessionSummary:** Dla irregular mapuje `entered_past_simple` → prompt, `entered_past_participle` → expected. To są odpowiedzi użytkownika, nie pytanie/oczekiwana. Semantyka odmienna od pack/cluster.

### 8.2 Brakujące powiązania

1. **updateLearningUnitKnowledge:** Irregular **nie** wywołuje `updateLearningUnitKnowledge`. Packs (answer) i clusters (questions) tak. Migracja `20260220_recompute_knowledge_state_by_unit_type.sql` przewiduje unit_type='irregular', ale żaden kod nie wstawia/aktualizuje wierszy dla irregular.
2. **user_learning_unit_knowledge:** Brak integracji. Tabela jest aktualizowana przez migrację dla istniejących wierszy (sense, cluster), ale irregular nie tworzy wierszy w runtime.
3. **v2_vocab_to_learn / repeat_suggestions:** Irregular nie uczestniczy w systemie "do nauki" opartym na vocab. Ma własną logikę pinned.

### 8.3 Brak determinizmu

1. **SSR:** `pinnedIds[Math.floor(Math.random() * pinnedIds.length)]` – losowy pierwszy czasownik przy każdym renderze.
2. **/next:** `Math.floor(Math.random() * availableIds.length)` – losowy przy każdym żądaniu.
3. Brak seeda, brak możliwości odtworzenia tej samej sekwencji pytań.

### 8.4 Różnice względem reszty systemu

1. **Brak vocab_answer_events:** Wszystkie dane w `irregular_verb_runs`. Suggestion i inne widoki oparte na `vocab_answer_events` nie widzą irregular.
2. **Brak user_vocab_items:** Pula użytkownika to `user_irregular_verbs`, nie `user_vocab_items`.
3. **Jeden dedupeKey:** "irregular:default" – brak rozróżnienia sesji po kontekście (w przeciwieństwie do pack:slug:direction:count_mode).
4. **Limit sesji:** Brak opcji 5/10/all – zawsze wszystkie pinned. Inaczej niż packs.
5. **Kierunek:** Zawsze base → forms. Brak en-pl / pl-en / mix jak w packs.

---

## 9. Możliwe konflikty z knowledge engine

1. **Brak wpisów w user_learning_unit_knowledge:** Knowledge engine zakłada unit_type='irregular' w migracji, ale irregular nie wywołuje `updateLearningUnitKnowledge`. Integracja wymagałaby wywołania w complete (mode: "session") z unit_id np. "irregular:default" lub per irregular_verb_id.
2. **Różny model jednostki:** Dla sense – jednostka = sense_id. Dla cluster – slug. Dla irregular – brak jasnej jednostki (cały moduł vs pojedynczy verb).
3. **Agregacja:** Migracja knowledge zakłada session/accuracy model dla irregular, ale dane musiałyby być agregowane z `irregular_verb_runs` – albo per verb (unit_id = irregular_verb_id), albo globalnie (unit_id = "irregular:default").

---

*Koniec audytu.*
