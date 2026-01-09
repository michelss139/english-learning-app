# Podsumowanie implementacji modułu "Irregular Verbs" - Prompt dla AI

## KONTEKST PROJEKTU

**Platforma:** Next.js SaaS do nauki angielskiego (produkcja na Vercel)  
**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Auth + DB + RLS), Tailwind CSS  
**Styl UI:** Dark glassmorphism theme  
**Autentykacja:** JWT Bearer tokens w API routes  
**Deployment:** Auto-deploy z GitHub main branch na Vercel  
**Status paywalla:** Obecnie brak paywalla - wszystkie funkcje dostępne dla zalogowanych użytkowników

---

## CO ZOSTAŁO ZAIMPLEMENTOWANE

### 1. STRUKTURA BAZY DANYCH (Supabase)

#### Tabela: `irregular_verbs` (globalna, systemowa)
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

**RLS Policies:**
- SELECT: Wszyscy zalogowani użytkownicy (`auth.uid() is not null`)
- INSERT/UPDATE/DELETE: Tylko admin (`role = 'admin'` w profiles)

#### Tabela: `user_irregular_verbs` (relacja user-verb)
```sql
- student_id (uuid, foreign key -> profiles.id)
- irregular_verb_id (uuid, foreign key -> irregular_verbs.id)
- created_at (timestamptz, default now())
- PRIMARY KEY (student_id, irregular_verb_id)
```

**RLS Policies:**
- SELECT: Student widzi swoje, admin widzi wszystko
- INSERT: Student może dodawać swoje, admin może dodawać wszystko
- DELETE: Student może usuwać swoje, admin może usuwać wszystko

#### Tabela: `irregular_verb_runs` (logi ćwiczeń)
```sql
- id (uuid, primary key)
- student_id (uuid, foreign key -> profiles.id)
- irregular_verb_id (uuid, foreign key -> irregular_verbs.id)
- entered_past_simple (text) - odpowiedź użytkownika
- entered_past_participle (text) - odpowiedź użytkownika
- correct (boolean, not null) - czy obie odpowiedzi poprawne
- created_at (timestamptz, default now())
```

**RLS Policies:**
- SELECT: Student widzi swoje, admin widzi wszystko
- INSERT: Student może dodawać swoje, admin może dodawać wszystko

**Indeksy:**
- `idx_irregular_verbs_base_norm` na `irregular_verbs(base_norm)`
- `idx_user_irregular_verbs_student` na `user_irregular_verbs(student_id)`
- `idx_user_irregular_verbs_verb` na `user_irregular_verbs(irregular_verb_id)`
- `idx_irregular_verb_runs_student` na `irregular_verb_runs(student_id)`
- `idx_irregular_verb_runs_verb` na `irregular_verb_runs(irregular_verb_id)`
- `idx_irregular_verb_runs_created` na `irregular_verb_runs(created_at desc)`

---

### 2. MIGRACJE SQL

**Pliki w `supabase/migrations/`:**

1. **`20250122_add_irregular_verbs.sql`** (318 linii)
   - Tworzy wszystkie 3 tabele
   - Konfiguruje RLS policies
   - Seed danych: 100 najpopularniejszych czasowników nieregularnych
   - Indeksy dla wydajności

2. **`20250122_fix_irregular_verbs_rls.sql`** (172 linie)
   - Naprawia RLS policy dla `irregular_verbs` (zmiana z `for all` na osobne policies dla INSERT/UPDATE/DELETE)
   - Ponownie próbuje wstawić wszystkie 100 czasowników (na wypadek gdyby jeden nie został dodany)

3. **`20250122_check_irregular_verbs.sql`** (61 linii)
   - Zapytania diagnostyczne do weryfikacji migracji

**Status migracji:** Wykonane w Supabase (100 czasowników w bazie)

---

### 3. API ENDPOINTS (Next.js Route Handlers)

Wszystkie endpointy używają JWT Bearer token authentication i `createSupabaseAdmin()`.

#### `GET /api/irregular-verbs/list`
- **Auth:** Opcjonalna (jeśli token, pokazuje status pinned)
- **Query params:** `?search=...` (opcjonalne, filtrowanie)
- **Response:** `{ verbs: [...], total: number }`
- **Funkcjonalność:** Zwraca listę wszystkich czasowników z informacją o pinowaniu (jeśli użytkownik zalogowany)

#### `POST /api/irregular-verbs/toggle`
- **Auth:** Wymagana (JWT Bearer token)
- **Body:** `{ verb_id: "uuid" }`
- **Response:** `{ pinned: boolean, verb_id: "uuid" }`
- **Funkcjonalność:** Pinuje/odpinuje czasownik dla zalogowanego użytkownika

#### `POST /api/irregular-verbs/next`
- **Auth:** Wymagana (JWT Bearer token)
- **Body:** `{ exclude_ids: ["uuid1", "uuid2"] }` (opcjonalne)
- **Response:** `{ id, base, past_simple, past_simple_variants, past_participle, past_participle_variants }`
- **Funkcjonalność:** Zwraca losowy czasownik z przypiętych użytkownika (z wykluczeniem podanych ID)
- **Błąd 400:** Jeśli brak przypiętych czasowników

