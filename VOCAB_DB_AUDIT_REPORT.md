# Audyt DB + kontrakty leksykonu i packów

**Data:** 2025-02-17  
**Cel:** Zebranie faktycznego stanu bazy i kodu dla content pipeline vocab. Bez zmian w kodzie produkcyjnym.

---

## A. DB Report (SQL-fakty)

### 1. Tabele leksykonu

#### `lexicon_entries`
| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK, default gen_random_uuid() |
| lemma | text | NOT NULL | normalized lemma (lowercase, trimmed) |
| lemma_norm | text | NOT NULL | duplikat lemma dla spójności |
| pos | text | NOT NULL | part of speech: noun, verb, adjective, adverb, etc. |
| created_at | timestamptz | NOT NULL | default now() |
| updated_at | timestamptz | NOT NULL | default now() |

- **PK:** id
- **Unique:** `lexicon_entries_lemma_norm_pos_unique` na `(lemma_norm, pos)` — lemma NIE jest unique sam w sobie; wiele wpisów na lemma (różne POS: work verb, work noun)
- **Indeksy:** idx_lexicon_entries_lemma_norm_pos, idx_lexicon_entries_pos

#### `lexicon_senses`
| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK |
| entry_id | uuid | NOT NULL | FK → lexicon_entries(id) ON DELETE CASCADE |
| definition_en | text | NOT NULL | definicja EN |
| domain | text | NULL | np. 'business', 'sports', 'academic' |
| sense_order | int | NOT NULL | default 0, kolejność w ramach entry |
| created_at | timestamptz | NOT NULL | default now() |

- **PK:** id
- **FK:** entry_id → lexicon_entries(id)
- **Unique:** `lexicon_senses_entry_order_unique` na `(entry_id, sense_order)`
- **Indeksy:** idx_lexicon_senses_entry_id, idx_lexicon_senses_domain

#### `lexicon_translations`
| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK |
| sense_id | uuid | NOT NULL | FK → lexicon_senses(id) ON DELETE CASCADE |
| translation_pl | text | NOT NULL | jedno tłumaczenie PL na sense |
| created_at | timestamptz | NOT NULL | default now() |

- **PK:** id
- **FK:** sense_id → lexicon_senses(id)
- **Unique:** `lexicon_translations_sense_unique` na `(sense_id)` — **1 tłumaczenie na sense**
- **Indeks:** idx_lexicon_translations_sense_id

#### `lexicon_examples`
| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK |
| sense_id | uuid | NOT NULL | FK → lexicon_senses(id) ON DELETE CASCADE |
| example_en | text | NOT NULL | przykład zdania EN |
| source | text | NOT NULL | default 'ai' |
| example_hash | text | NULL | hash do dedupe (opcjonalny) |
| created_at | timestamptz | NOT NULL | default now() |
| last_used_at | timestamptz | NULL | LRU rotation |

- **PK:** id
- **FK:** sense_id → lexicon_senses(id)
- **Unique:** `lexicon_examples_sense_hash_unique` na `(sense_id, example_hash)` — wiele przykładów na sense (różne example_hash lub NULL)
- **Indeksy:** idx_lexicon_examples_sense_id, idx_lexicon_examples_last_used, idx_lexicon_examples_created_at
- **Migracja 20260129:** dodano kolumnę `example_pl` (text, nullable)

#### `lexicon_verb_forms`
| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK |
| entry_id | uuid | NOT NULL | FK → lexicon_entries(id) |
| present_simple_i, present_simple_you, present_simple_he_she_it | text | NOT NULL | |
| past_simple | text | NOT NULL | |
| past_participle | text | NOT NULL | |
| created_at | timestamptz | NOT NULL | default now() |

- **Unique:** `lexicon_verb_forms_entry_unique` na `(entry_id)` — 1 zestaw form na verb entry

---

### 2. Tabele packów

