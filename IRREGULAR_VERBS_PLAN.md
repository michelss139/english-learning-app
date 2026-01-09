# Plan wdrożenia modułu "Irregular Verbs"

## DATASET
**Źródło:** Lista najpopularniejszych czasowników nieregularnych (około 100-120 najczęściej używanych)
**Licencja:** Public domain / Educational use (standardowa lista edukacyjna)
**Format:** JSON w repo (`data/irregular-verbs.json`)
**Aktualizacja:** Ręczna edycja pliku JSON w razie potrzeby

---

## PLAN WDROŻENIA (5-8 kroków)

### KROK 1: Migracja SQL + Seed danych
**Cel:** Utworzenie tabel w Supabase i wypełnienie danymi

**Pliki:**
- `supabase/migrations/202501XX_add_irregular_verbs.sql` - migracja + RLS
- `data/irregular-verbs.json` - dataset czasowników
- `scripts/seed-irregular-verbs.ts` - skrypt seedujący (opcjonalnie, można też przez SQL)

**Komendy:**
- Wykonanie migracji w Supabase SQL Editor
- Seed danych (SQL INSERT lub skrypt Node)

**Testy:**
- Sprawdzenie czy tabele istnieją
- Sprawdzenie czy dane są w `irregular_verbs`
- Sprawdzenie RLS (student nie może insertować do `irregular_verbs`)

---

### KROK 2: API endpoints - lista i toggle pin
**Cel:** Endpointy do pobierania listy i przypinania/odpinania

**Pliki:**
- `lib/api/auth.ts` - wspólna funkcja weryfikacji JWT (jeśli nie istnieje)
- `app/api/irregular-verbs/list/route.ts` - GET lista z info o pinned
- `app/api/irregular-verbs/toggle/route.ts` - POST pin/unpin

**Testy:**
- GET bez tokenu → 401
- GET z tokenem → lista czasowników
- POST toggle → pin/unpin działa
- Sprawdzenie czy pinned info jest poprawne

---

### KROK 3: API endpoints - test (next + submit)
**Cel:** Endpointy do losowania czasownika i sprawdzania odpowiedzi

**Pliki:**
- `app/api/irregular-verbs/next/route.ts` - POST losowy czasownik z pinned
- `app/api/irregular-verbs/submit/route.ts` - POST sprawdzenie + log

**Testy:**
- POST next bez pinned → błąd lub pusty
- POST next z pinned → losowy czasownik
- POST submit → sprawdzenie odpowiedzi (case-insensitive, warianty)
- Sprawdzenie czy run jest zapisany w bazie

---

### KROK 4: Strona główna - lista + przypinanie
**Cel:** UI do przeglądania i przypinania czasowników

**Pliki:**
- `app/app/irregular-verbs/page.tsx` - lista z wyszukiwarką, przyciski pin/unpin, "losowe 10", start testu

**Testy:**
- Lista się ładuje
- Wyszukiwarka działa
- Pin/unpin działa
- "Losowe 10" wybiera 10 czasowników
- Przycisk "Start testu" prowadzi do `/app/irregular-verbs/train`

---

### KROK 5: Strona treningu - test
**Cel:** UI do testowania czasowników

**Pliki:**
- `app/app/irregular-verbs/train/page.tsx` - random generator, inputy, submit, feedback

**Testy:**
- Losuje czasownik z pinned
- Inputy działają
- Submit sprawdza odpowiedź
- Feedback pokazuje wynik
- Następny czasownik po submit

---

### KROK 6: Integracja nawigacji
**Cel:** Dodanie linków do modułu w panelu ucznia

**Pliki:**
- `app/app/page.tsx` - dodanie linku do irregular verbs
- `app/app/vocab/page.tsx` - opcjonalnie link (jeśli pasuje)

**Testy:**
- Link widoczny w panelu ucznia
- Link prowadzi do `/app/irregular-verbs`
- Styl pasuje do reszty

---

### KROK 7: Testy i poprawki
**Cel:** Finalne testy, poprawki błędów, optymalizacje

**Pliki:**
- Ewentualne poprawki w istniejących plikach

**Testy:**
- Pełny flow: lista → pin → test → submit → log
- Edge cases: brak pinned, wszystkie poprawne, wszystkie błędne
- Responsywność UI
- Error handling

---

### KROK 8: Dokumentacja i commit
**Cel:** Finalizacja, dokumentacja, commit

**Pliki:**
- Ewentualne poprawki
- README update (opcjonalnie)

**Komendy:**
- Git commit
- Git push

---

## STRUKTURA TABEL

### `irregular_verbs` (globalna, systemowa)
```sql
- id (uuid, primary key)
- base (text, not null) - np. "go"
- base_norm (text, not null, unique) - np. "go" (lowercase, trimmed)
- past_simple (text, not null) - np. "went"
- past_simple_variants (text[]) - np. ["learned", "learnt"] lub null
- past_participle (text, not null) - np. "gone"
- past_participle_variants (text[]) - np. ["learned", "learnt"] lub null
- created_at (timestamptz, default now())
```

### `user_irregular_verbs` (relacja user-verb)
```sql
- student_id (uuid, references profiles(id))
- irregular_verb_id (uuid, references irregular_verbs(id))
- created_at (timestamptz, default now())
- PRIMARY KEY (student_id, irregular_verb_id)
```

### `irregular_verb_runs` (log ćwiczeń)
```sql
- id (uuid, primary key)
- student_id (uuid, references profiles(id))
- irregular_verb_id (uuid, references irregular_verbs(id))
- entered_past_simple (text)
- entered_past_participle (text)
- correct (boolean, not null)
- created_at (timestamptz, default now())
```

---

## RLS POLICIES

### `irregular_verbs`
- SELECT: wszyscy zalogowani (auth.uid() IS NOT NULL)
- INSERT/UPDATE/DELETE: tylko admin

### `user_irregular_verbs`
- SELECT: student widzi swoje (auth.uid() = student_id) + admin widzi wszystko
- INSERT: student może dodawać swoje (auth.uid() = student_id) + admin
- DELETE: student może usuwać swoje (auth.uid() = student_id) + admin

### `irregular_verb_runs`
- SELECT: student widzi swoje (auth.uid() = student_id) + admin widzi wszystko
- INSERT: student może dodawać swoje (auth.uid() = student_id) + admin

---

## ROLLBACK INSTRUKCJA

Jeśli trzeba wycofać migrację:
```sql
-- Usuń tabele (w odwrotnej kolejności zależności)
DROP TABLE IF EXISTS irregular_verb_runs CASCADE;
DROP TABLE IF EXISTS user_irregular_verbs CASCADE;
DROP TABLE IF EXISTS irregular_verbs CASCADE;
```
