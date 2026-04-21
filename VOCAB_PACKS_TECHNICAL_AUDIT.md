# Audyt techniczny: vocab packs (fiszki)

**Data:** 2026-04-15  
**Zakres:** model danych, RLS, UI, API treningu, logowanie odpowiedzi, pipeline treści, znane niespójności.

**Powiązane:** `VOCAB_PACKS.md` (przewodnik SQL / import), `PROJECT_TECHNICAL_AUDIT.md` (ogólny przegląd API).

---

## 1. Werdykt

**Pakiety są w dobrym stanie architektonicznym:** sens jako jednostka (`lexicon_senses`), jawne RLS, trening przez route handlery z sesją, aktualizacja `user_learning_unit_knowledge` przy odpowiedziach. **Do pilnowania:** spójność nazewnictwa **`mixed` → `daily`** po migracji `20260226_move_mixed_to_daily_remove_mixed_tab.sql` (stary tryb w URL i w kodzie jest mapowany na `daily`).

---

## 2. Model danych

| Obiekt | Rola |
|--------|------|
| `vocab_packs` | Meta packa: `slug`, `title`, `is_published`, `order_index`, `vocab_mode`, `category`, … |
| `vocab_pack_items` | `(pack_id, sense_id, order_index)` — **unikalność** `(pack_id, sense_id)` |
| `vocab_answer_events.pack_id` | Powiązanie eventu z packiem (m.in. pod MV / analitykę) |

**`vocab_mode` (DB):** wyłącznie **`daily`** | **`precise`** (constraint po migracji `20260226_*`). Wartości **`mixed`** w bazie zostały zaktualizowane do **`daily`**.

**Źródło prawdy dla listy fiszek ucznia:** SSR na `/app/vocab/packs` (nie jest wymagany `GET /api/vocab/packs` do działania hubu).

---

## 3. RLS (Supabase)

- **SELECT** `vocab_packs` / `vocab_pack_items`: użytkownik zalogowany (`auth.uid()`).
- **INSERT/UPDATE/DELETE:** wyłącznie **`profiles.role = 'admin'`** (polityki „admin manage all”).

Trening i odpowiedzi idą przez **sesję użytkownika** (`createSupabaseRouteClient` / cookie) albo w kontekście stron — zgodne z RLS.

---

## 4. Frontend

| Ścieżka | Opis |
|---------|------|
| `/app/vocab/packs` | Lista opublikowanych packów; `aggregatePackItemCounts` liczy pozycje (paginacja po 1000 wierszy). Filtry UI: tryb **Codzienne / Precyzyjne** (`daily` / `precise`), wyszukiwarka po kategorii. |
| `/app/vocab/pack/[slug]` | Ładuje `vocab_pack_items` + sensy (lemma, PL, przykład). Wymaga **`is_published`**. Query: `direction`, `limit`, `autostart`, `mode` (`daily`/`precise`; **`mixed` w URL jest traktowane jak `daily`**). |

**`PackTrainingClient`:** start sesji `POST /api/training/pack/start`, odpowiedzi `POST /api/vocab/packs/[slug]/answer`, zakończenie `.../complete`, rekomendacje `.../recommendations`, dodawanie do puli `POST /api/vocab/add-words`.

---

## 5. API (skrót)

| Metoda | Ścieżka | Użycie |
|--------|---------|--------|
| GET | `/api/vocab/packs` | Opcjonalna lista JSON (JWT); hub **nie** musi z tego korzystać. Query `vocab_mode` — **uwaga:** filtrowanie po `mixed` jest przestarzałe (w DB nie ma `mixed`). |
| GET | `/api/vocab/packs/[slug]/items` | **Brak wywołań z frontendu** — pozycje ładowane przez SSR na stronie packa. |
| POST | `/api/training/pack/start` | Start sesji (shuffle, limit 5/10/all). |
| POST | `/api/vocab/packs/[slug]/answer` | Ocena odpowiedzi + `updateLearningUnitKnowledge` (`unit_type: sense`). |
| POST | `/api/vocab/packs/[slug]/complete` | Zakończenie sesji. |
| GET | `/api/vocab/packs/[slug]/recommendations` | Rekomendacje wewnątrz treningu. |
| POST | `/api/vocab/add-words` | Dodanie sensów do puli użytkownika z ekranu packa. |

---

## 6. Analityka / legacy

- **`mv_user_pack_accuracy`** (migracja `20260220_*`): agregacja pod kątem historycznego feedu; **`GET /api/suggestions` nie opiera się na tej MV** — patrz `KNOWLEDGE_ENGINE_AND_TRAINING_SUGGESTIONS_AUDIT.md`.

---

## 7. Pipeline treści

- `scripts/content-pipeline/build-pack.ts`, `npm run build:pack …`
- Skrypty SQL partiami: `shop_*`, `home_*`, `transport_*`, `body_*`, `contracts_*` (import leksykonu + `vocab_pack_items`).

Szczegóły poleceń SQL: **`VOCAB_PACKS.md`**.

---

## 8. Ryzyka i rekomendacje (niskie priorytety)

1. **Spójność `mixed`:** w kodzie nadal występują odniesienia do `mixed` (fallbacki, filtr w `GET /api/vocab/packs`, warunek w `PacksClient` łączący `daily` z `mixed`). Warto stopniowo zastąpić domyślne fallbacki **`daily`** i w filtrze API mapować `?vocab_mode=mixed` → **`daily`**, żeby nie sugerować istnienia starej wartości w DB.
2. **`GET /api/vocab/packs/[slug]/items`:** jeśli nigdzie nieużywane poza dokumentacją — kandydat do oznaczenia jako deprecated lub użycia w teście / narzędziu.
3. **Duże packi:** `aggregatePackItemCounts` paginuje — OK; przy bardzo dużych packach ekran `[slug]` ładuje wszystkie pozycje naraz — ewentualna przyszła optymalizacja (paginacja treningu już jest po stronie „count mode”).

---

## 9. Checklista jakości danych (operacyjnie)

- [ ] Pack opublikowany (`is_published`) i ma sensy w `vocab_pack_items`.
- [ ] Brak „pustych” sensów po imporcie (lemma, `definition_en`, preferowane PL + przykład).
- [ ] Po zmianach w leksykonie: spójność `sense_id` (RESTRICT na `vocab_pack_items` przy usuwaniu sensu — planować kolejność migracji).

---

*Koniec audytu packs.*