#### `vocab_packs`
| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK |
| slug | text | NOT NULL | **unique** |
| title | text | NOT NULL | |
| description | text | NULL | |
| is_published | boolean | NOT NULL | default false |
| order_index | int | NOT NULL | default 0 |
| vocab_mode | text | NOT NULL | default 'mixed', check in ('daily','mixed','precise') |
| category | text | NOT NULL | default 'general' |
| created_at | timestamptz | NOT NULL | default now() |

- **Unique:** slug
- **Indeksy:** idx_vocab_packs_is_published, idx_vocab_packs_order_index, idx_vocab_packs_mode_published

#### `vocab_pack_items`
| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK |
| pack_id | uuid | NOT NULL | FK → vocab_packs(id) ON DELETE CASCADE |
| sense_id | uuid | NOT NULL | FK → lexicon_senses(id) ON DELETE RESTRICT |
| order_index | int | NOT NULL | default 0 |
| created_at | timestamptz | NOT NULL | default now() |

- **PK:** id
- **FK:** pack_id → vocab_packs(id), sense_id → lexicon_senses(id)
- **Unique:** `vocab_pack_items_unique` na `(pack_id, sense_id)` — ten sam sense nie może być 2× w packu
- **Indeks:** idx_vocab_pack_items_pack_order na `(pack_id, order_index)`
- **order_index:** NIE ma unique per pack — wiele itemów może mieć ten sam order_index (np. 0). Kolejność: order_index ASC, created_at ASC.

---

### 3. Tabele user vocab (lexicon-based)

#### `user_vocab_items`
| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK |
| student_id | uuid | NOT NULL | FK → profiles(id) |
| sense_id | uuid | NULL | FK → lexicon_senses(id), null dla custom |
| notes | text | NULL | |
| status | text | NULL | |
| source | text | NOT NULL | 'lexicon' | 'custom' |
| verified | boolean | NOT NULL | default true |
| custom_lemma | text | NULL | gdy source='custom' |
| custom_translation_pl | text | NULL | gdy source='custom' |
| created_at, updated_at | timestamptz | NOT NULL | |

- **Check:** source in ('lexicon','custom'); (source='custom' AND sense_id IS NULL) OR (source='lexicon' AND sense_id IS NOT NULL)

#### `lesson_vocab_items`
| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK |
| student_lesson_id | uuid | NOT NULL | FK → student_lessons(id) |
| user_vocab_item_id | uuid | NOT NULL | FK → user_vocab_items(id) |
| created_at | timestamptz | NOT NULL | |

- **Unique:** `lesson_vocab_items_unique` na `(student_lesson_id, user_vocab_item_id)`

---

### 4. Tabele pool (global_vocab_items + user_vocab)

**Uwaga:** Definicje `global_vocab_items` i `user_vocab` **nie występują w plikach migracji** w repo. Używane w kodzie (add-to-pool, pool route). Schemat wywnioskowany z użycia:

#### `global_vocab_items` (używane, brak migracji w repo)
- Kolumny: id, term_en, term_en_norm (unique)
- Używane w: add-to-pool, pool route

#### `user_vocab` (używane, brak migracji w repo)
- Kolumny: student_id, global_vocab_item_id, created_at (brak id — composite key)
- Używane w: add-to-pool, pool route

#### `vocab_enrichments` (używane, brak migracji w repo)
- Kolumny (z kodu): term_en_norm (unique, onConflict), translation_pl_suggested, example_en, example_en_manual, example_en_ai, ipa, audio_url, provider_*, updated_at
- Używane w: enrich route, pool route, build-gap-test

---

### 5. vocab_answer_events (log odpowiedzi)

