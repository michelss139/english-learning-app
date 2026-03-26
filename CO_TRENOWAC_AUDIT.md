# Audyt: „Co trenować” i sugestie treningowe (stan aktualny)

**Data:** 2026-03-19  
**Cel:** Opis **jednego** systemu sugestii opartego na `GET /api/suggestions` (wcześniej rozdzielone: statyczny widget vs `intelligent-suggestions-v2` na profilu).

---

## 1. Endpoint: `GET /api/suggestions`

**Plik:** `app/api/suggestions/route.ts`

- **Auth:** Supabase `getUser()` (sesja cookie / Bearer w zależności od klienta).
- **Odpowiedź:** `{ top: Suggestion[], list: Suggestion[] }` — max 2 pozycje w `top`, max 5 w `list`.
- **Źródła danych:**
  - `user_learning_unit_knowledge` — grammar, cluster, sense (min. próby, `knowledge_state`, `last_wrong_at`, `wrong_count`).
  - `irregular_verb_runs` — per forma (past simple / past participle), słabe formy wg progu accuracy.
- **Scoring (priorytet):** kombinacja `(1 - accuracy)`, `wrong_count`, bonus stanu (`unstable` / `improving`), bonus recencji ostatniego błędu. Szczegóły w kodzie route.

**Usunięte:** `GET /api/app/recommendations` (scalenie w `/api/suggestions`).

**Legacy (backend nadal w repo, UI nie wywołuje):** `GET /api/app/intelligent-suggestions-v2` — pakiety/clustery z MV; zob. `INTELLIGENT_SUGGESTIONS_V2_AUDIT.md` (wersja archiwalna).

---

## 2. GlobalTrainingSuggestion („Co trenować”)

**Plik:** `app/app/GlobalTrainingSuggestion.tsx`  
**Layout:** `app/app/layout.tsx` (prawy dolny róg, wszystkie strony `/app/*`).

| Zachowanie | Opis |
|------------|------|
| Dane | `GET /api/suggestions` → `top` + `list` (do bundlingu irregular). |
| Fallback | Gdy brak `top`, statyczne 3 opcje (Fiszki, Typowe błędy, Irregular min 5). |
| Irregular | Jedna karta z listą form + jeden URL `mode=targeted&targets=...` (max 5). |
| Sesja | `activeSessionHref` + **`lockedOptions`** (snapshot przy kliknięciu Start) — brak migotania podczas treningu. |
| Po treningu | `subscribeTrainingCompleted` → `setActiveSessionHref(null)`, `setLockedOptions(null)`, `fetchSuggestions(true)`. |

---

## 3. Profil — „Twój plan na teraz”

**Plik:** `app/app/profile/page.tsx`

- Fetch: `GET /api/suggestions` (z nagłówkiem Bearer w `Promise.all`).
- Wyświetlanie: karty z `buildDisplayCards(top, list)` — irregular zgrupowane, link zbiorczy.
- **Bez** optimistic update po pack/cluster jak w starym `intelligent-suggestions-v2` — po evencie zwykły refetch `/api/suggestions`.

---

## 4. SuggestionsPanel (komponent)

**Plik:** `components/SuggestionsPanel.tsx`

- Używa `list` z `/api/suggestions`; irregular jako jeden wiersz z tym samym `href` co bundel.
- **Uwaga:** na 2026-03 komponent może nie być importowany na żadnej stronie — sprawdź przed poleganiem na nim w nawigacji.

---

## 5. Inne endpointy (nie mylić z `/api/suggestions`)

| Endpoint | Zakres |
|----------|--------|
| `GET /api/vocab/suggestions` | Sugestie słówek z historii błędów (vocab) — inna logika. |
| `GET /api/app/suggestion` | Pojedyncza sugestia — **nie** używana przez obecny UI profilu/widgetu. |
| `GET /api/vocab/packs/[slug]/recommendations` | Rekomendacje **w obrębie packu** (PackTrainingClient). |

---

## 6. Eventy treningu

**Plik:** `lib/events/trainingEvents.ts`

- `emitTrainingCompleted` — pack, cluster, irregular, grammar (wg implementacji).
- Subskrybenci m.in.: `ProfilePage`, `GlobalTrainingSuggestion` (odświeżenie sugestii po zakończeniu sesji).

---

## 7. Historia dokumentu

- Wersja 2026-03-06 opisywała dwa systemy i statyczny widget — **nieaktualna**.
- Pełny opis techniczny projektu: `PROJECT_TECHNICAL_AUDIT.md`.

---

*Koniec audytu.*
