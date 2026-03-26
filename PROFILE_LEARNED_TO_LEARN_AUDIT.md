# Audyt: widoki „learned / to learn / repeat” (vocab v2)

**Data oryginału:** 2026-02-20  
**Aktualizacja:** 2026-03-19 — **strona profilu nie wyświetla już** sekcji „Nauczone” / „Do nauczenia” z `progress-extended`; dane te nadal są dostępne przez API i **stronę Status**.

**Cel:** Opis logiki SQL (widoki v2) oraz tego, gdzie w UI pojawiają się dane z `GET /api/vocab/progress-extended`.

---

## 1. Gdzie w UI? (2026-03)

| Miejsce | Używa `progress-extended`? | Uwagi |
|---------|----------------------------|--------|
| **`/app/status`** (`app/app/status/page.tsx`) | **Tak** | Pełniejszy podgląd learned / toLearn / repeat (zgodnie z implementacją strony) |
| **`/app/profile`** | **Nie** | Profil pokazuje m.in. XP, streak, odznaki, **`GET /api/suggestions`** („Twój plan na teraz”). Sekcje learned/toLearn z audytu 2026-02 **usunięte lub nigdy nie zmergowane** w obecnym `profile/page.tsx`. |

**Endpoint:** `GET /api/vocab/progress-extended` — bez zmian w roli; shape odpowiedzi jak w poprzedniej wersji audytu (accuracy, learned, toLearn, repeatSuggestions).

---

## 2. Źródła danych (bez zmian merytorycznych)

### 2.1 Tabele / widoki

| Sekcja | Widok SQL (v2) | Widok legacy (fallback) |
|--------|----------------|--------------------------|
| learned.* | `v2_vocab_learned_*` | `vocab_learned_*` |
| toLearn.* | `v2_vocab_to_learn_*` | `vocab_to_learn_*` |
| repeatSuggestions | `v2_vocab_repeat_suggestions` | `vocab_repeat_suggestions` |

**Źródło bazowe:** `vocab_answer_events` (z filtrami `question_mode` — **cluster-choice wykluczony** z learned/to_learn).

### 2.2 Irregular

- **Nie** wchodzą do widoków learned/to_learn (odpowiedzi w `irregular_verb_runs`, nie w `vocab_answer_events` w tym modelu).

### 2.3 user_learning_unit_knowledge

- **Nie** jest czytana przez `progress-extended` (inna ścieżka: sugestie treningowe → `/api/suggestions`).

---

## 3. Definicje (skrót)

| Status | Idea |
|--------|------|
| **learned** | m.in. ≥3 poprawnych z rzędu, 0 wrong w regułach widoku |
| **to learn** | błędy lub &lt;3 poprawnych, wykluczenia względem learned |
| **repeat** | reguły w `v2_vocab_repeat_suggestions` (okna czasowe, error_rate) |

Szczegóły SQL: migracje i definicje widoków w `supabase/migrations/`.

---

## 4. progress-summary vs progress-extended

- **progress-summary** — osobny endpoint (`GET /api/vocab/progress-summary`), inne widoki (accuracy, most wrong, last attempts).
- **progress-extended** — learned, toLearn, repeatSuggestions z v2.

Sprawdź, które z nich woła aktualna strona Status (może jedno lub oba).

---

## 5. Podsumowanie

| Aspekt | Stan 2026-03 |
|--------|----------------|
| API `progress-extended` | Nadal istotne dla **Status** i ewentualnych innych konsumentów |
| Profil + learned/toLearn | **Nie** w obecnym `ProfilePage` |
| Widoki v2 | Nadal opisowe dla backendu |

---

*Szczegóły historyczne (linie kodu profilu, sekcje „Twoje wyniki”) — nieaktualne; zachowano tylko treść merytoryczną o widokach.*

*Koniec audytu.*
