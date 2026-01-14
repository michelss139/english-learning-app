# Implementacja testu słówek EN↔PL

## Przegląd zmian

Zrefaktoryzowano moduł testu słówek, aby obsługiwał:
- **Mixed mode**: losowe pytania EN→PL i PL→EN (deterministycznie przypisane per item)
- **Event logging**: każda odpowiedź jest logowana do `vocab_answer_events`
- **Różne źródła**: pool (moja pula), lesson (lekcje), ids (legacy)
- **Auto-unselect**: zaznaczenia czyszczą się automatycznie po starcie testu

## Query params dla testu

### Format URL:
```
/app/vocab/test?source={source}&selectedIds={ids}&lessonId={id}
```

### Parametry:

1. **source** (wymagany):
   - `pool` - słówka z "Moja pula" (zaznaczone checkboxy)
   - `lesson` - słówka z lekcji (zaznaczone checkboxy)
   - `ids` - legacy format (ale używa tego samego parametru `selectedIds`)

2. **selectedIds** (wymagany, canonical parameter dla wszystkich źródeł):
   - Lista user_vocab_item_ids oddzielonych przecinkami
   - Przykład: `selectedIds=uuid1,uuid2,uuid3`
   - **Uwaga**: Dla backward compatibility, `ids` w URL jest również akceptowane i mapowane na `selectedIds`

3. **lessonId** (wymagany dla source=lesson):
   - UUID lekcji
   - Przykład: `lessonId=123e4567-e89b-12d3-a456-426614174000`

### Przykłady URL:

```
# Z puli (zaznaczone słówka)
/app/vocab/test?source=pool&selectedIds=uuid1,uuid2,uuid3

# Z lekcji (zaznaczone słówka)
/app/vocab/test?source=lesson&lessonId=lesson-uuid&selectedIds=uuid1,uuid2

# Legacy (ids) - używa selectedIds dla spójności
/app/vocab/test?source=ids&selectedIds=uuid1,uuid2,uuid3
# lub backward compat:
/app/vocab/test?source=ids&ids=uuid1,uuid2,uuid3
```

## Jak działa mixed mode (en-pl/pl-en)

1. **Deterministyczne przypisanie**: Dla każdego itemu w teście, tryb pytania jest przypisywany deterministycznie na podstawie `test_run_id + item_id` (seed).
   - Jeśli hash % 2 === 0 → `en-pl` (EN → PL)
   - Jeśli hash % 2 === 1 → `pl-en` (PL → EN)

2. **Zapisywanie w eventach**: Każde sprawdzenie odpowiedzi zapisuje event z `question_mode` ('en-pl' lub 'pl-en').

3. **Weryfikacja odpowiedzi**:
   - **en-pl**: użytkownik wpisuje PL, sprawdzamy względem `translation_pl` (dopuszczamy warianty po ";")
   - **pl-en**: użytkownik wpisuje EN, sprawdzamy dokładne dopasowanie `term_en` (po normalizacji)

## Struktura danych

### TestItem (model niezależny od tabel):
```typescript
type TestItem = {
  id: string;            // user_vocab_item_id
  term_en: string;
  translation_pl: string | null;
  pos?: string | null;   // część mowy (z lexicon_entries)
}
```

### vocab_answer_events (nowa tabela):
- Loguje każdą odpowiedź niezależnie od poprawności
- Zawiera: `question_mode`, `prompt`, `expected`, `given`, `is_correct`, `evaluation`
- **evaluation**: `'correct'` | `'wrong'` | `'skipped'` | `'invalid'`
  - `correct` - poprawna odpowiedź (is_correct=true)
  - `wrong` - błędna odpowiedź (is_correct=false)
  - `skipped` - brak tłumaczenia w bazie, pytanie nie liczy się (is_correct=null)
  - `invalid` - nieprawidłowe pytanie (is_correct=null)
- **is_correct**: `true` | `false` | `null`
  - `null` dla skipped/invalid (nie liczą się w statystykach błędów)
  - `true/false` dla correct/wrong (liczą się w statystykach)
- Używane do analityki i przyszłych sugestii (filtruj `evaluation IN ('correct', 'wrong')` dla statystyk)

