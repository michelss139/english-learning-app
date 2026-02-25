# Audyt techniczny: system „Do nauczenia” i „Nauczone” na profilu

**Data:** 2026-02-20  
**Cel:** Pełne zmapowanie stanu sekcji „Do nauczenia” i „Nauczone” na profilu użytkownika. Tylko opis stanu obecnego.

---

## 1. Architektura

### 1.1 Komponenty renderujące sekcje

| Sekcja | Komponent | Plik | Server / Client |
|--------|-----------|------|------------------|
| „Nauczone dziś” | ProfilePage (inline) | `app/app/profile/page.tsx` | **Client** (`"use client"`) |
| „Do nauczenia” | ProfilePage (inline) | `app/app/profile/page.tsx` | **Client** |
| „Nauczone ogółem” | ProfilePage (inline) | `app/app/profile/page.tsx` | **Client** |
| „Do powtórki” | ProfilePage (inline) | `app/app/profile/page.tsx` | **Client** |

Wszystkie sekcje są renderowane w jednym komponencie `ProfilePage` w bloku „Twoje wyniki” (linie 388–418) oraz „Historia ćwiczeń” (linie 369–521). Brak osobnych komponentów dla learned/toLearn.

### 1.2 API endpoint

- **Endpoint:** `GET /api/vocab/progress-extended`
- **Używany przez:** ProfilePage (profil), StatusPage (`/app/status`)
- **Response shape:**
  ```ts
  {
    accuracy: { correct_today, total_today, correct_3d, total_3d, correct_7d, total_7d, correct_14d, total_14d },
    learned: { today: { term_en_norm }[], week: { term_en_norm }[], total: { term_en_norm }[] },
    toLearn: { today: { term_en_norm }[], week: { term_en_norm }[], total: { term_en_norm }[] },
    repeatSuggestions: { term_en_norm: string; last_correct_at: string }[]
  }
  ```

---

## 2. Źródła danych

### 2.1 Tabele / widoki

| Sekcja | Widok SQL (v2) | Widok legacy (fallback) |
|--------|----------------|--------------------------|
| learned.today | `v2_vocab_learned_today` | `vocab_learned_today` |
| learned.week | `v2_vocab_learned_week` | `vocab_learned_week` |
| learned.total | `v2_vocab_learned_total` | `vocab_learned_total` |
| toLearn.today | `v2_vocab_to_learn_today` | `vocab_to_learn_today` |
| toLearn.week | `v2_vocab_to_learn_week` | `vocab_to_learn_week` |
| toLearn.total | `v2_vocab_to_learn_total` | `vocab_to_learn_total` |
| repeatSuggestions | `v2_vocab_repeat_suggestions` | `vocab_repeat_suggestions` |

**Źródło bazowe:** wszystkie widoki v2 opierają się na tabeli `vocab_answer_events`.

### 2.2 Użycie poszczególnych źródeł

| Źródło | Używane? | Gdzie |
|--------|----------|-------|
| **user_vocab_items** | Tak (pośrednio) | Widoki v2: join `user_vocab_items → lexicon_senses → lexicon_entries` dla `lemma_norm`, gdy `user_vocab_item_id` jest ustawiony (eventy z packów). Dla eventów bez `user_vocab_item_id` używane jest `prompt`/`expected`. |
| **v2_vocab_to_learn_*** | Tak | progress-extended pobiera z tych widoków. |
| **repeat_suggestions** (v2_vocab_repeat_suggestions) | Tak | progress-extended → `repeatSuggestions`. |
| **user_learning_unit_knowledge** | **Nie** | Profil i progress-extended nie odczytują tej tabeli. |
| **v_lemma_diagnostics** | **Nie** | Nigdzie w aplikacji nie jest używany. |

### 2.3 Agregacja: SQL vs TS

- **Agregacja w SQL:** cała logika learned/to_learn/repeat jest w widokach SQL (CTE, `count(*) filter`, `group by`).
- **Agregacja w TS:** brak. API progress-extended zwraca surowe wyniki z widoków. ProfilePage wyświetla tylko `length` i `slice(0, 5)` dla repeatSuggestions.