#### `POST /api/irregular-verbs/submit`
- **Auth:** Wymagana (JWT Bearer token)
- **Body:** `{ verb_id: "uuid", entered_past_simple: "...", entered_past_participle: "..." }`
- **Response:** `{ correct: boolean, past_simple_correct: boolean, past_participle_correct: boolean, correct_past_simple: string, correct_past_participle: string, entered_past_simple: string, entered_past_participle: string }`
- **Funkcjonalność:** 
  - Sprawdza odpowiedzi (case-insensitive, obsługuje warianty)
  - Loguje wynik do `irregular_verb_runs`
  - Zwraca szczegółowy feedback

**Lokalizacja:** `app/api/irregular-verbs/[endpoint]/route.ts`

---

### 4. FRONTEND (Next.js App Router, Client Components)

#### Strona główna: `/app/irregular-verbs/page.tsx`
**Funkcjonalności:**
- Lista wszystkich 100 czasowników nieregularnych
- Wyszukiwarka (filtrowanie po base, past simple, past participle)
- Przycisk "Przypnij/Odepnij" dla każdego czasownika
- Przyciski akcji:
  - "Losowe 5" - przypina 5 losowych nieprzypiętych czasowników
  - "Losowe 10" - przypina 10 losowych nieprzypiętych czasowników
  - "Przypnij wszystkie" - przypina wszystkie nieprzypięte czasowniki
  - "Odepnij wszystkie" - odpina wszystkie przypięte czasowniki
- Przycisk "Start testu (X)" - widoczny tylko gdy są przypięte czasowniki
- Licznik przypiętych czasowników
- Wyświetlanie wariantów czasowników w nawiasach
- Styl: Dark glassmorphism (spójny z resztą aplikacji)

#### Strona treningu: `/app/irregular-verbs/train/page.tsx`
**Funkcjonalności:**
- Losowanie czasownika z przypiętych (z wykluczeniem już użytych)
- Wyświetlanie base form czasownika
- Dwa inputy: Past Simple i Past Participle
- Przycisk "Sprawdź" - sprawdza odpowiedzi przez API
- Feedback dla każdego pola (zielony/czerwony)
- Statystyki: poprawne/total
- Automatyczne przejście do następnego czasownika po sprawdzeniu
- Logowanie wyników do bazy (`irregular_verb_runs`)
- Styl: Dark glassmorphism z kolorowym feedbackiem

#### Integracja nawigacji: `app/app/page.tsx`
- Dodano kafelek "Czasowniki nieregularne" w panelu ucznia
- Link prowadzi do `/app/irregular-verbs`
- Styl spójny z innymi kafelkami

---

### 5. DANE (Dataset)

**Plik:** `data/irregular-verbs.json`
- 100 najpopularniejszych czasowników nieregularnych
- Format: `{ base, past_simple, past_participle }`
- Warianty zapisane jako string z "/" (np. "learned/learnt")
- Licencja: Public domain / Educational use
- Używany jako źródło dla seed danych w migracji SQL

---

## FUNKCJONALNOŚCI MVP

✅ **Lista czasowników** - wszystkie 100 czasowników z wyszukiwarką  
✅ **Pinowanie** - użytkownik może przypinać/odpinać czasowniki do swojego zestawu testowego  
✅ **Losowy wybór** - przyciski "Losowe 5" i "Losowe 10"  
✅ **Test** - losowy generator z inputami dla past simple i past participle  
✅ **Sprawdzanie odpowiedzi** - case-insensitive, obsługa wariantów (np. "learned"/"learnt")  
✅ **Logowanie wyników** - wszystkie próby zapisywane w `irregular_verb_runs`  
✅ **Feedback** - kolorowy feedback (zielony/czerwony) dla każdego pola  
✅ **Statystyki** - licznik poprawnych/total podczas testu  
✅ **RLS** - bezpieczeństwo na poziomie bazy danych  
✅ **JWT Auth** - wszystkie API endpoints zabezpieczone  
✅ **Brak paywalla** - dostępne dla wszystkich zalogowanych użytkowników  

---

## NAPRAWIONE BŁĘDY

1. **Błąd "Cannot read properties of undefined (reading 'session')"**
   - Problem: Nieprawidłowy dostęp do sesji Supabase
   - Naprawa: Zmieniono na bezpieczny dostęp z optional chaining (`sess?.data?.session?.access_token`)

2. **RLS policy "for all" nie działała poprawnie**
   - Problem: Policy `for all` może nie działać poprawnie w Supabase
   - Naprawa: Podzielono na osobne policies dla INSERT, UPDATE, DELETE

3. **99 zamiast 100 czasowników po migracji**
   - Problem: Jeden czasownik nie został dodany (prawdopodobnie przez `on conflict do nothing`)
   - Naprawa: Migracja naprawcza ponownie próbuje wstawić wszystkie czasowniki

---

## STRUKTURA PLIKÓW