### vocab_test_runs (zaktualizowana):
- `mode` może być teraz 'mixed' (obok 'en-pl', 'pl-en')
- `item_ids` zawiera user_vocab_item_ids (nie zmienione)
- `id` jest używany jako `test_run_id` w eventach

## Auto-unselect zaznaczeń

Po kliknięciu "Stwórz test":
1. Zaznaczenia są czyszczone w stanie UI (`setSelected({})`)
2. Użytkownik jest przekierowywany do testu
3. Przy następnym wejściu do puli/lekcji, checkboxy są puste

## Migracje SQL

Uruchom w Supabase SQL Editor:
- `supabase/migrations/20250224_add_vocab_answer_events.sql`

Zawiera:
- Tabelę `vocab_answer_events` z indeksami
- Aktualizację constraint `vocab_test_runs.mode` (dodanie 'mixed')
- RLS policies dla eventów

## API endpoints

### POST /api/vocab/load-test-items
Ładuje test items z różnych źródeł i zwraca TestItem[].

Body:
```json
{
  "source": "pool" | "lesson" | "ids",
  "selectedIds": ["uuid1", "uuid2"],  // canonical parameter (dla wszystkich źródeł)
  "lessonId": "uuid"                  // dla lesson
}
```

**Uwaga**: `selectedIds` jest canonical parametrem dla wszystkich źródeł. `source=ids` również używa `selectedIds` (nie ma osobnego parametru `ids`).

Response:
```json
{
  "ok": true,
  "items": [
    {
      "id": "user_vocab_item_id",
      "term_en": "work",
      "translation_pl": "pracować",
      "pos": "verb"
    }
  ]
}
```

## UI zmiany

### PoolTab:
- Dodano checkboxy do każdego słówka
- Dodano przycisk "Zaznacz wszystkie" (tylko gdy >= 2 słówka)
- Dodano przycisk "Stwórz test" z licznikiem zaznaczonych
- Auto-unselect po starcie testu

### Lesson page:
- Już ma checkboxy (bez zmian)
- Zaktualizowano URL do nowego formatu (`source=lesson&lessonId=...&selectedIds=...`)
- Auto-unselect po starcie testu
- "Zaznacz wszystkie" tylko gdy >= 2 słówka

### Test page:
- Wyświetla tryb pytania (EN→PL lub PL→EN) per item
- Dynamiczny placeholder i wskazówki w zależności od trybu
- Loguje każdą odpowiedź do `vocab_answer_events`
- Zapisuje test run summary do `vocab_test_runs`

## Event logging

Każde sprawdzenie odpowiedzi zapisuje event z:
- `test_run_id` - UUID testu (generowany na start)
- `user_vocab_item_id` - ID słówka
- `question_mode` - 'en-pl' lub 'pl-en'
- `prompt` - co było pokazane (term_en lub translation_pl)
- `expected` - oczekiwana odpowiedź (null dla skipped/invalid)
- `given` - co użytkownik wpisał
- `is_correct` - `true` | `false` | `null`
  - `true` dla correct
  - `false` dla wrong
  - `null` dla skipped/invalid (nie liczą się w statystykach błędów)
- `evaluation` - `'correct'` | `'wrong'` | `'skipped'` | `'invalid'`
  - `correct` - poprawna odpowiedź
  - `wrong` - błędna odpowiedź
  - `skipped` - brak tłumaczenia w bazie (pytanie nie liczy się do wyniku)
  - `invalid` - nieprawidłowe pytanie

**Ważne dla analityki**: Eventy ze statusem `skipped` lub `invalid` mają `is_correct=null` i `expected=null`, więc **nie psują statystyk błędów**. W analizach filtruj: `WHERE evaluation IN ('correct', 'wrong')` aby liczyć tylko rzeczywiste odpowiedzi.

## Przygotowanie pod sugestie

Dane w `vocab_answer_events` pozwalają na:
- Analizę błędów per POS (część mowy)
- Sugestie słówek do treningu (na podstawie błędów)
- Statystyki per słówko

Na tym etapie: eventy są logowane, ale UI sugestii nie jest jeszcze zaimplementowane (fundamenty gotowe).