---

## 3. Logika statusu

### 3.1 Definicje w widokach v2

| Status | Definicja (SQL) |
|--------|------------------|
| **„nauczone” (learned)** | `correct_count >= 3` AND `wrong_count = 0` w oknie czasowym (total: całość, today: 24h, week: 7d). Agregacja z `vocab_answer_events` per `(student_id, term_en_norm)`. |
| **„do nauczenia” (to learn)** | Słowa z `vocab_answer_events` spełniające: `wrong_count > 0` LUB `correct_count < 3`, wykluczone z `v2_vocab_learned_total`. Sortowanie: `error_rate DESC`, `last_wrong_at DESC`. |
| **„do powtórki” (repeat)** | `v2_vocab_repeat_suggestions`: `(wrong_count > 0 AND last_attempt_at >= now() - 7d)` LUB `error_rate > 0.3` LUB `last_attempt_at < now() - 14d`. |

### 3.2 Brak statusów „learning”, „review”, „mastered”

- System **nie** używa etykiet „learning”, „review”, „mastered” w logice learned/to_learn.
- W widokach v2 nie ma mapowania na te stany.

### 3.3 Kolumna status w user_vocab_items

- Kolumna `status` istnieje (komentarz w migracji: `'learning', 'review', 'mastered'`).
- **Nie jest używana** w widokach v2 ani w progress-extended.
- Learned/to_learn wynikają wyłącznie z agregacji `vocab_answer_events` (correct_count, wrong_count).

### 3.4 correct_count / wrong_count

- Tak – widoki v2 liczą `count(*) filter (where evaluation = 'correct')` i `count(*) filter (where evaluation = 'wrong')` z `vocab_answer_events`.
- Te wartości są używane do wyznaczenia learned (≥3 correct, 0 wrong) i to_learn (błędy lub <3 correct).

### 3.5 vocab_answer_events

- Tak – wszystkie widoki v2 opierają się na `vocab_answer_events`.
- Filtrowanie: `evaluation in ('correct', 'wrong')`, `question_mode in ('en-pl', 'pl-en')`.
- **cluster-choice jest wykluczony** – eventy z ćwiczeń cluster nie są brane pod uwagę w learned/to_learn.

---

## 4. Irregular verbs

### 4.1 Czy irregular verbs pojawiają się w profilu?

- **Nie.** Sekcje „Do nauczenia” i „Nauczone” na profilu użytkownika **nie** zawierają irregular verbs.

### 4.2 Podstawa

- Widoki v2 bazują na `vocab_answer_events` z `question_mode in ('en-pl', 'pl-en')`.
- Irregular verbs zapisują odpowiedzi w `irregular_verb_runs`, nie w `vocab_answer_events`.
- Brak powiązania między `irregular_verb_runs` a widokami learned/to_learn.

### 4.3 user_irregular_verbs

- Nie – profil nie używa `user_irregular_verbs` do wyświetlania learned/to_learn.

### 4.4 irregular_verb_runs

- Nie – profil nie agreguje `irregular_verb_runs` w sekcjach „Do nauczenia” / „Nauczone”.

---

## 5. Clusters

### 5.1 Czy cluster-level status jest widoczny w profilu?

- **Nie.** Eventy z cluster (`question_mode = 'cluster-choice'`) są **wykluczone** z widoków v2 (`question_mode in ('en-pl', 'pl-en')`).
- Wyniki ćwiczeń cluster nie wpływają na liczniki „Nauczone” / „Do nauczenia” na profilu.

### 5.2 Sekcja „problematyczne kontrasty”

- **Nie istnieje.** Na profilu nie ma sekcji „problematyczne kontrasty” ani żadnego widoku statusu per cluster.

---

## 6. Determinizm

### 6.1 Czy profil odświeża się automatycznie po zakończeniu sesji?

- **Nie.** ProfilePage pobiera dane raz w `useEffect` przy mount (pusta tablica zależności `[]`).
- Brak subskrypcji, WebSocket, polling ani refetch po zakończeniu sesji.