| Kolumna | Typ | Nullable | Uwagi |
|---------|-----|----------|-------|
| id | uuid | NOT NULL | PK |
| student_id | uuid | NOT NULL | FK → profiles(id) |
| test_run_id | uuid | NULL | |
| user_vocab_item_id | uuid | NULL | FK → user_vocab_items(id) |
| question_mode | text | NOT NULL | 'en-pl' \| 'pl-en' \| 'cluster-choice' |
| prompt | text | NOT NULL | |
| expected | text | NULL | |
| given | text | NOT NULL | |
| is_correct | boolean | NULL | |
| evaluation | text | NOT NULL | 'correct' \| 'wrong' \| 'skipped' \| 'invalid' |
| context_type | text | NULL | np. 'vocab_pack' |
| context_id | text | NULL | np. sense_id |
| pack_id | uuid | NULL | FK → vocab_packs(id) |
| session_id | uuid | NULL | |
| direction | text | NULL | |
| created_at | timestamptz | NOT NULL | default now() |

---

### 6. Inne tabele vocab

- `vocab_clusters`, `vocab_cluster_entries`, `user_unlocked_vocab_clusters` — clustery (np. make-do-take-get)
- `vocab_test_runs` — stare testy
- `v2_vocab_*` — widoki (v2_vocab_learned_total, v2_vocab_to_learn_total, v2_vocab_repeat_suggestions, itd.)

---

### 7. Constraints – podsumowanie

| Tabela | Unique constraint |
|--------|-------------------|
| lexicon_entries | (lemma_norm, pos) |
| lexicon_senses | (entry_id, sense_order) |
| lexicon_translations | (sense_id) — 1 tłumaczenie na sense |
| lexicon_examples | (sense_id, example_hash) — wiele przykładów na sense |
| lexicon_verb_forms | (entry_id) |
| vocab_packs | (slug) |
| vocab_pack_items | (pack_id, sense_id) |
| lesson_vocab_items | (student_lesson_id, user_vocab_item_id) |

---

### 8. Kardynalności (1:N)

| Relacja | Kardynalność |
|---------|--------------|
| lexicon_entries → lexicon_senses | 1:N (lemma może mieć wiele sense) |
| lexicon_senses → lexicon_translations | 1:1 (unique na sense_id) |
| lexicon_senses → lexicon_examples | 1:N (wiele przykładów na sense) |
| vocab_pack_items.sense_id → lexicon_senses.id | N:1 (TAK, wskazuje na lexicon_senses) |

---

### 9. CEFR / poziom / klasyfikacja

**Brak.** W `lexicon_entries`, `lexicon_senses` ani w powiązanych tabelach nie ma pól: difficulty, level, CEFR, frequency, rank, tags.

---

### 10. Dedupe / antyduplikacja

| Mechanizm | Gdzie | Klucz |
|-----------|-------|-------|
| lexicon_entries | (lemma_norm, pos) unique | jeden wpis na lemma+POS |
| lexicon_senses | (entry_id, sense_order) unique | unikalne sense_order w entry |
| lexicon_translations | (sense_id) unique | 1 tłumaczenie na sense |
| lexicon_examples | (sense_id, example_hash) unique | dedupe identycznych przykładów (gdy hash podany) |
| vocab_pack_items | (pack_id, sense_id) unique | ten sam sense raz w packu |
| vocab_enrichments | term_en_norm unique (onConflict) | 1 wpis na znormalizowany term |
| global_vocab_items | term_en_norm unique (z użycia) | 1 wpis na term |

- **content_hash:** brak
- **normalized_lemma:** lemma_norm w lexicon_entries
- **slug:** vocab_packs.slug (unique)

---

## B. Code Pointers

### Query budujące items do packa

| Plik | Opis |
|------|------|
| `app/app/vocab/pack/[slug]/page.tsx` | SSR: select vocab_pack_items + lexicon_senses(definition_en, lexicon_entries(lemma), lexicon_translations, lexicon_examples). Mapowanie do PackItemDto. |
| `app/api/vocab/packs/[slug]/items/route.ts` | API GET: ten sam select, zwraca JSON z items. |

### pickTranslationPl / pickExampleEn