```
app/
├── api/
│   └── irregular-verbs/
│       ├── list/route.ts          # GET - lista z pinned status
│       ├── toggle/route.ts        # POST - pin/unpin
│       ├── next/route.ts          # POST - losowy czasownik
│       └── submit/route.ts        # POST - sprawdzenie + log
├── app/
│   ├── irregular-verbs/
│   │   ├── page.tsx              # Lista + pinowanie
│   │   └── train/page.tsx        # Test/trening
│   └── page.tsx                  # Panel ucznia (dodano link)

supabase/migrations/
├── 20250122_add_irregular_verbs.sql
├── 20250122_fix_irregular_verbs_rls.sql
└── 20250122_check_irregular_verbs.sql

data/
└── irregular-verbs.json          # Dataset 100 czasowników
```

---

## TECHNICZNE SZCZEGÓŁY

### Autentykacja
- Wszystkie API endpoints używają JWT Bearer token z header `Authorization: Bearer <token>`
- Token pobierany z `supabase.auth.getSession()` w frontendzie
- Weryfikacja przez `createSupabaseAdmin().auth.getUser(token)`
- Service role używany tylko w backendzie (omija RLS dla operacji systemowych)

### Bezpieczeństwo
- RLS na poziomie bazy danych
- Filtrowanie po `student_id` w API (dodatkowa warstwa)
- Student widzi tylko swoje dane
- Admin widzi wszystko (sprawdzanie `role = 'admin'` w profiles)

### Styl UI
- Dark glassmorphism: `rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl`
- Kolory: emerald (sukces), rose (błąd), sky (focus)
- Responsywność: `flex-wrap`, `sm:flex-row`
- Spójny z resztą aplikacji (`app/app/vocab/page.tsx`, `app/app/page.tsx`)

---

## STATUS PRODUKCJI

✅ **Wdrożone na produkcję** (commit `d9240c4` na main branch)  
✅ **Migracje SQL wykonane** (100 czasowników w bazie)  
✅ **Wszystkie funkcjonalności działają**  
✅ **Brak znanych błędów**  
✅ **Dostępne dla wszystkich zalogowanych użytkowników** (brak paywalla)  

---

## MOŻLIWE ROZSZERZENIA / POMYSŁY NA PRZYSZŁOŚĆ

### Krótkoterminowe:
1. **Statystyki użytkownika**
   - Strona z historią testów
   - Wykresy postępów
   - Najczęściej mylone czasowniki
   - Średnia poprawność

2. **Tryby testu**
   - Tylko past simple
   - Tylko past participle
   - Mieszany (losowo jedno lub drugie)
   - Test na czas

3. **Filtrowanie w teście**
   - Wybór zakresu czasowników (np. tylko te z błędami)
   - Grupowanie po trudności (jeśli dodamy scoring)

4. **Warianty odpowiedzi**
   - Wyświetlanie wszystkich akceptowanych wariantów w feedbacku
   - Informacja o wariantach przed testem

### Długoterminowe:
1. **Gamifikacja**
   - Poziomy trudności
   - Osiągnięcia/badges
   - Ranking użytkowników

2. **AI-powered features**
   - Personalizacja trudności na podstawie błędów
   - Sugestie powtórek (podobnie jak w vocab module)
   - Generowanie zdań z czasownikami

3. **Integracja z innymi modułami**
   - Linki do czasowników w vocab module
   - Ćwiczenia w kontekście zdań z vocab
   - Powiązanie z lekcjami

4. **Rozszerzenie danych**
   - Więcej czasowników (200, 300+)
   - Dodatkowe formy (3rd person singular, gerund)
   - Przykłady użycia dla każdego czasownika
   - Audio pronunciation

5. **Analytics dla admina**
   - Najczęściej testowane czasowniki
   - Najtrudniejsze czasowniki (najniższa poprawność)
   - Statystyki użycia modułu

---

## WAŻNE UWAGI DLA KONTYNUACJI

1. **Paywall:** Obecnie brak paywalla. Jeśli w przyszłości chcesz dodać, trzeba będzie:
   - Dodać sprawdzenie `subscription_status` w API endpoints
   - Dodać sprawdzenie w frontendzie
   - Ewentualnie zmienić RLS (ale API może blokować)

2. **RLS:** Wszystkie tabele mają RLS włączone. Student widzi tylko swoje dane, admin wszystko.

3. **Service Role:** Używany tylko w API routes (`createSupabaseAdmin()`). Nie używać w frontendzie.

4. **Styl:** Zachować spójność z dark glassmorphism theme. Kolory: emerald (sukces), rose (błąd), sky (focus).

5. **Error Handling:** Obecnie podstawowe. Można rozszerzyć o error boundaries i lepsze komunikaty.

6. **Performance:** Obecnie nie ma optymalizacji (np. paginacja listy). Dla 100 czasowników działa dobrze, ale przy większej liczbie może być potrzebne.

---

## COMMIT INFO

**Commit:** `d9240c4`  
**Message:** "Add Irregular Verbs module - MVP complete"  
**Branch:** `main`  
**Files changed:** 13  
**Lines added:** 2309  

---

**Data implementacji:** 2025-01-22  
**Status:** ✅ Produkcja, działające, gotowe do rozszerzeń
