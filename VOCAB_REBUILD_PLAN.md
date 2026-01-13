# Plan przebudowy modułu Vocabulary

## OBECNA STRUKTURA (do zastąpienia)

### Stare tabele:
- `vocab_items` - słówka użytkownika (term_en, translation_pl, is_personal)
- `student_lesson_vocab` - łączy lekcje ze słówkami
- `vocab_enrichments` - cache z zewnętrznych API (dictionaryapi.dev, freedictionaryapi)

### Nowe tabele (częściowo istniejące):
- `global_vocab_items` - systemowe słowa EN-only (term_en, term_en_norm)
- `user_vocab` - powiązanie user-global (student_id, global_vocab_item_id)

## NOWA STRUKTURA (docelowa)

### Lexicon (global cache, ukryty):
1. `lexicon_entries` - lemma + POS
2. `lexicon_senses` - znaczenia (definition_en, domain nullable)
3. `lexicon_translations` - tłumaczenia PL per sense
4. `lexicon_examples` - pula przykładów per sense (source='ai', limit 10, rotacja)
5. `lexicon_verb_forms` - odmiany czasowników (tylko jeśli pos=verb)

### User vocab pool:
6. `user_vocab_items` - pula użytkownika (user_id, sense_id, notes, status, source, verified, custom_lemma, custom_translation_pl)

### Lessons (tylko przypinanie):
7. `lesson_vocab_items` - przypinanie słów z puli do lekcji (lesson_id, user_vocab_item_id)

## FLOW "DODAJ SŁÓWKO"

1. UI: Użytkownik wpisuje lemma → "Szukaj / Dodaj"
2. Backend: Sprawdź `lexicon_entries` WHERE lemma = '{lemma}'
   - Jeśli istnieje → przejdź do wyboru sense
   - Jeśli nie → AI enrichment (synchroniczny)
3. AI Enrichment: OpenAI z precyzyjnym promptem → pełna lista znaczeń
4. Zapis do Lexicon: zapisz wszystkie senses, translations, examples, verb_forms
5. UI: Multi-sense selection (użytkownik wybiera jedno znaczenie)
6. Zapis do puli: `user_vocab_items` (sense_id, source='lexicon')

## CUSTOM / UNVERIFIED WORDS

Jeśli AI nie zwróci danych:
- UI: "Nie znaleziono w słowniku. Dodaj własne?"
- Zapis: `user_vocab_items` (custom_lemma, custom_translation_pl, sense_id=null, verified=false, source='custom')

## PRZYKŁADY - PULA + ROTACJA

- `lexicon_examples` przechowuje wiele przykładów per sense_id
- Przy wyświetleniu: rotacja (LRU) lub losowanie
- Przycisk "Wygeneruj zdanie AI": generuje nowy przykład → zapis do `lexicon_examples` (source='ai')
- Limit: 10 przykładów na sense → po przekroczeniu usuń najstarsze
- Unika duplikatów (hash + max 2 retry)

## MIGRACJA DANYCH

Backfill script (server-side, service role):
- Źródło: `vocab_items` + `student_lesson_vocab`
- Dla każdego (lesson_id, user_id, term_en, translation_pl):
  - Normalize lemma
  - Upsert do `user_vocab_items` (custom, verified=false)
  - Upsert do `lesson_vocab_items`
- Idempotentna, bez utraty danych, bez duplikatów

## KROKI WDROŻENIA

1. ✅ Analiza obecnej struktury + projekt nowych tabel Lexicon
2. ✅ Migracja SQL - utworzenie tabel Lexicon z RLS policies
3. ✅ Migracja SQL - utworzenie tabel user_vocab_items i lesson_vocab_items z RLS
4. ✅ API endpoint POST /api/vocab/lookup-word - lookup cache + AI enrichment pipeline (synchroniczny, OpenAI-only)
5. ❌ ~~API endpoint GET /api/vocab/add-word~~ - NIE POTRZEBNY (lookup już zwraca cache)
6. ⏳ Frontend - UI wyboru znaczenia (multi-sense selection) po AI enrichment
7. ⏳ API endpoint POST /api/vocab/add-word - zapis wybranego sense do user_vocab_items
8. ⏳ API endpoint POST /api/vocab/generate-example - generowanie nowego przykładu AI (pula, limit 10, rotacja)
9. ⏳ Migracja danych - backfill script
10. ⏳ Refaktoryzacja UI - uproszczony widok puli
11. ⏳ Refaktoryzacja UI lekcji - przypinanie słów z puli
12. ⏳ Obsługa custom/unverified words