### 6.2 Czy dane są cache’owane?

- **Nie** – brak dedykowanego cache (np. SWR, React Query).

### 6.3 Czy wymagane jest przeładowanie strony?

- **Tak.** Aby zobaczyć zaktualizowane „Do nauczenia” / „Nauczone” po wykonaniu ćwiczenia, użytkownik musi przeładować stronę profilu (F5 lub ponowne wejście).

---

## 7. Luki architektoniczne

### 7.1 Czy profil korzysta z user_learning_unit_knowledge?

- **Nie.** Ani progress-extended, ani ProfilePage nie odczytują `user_learning_unit_knowledge` ani `knowledge_state`.

### 7.2 Czy profil korzysta z v_lemma_diagnostics?

- **Nie.** Widok `v_lemma_diagnostics` nie jest używany w aplikacji.

### 7.3 Miejsce na lemma-level widok

- **Obecny model:** profil operuje na `term_en_norm` (słowo), nie na `entry_id` (lemma).
- **Sekcja „Twoje wyniki”** (linie 388–418) wyświetla tylko `length` (learned.today, toLearn.total, learned.total) – brak listy słów.
- **Sekcja „Do powtórki”** pokazuje listę `term_en_norm` (max 5).
- **Sekcja „Najczęstsze błędy”** i „Ostatnie próby” pochodzą z `progress-summary` (vocab_most_wrong, vocab_last_attempts) – też term-level.
- **Potencjalne miejsce:** nowa sekcja na profilu mogłaby korzystać z `v_lemma_diagnostics` (student_id, entry_id, lemma, meaning_state, usage_state, morphology_state) dla widoku per lemma. Obecnie takiej sekcji nie ma.

---

## 8. Dodatkowe informacje

### 8.1 Strona Status (app/status)

- Używa tego samego API: `GET /api/vocab/progress-extended`.
- Wyświetla pełne listy: learned.today, learned.week, learned.total, toLearn.today, toLearn.week, toLearn.total (np. GreenBox, RedBox).
- Profil pokazuje tylko „Do nauczenia” jako liczbę (`extended?.toLearn?.total?.length`), bez listy słów.

### 8.2 progress-summary vs progress-extended

- **progress-summary:** `vocab_accuracy_window`, `vocab_exercise_runs`, `vocab_most_wrong`, `vocab_learned`, `vocab_last_attempts` – legacy widoki.
- **progress-extended:** v2_* (lub legacy vocab_*) – learned, toLearn, repeatSuggestions.
- Profil używa **obu**: `progress-summary` dla accuracy, mostWrong, lastAttempts; `progress-extended` dla learned, toLearn, repeatSuggestions.

### 8.3 term_en_norm – pochodzenie

- Dla eventów z pack (user_vocab_item_id ustawiony): `lemma_norm` z `lexicon_entries` (via user_vocab_items → lexicon_senses).
- Dla eventów bez user_vocab_item_id: `lower(trim(prompt))` (en-pl) lub `lower(trim(expected))` (pl-en).
- Cluster-choice jest wykluczony, więc nie ma wpływu na term_en_norm w learned/to_learn.

---

## 9. Podsumowanie – mapa komponentów i źródeł

| Aspekt | Wartość |
|--------|---------|
| Komponent | ProfilePage (Client) |
| API | GET /api/vocab/progress-extended |
| Źródło learned | v2_vocab_learned_today/week/total (vocab_answer_events) |
| Źródło toLearn | v2_vocab_to_learn_today/week/total (vocab_answer_events) |
| Źródło repeat | v2_vocab_repeat_suggestions (vocab_answer_events) |
| user_vocab_items | Pośrednio (join dla lemma_norm) |
| user_vocab_items.status | Nie używane |
| user_learning_unit_knowledge | Nie |
| v_lemma_diagnostics | Nie |
| irregular_verb_runs | Nie |
| user_irregular_verbs | Nie |
| Cluster events | Wykluczone (question_mode filter) |
| Auto-refresh | Nie |
| Cache | Nie |
| Wymaga przeładowania | Tak |

---

*Koniec audytu.*