| Plik | Funkcja | Logika |
|------|---------|--------|
| `app/app/vocab/pack/[slug]/page.tsx` | pickTranslationPl, pickExampleEn | embed: array → embed[0]?.translation_pl / example_en; object → embed.translation_pl / example_en |
| `app/api/vocab/packs/[slug]/items/route.ts` | pickTranslationPl, pickExampleEn | Identyczna logika (duplikacja) |
| `app/api/vocab/lookup-word/route.ts` | pickTranslationPl, pickExampleEn | Identyczna logika |

### Enrichment + cache

| Plik | Opis |
|------|------|
| `app/api/vocab/enrich/route.ts` | POST: pobiera z dictionaryapi.dev + freedictionaryapi, upsert do `vocab_enrichments` po `term_en_norm`. Cache w DB (tabela vocab_enrichments). Key: term_en_norm. Pola: term_en_norm, translation_pl_suggested, example_en, ipa, audio_url, provider_*. |
| `app/api/vocab/lookup-word/route.ts` | Lookup w Lexicon (lexicon_entries) + AI enrichment (OpenAI) gdy brak. Zapis do lexicon_entries/senses/translations/examples. Cache = Lexicon (DB). |
| `app/api/vocab/clear-cache/route.ts` | Usuwa wpisy z lexicon_entries (i cascade senses/translations/examples/verb_forms) po lemma. Nie dotyka vocab_enrichments. |
| `app/api/vocab/pool/route.ts` | Pobiera vocab_enrichments po term_en_norm (batch). Używa jako cache tłumaczeń/przykładów dla pool. |
| `app/api/vocab/build-gap-test/route.ts` | Pobiera example z vocab_enrichments (example_en_manual, example_en_ai, example_en) po term_en_norm. |

**AI enrichment cache – podsumowanie:**
- **Lexicon (lexicon_entries, lexicon_senses, …):** cache AI lookup-word. Klucz: (lemma_norm, pos). Zapis: pełna struktura entry→senses→translations→examples.
- **vocab_enrichments:** cache zewnętrznych API (dictionaryapi.dev, freedictionaryapi). Klucz: term_en_norm. Pola: translation_pl_suggested, example_en, ipa, audio_url, provider_*.

---

### Kontrakt PackItemDto – UI treningu packów

**Typ (PackTrainingClient.tsx, page.tsx, items route):**
```ts
type PackItemDto = {
  id: string;
  sense_id: string;
  lemma: string | null;
  translation_pl: string | null;
  example_en: string | null;
  definition_en: string | null;
  order_index: number;
};
```

**Źródło:** `vocab_pack_items` + join `lexicon_senses` → `lexicon_entries(lemma)`, `lexicon_translations(translation_pl)`, `lexicon_examples(example_en)`.

**Pola krytyczne do działania UI:**

| Pole | Krytyczne? | Co się psuje przy null |
|------|------------|------------------------|
| id | Tak | Klucz React, nawigacja |
| sense_id | Tak | Klucz answers, walidacja w API answer, recommendations |
| lemma | Tak (en-pl) | Pytanie w trybie en-pl: pokazuje "—". W pl-en: expected = lemma — brak odpowiedzi do sprawdzenia. |
| translation_pl | Tak (pl-en) | Pytanie w trybie pl-en: pokazuje "—". W en-pl: expected = translation_pl — brak odpowiedzi do sprawdzenia. |
| example_en | Nie | Tylko po sprawdzeniu (feedback). Null = brak przykładu. |
| definition_en | Nie | Tylko po sprawdzeniu (feedback). Null = brak definicji. |
| order_index | Nie | Kolejność fiszek. Null traktowane jako 0. |

**Wniosek:** Dla poprawnego działania fiszki w obu kierunkach potrzebne są **lemma** i **translation_pl**. Gdy lemma=null lub translation_pl=null, UI pokazuje "—" i walidacja odpowiedzi może być niepełna (expected null → isCorrect zawsze false).
