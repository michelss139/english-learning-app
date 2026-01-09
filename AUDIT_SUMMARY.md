# Podsumowanie audytu i zmian w projekcie English Platform

## KONTEKST PROJEKTU

**Stack:**
- Next.js 16.1.1 (App Router, TypeScript)
- Produkcja na Vercel (auto-deploy z main branch)
- Supabase: Auth + DB + RLS
- Stripe: subskrypcja wdrożona technicznie (checkout + webhooki), ale brak paywalla w UI

**Architektura:**
- Panel ucznia: `app/app/...` (NIE `app/...` - to jest "podwójny app folder")
- API routes: `app/api/...`
- Admin panel: `app/admin/...`

**Baza danych:**
- Stary system: `vocab_items` + `student_lessons` + `student_lesson_vocab` + `vocab_test_runs`
- Nowy system: `global_vocab_items` (systemowe słowa EN-only) + `user_vocab` (powiązanie user-global) + `vocab_enrichments` (cache: tłumaczenia, przykłady, IPA, audio) + `vocab_exercise_runs` (log ćwiczeń)
- Widoki SQL: `vocab_current_streaks`, `vocab_learned_total`, `vocab_to_learn_total`, `vocab_repeat_suggestions`

**Definicje:**
- "Nauczone" = current streak >= 5 poprawnych z rzędu
- `toLearn` wyklucza `learned` (słowo nie może być w obu listach)

---

## ZMIANY WPROWADZONE (Commity)

### COMMIT 1: Naprawa bezpieczeństwa API + Next.js 16 params fix
**Pliki:**
- `app/api/vocab/enrich/route.ts` - dodano JWT auth
- `app/api/vocab/build-gap-test/route.ts` - dodano JWT auth
- `app/api/vocab/pool/route.ts` - zastąpiono niebezpieczny `x-user-id` header JWT auth
- `app/app/vocab/pool/page.tsx` - dodano filtrowanie po `student_id` + tokeny w requestach
- `app/courses/[slug]/lessons/[lessonSlug]/page.tsx` - naprawiono Next.js 16 params (Promise unwrap)

**Problemy naprawione:**
- ❌ `/api/vocab/enrich` był dostępny bez autentykacji → ✅ dodano JWT verification
- ❌ `/api/vocab/build-gap-test` był dostępny bez autentykacji → ✅ dodano JWT verification
- ❌ `/api/vocab/pool` używał niebezpiecznego `x-user-id` header → ✅ zastąpiono JWT auth
- ❌ Zapytanie do `user_vocab` w pool page nie filtrowało po `student_id` → ✅ dodano `.eq("student_id", userId)`
- ❌ Next.js 16 params Promise unwrap → ✅ naprawiono

### COMMIT 2: Uporządkowanie routingu - integracja "Cała pula" jako zakładka
**Pliki:**
- `app/app/vocab/PoolTab.tsx` - nowy komponent (logika z pool/page.tsx)
- `app/app/vocab/page.tsx` - dodano zakładkę "pool", obsługa query param `?tab=pool`
- `app/app/vocab/pool/page.tsx` - zmieniono na redirect do `/app/vocab?tab=pool`

**Zmiany:**
- ✅ "Cała pula" jest teraz zakładką w `/app/vocab` (nie osobną stroną)
- ✅ Link "Cała pula →" zastąpiony przyciskiem zakładki
- ✅ `/app/vocab/pool` przekierowuje do `/app/vocab?tab=pool` (backward compatibility)

### COMMIT 3: Usunięcie nieużywanego kodu
**Pliki:**
- `app/app/vocab/pool/PoolClient.tsx` - usunięto (nie był używany)

### COMMIT 4: Auto-dodawanie słówek do "całej puli"
**Pliki:**
- `app/api/vocab/add-to-pool/route.ts` - nowy endpoint
- `app/app/vocab/lesson/[id]/page.tsx` - integracja z `addWordToLesson`
- `app/app/vocab/page.tsx` - integracja z `addPersonalWord`

**Funkcjonalność:**
- ✅ Gdy uczeń dodaje słówko do lekcji → automatycznie trafia do `global_vocab_items` + `user_vocab`
- ✅ Gdy uczeń dodaje własne słówko → automatycznie trafia do `global_vocab_items` + `user_vocab`
- ✅ Słówka są teraz widoczne w zakładce "Cała pula"

**Naprawione błędy:**
- ❌ Tabela `user_vocab` nie ma kolumny `id` → ✅ zmieniono na `select("student_id, global_vocab_item_id")`

---

## OBSERWACJE Z AUDYTU

### ✅ Naprawione (krytyczne)
1. Brak autentykacji w `/api/vocab/enrich` - NAPRAWIONE
2. Brak autentykacji w `/api/vocab/build-gap-test` - NAPRAWIONE
3. Niebezpieczna autentykacja w `/api/vocab/pool` (x-user-id header) - NAPRAWIONE
4. Brak filtrowania po `student_id` w pool page - NAPRAWIONE
5. Next.js 16 params Promise unwrap - NAPRAWIONE
6. Duplikacja funkcjonalności (dwie "pule") - NAPRAWIONE (jedna zakładka)
7. Nieużywany kod (`PoolClient.tsx`) - USUNIĘTY
8. Słówka z lekcji nie trafiały do "całej puli" - NAPRAWIONE

### ⚠️ Pozostawione (nie krytyczne, do rozważenia w przyszłości)
1. **Równoległe użycie starego i nowego systemu:**
   - Stary: `vocab_items` używany w `/app/vocab/page.tsx` (własne słówka), `/app/vocab/lesson/[id]/page.tsx`, `/app/vocab/test/page.tsx`
   - Nowy: `global_vocab_items` + `user_vocab` używany w `/app/vocab/pool` (PoolTab)
   - **Uwaga:** Oba systemy działają równolegle. Migracja wymagałaby większego refaktoringu.

2. **Error handling:**
   - Wiele miejsc używa `alert()` zamiast UI error states
   - Brak error boundaries
   - **Uwaga:** Nie krytyczne, ale warto poprawić w przyszłości

3. **Stripe paywall:**
   - Subskrypcja wdrożona technicznie (checkout + webhooki + `subscription_status` w profiles)
   - Brak paywalla w UI (wszystko dostępne)
   - **Uwaga:** Zgodnie z wymaganiami - nie ruszane w tym audycie

---

## OBECNY STAN PROJEKTU

### ✅ Działa stabilnie
- Autentykacja i RLS działają poprawnie
- Wszystkie API endpoints są zabezpieczone JWT
- Routing jest spójny (jedna "pula" jako zakładka)
- Słówka z lekcji i własne automatycznie trafiają do "całej puli"
- Next.js 16 params działają poprawnie

### 📊 Struktura routingu
- `/app` - panel ucznia (dashboard)
- `/app/status` - dashboard progresu
- `/app/vocab` - hub słówek z zakładkami:
  - "Lekcje (daty)" - tworzenie lekcji, lista lekcji
  - "Cała pula" - nowy system (global_vocab_items + user_vocab)
  - "Własne słówka" - stary system (vocab_items z is_personal=true)
- `/app/vocab/lesson/[id]` - szczegóły lekcji
- `/app/vocab/test` - testy słówek (stary system)
- `/app/vocab/pool` - redirect do `/app/vocab?tab=pool`

### 🔐 Bezpieczeństwo
- Wszystkie API routes używają JWT Bearer token
- Service role używany tylko w backendzie (`createSupabaseAdmin()`)
- RLS działa poprawnie (student widzi swoje, admin pełny dostęp)
- Filtrowanie po `student_id` w kliencie dla dodatkowej warstwy bezpieczeństwa

---

## ZALECENIA NA PRZYSZŁOŚĆ

### Krótkoterminowe (niskie ryzyko)
1. **Migracja starego systemu do nowego:**
   - Przenieść "Własne słówka" z `vocab_items` do `global_vocab_items` + `user_vocab`
   - Zunifikować źródła danych
   - **Uwaga:** Wymaga migracji danych i testów

2. **Poprawa error handling:**
   - Zastąpić `alert()` UI error states
   - Dodać error boundaries
   - Lepsze loading states

3. **Refaktory - wspólna funkcja auth:**
   - Utworzyć `lib/api/auth.ts` z funkcją `verifyJWT(req: Request)`
   - Wyeliminować duplikację kodu w API routes

### Długoterminowe (wymaga planowania)
1. **Paywall w UI:**
   - Dodać sprawdzanie `subscription_status` w UI
   - Ograniczyć funkcje premium (np. AI generate example)
   - **Uwaga:** Stripe już wdrożone, tylko UI brakuje

2. **Migracja testów:**
   - Przenieść `/app/vocab/test` z `vocab_items` do nowego systemu
   - Użyć `vocab_exercise_runs` zamiast `vocab_test_runs`

3. **Optymalizacja:**
   - Cache'owanie zapytań do bazy
   - Paginacja w "Całej puli" (jeśli dużo słówek)
   - Lepsze loading states

---

## WAŻNE UWAGI DLA KONTYNUACJI

1. **Architektura:**
   - Panel ucznia jest w `app/app/...` (NIE `app/...`)
   - Nie tworzyć równoległych folderów poza `app/app/...`
   - Routing działa przez linki/redirecty, nie duże przebudowy

2. **Bezpieczeństwo:**
   - Zawsze używać JWT Bearer token w API routes
   - Service role tylko w backendzie (`createSupabaseAdmin()`)
   - Filtrować po `student_id` w kliencie dla dodatkowej warstwy

3. **Baza danych:**
   - Dwa systemy działają równolegle (stary i nowy)
   - Nowy system: `global_vocab_items` + `user_vocab` + `vocab_enrichments` + `vocab_exercise_runs`
   - Stary system: `vocab_items` + `vocab_test_runs`
   - Migracja wymaga planowania i testów

4. **Stripe:**
   - Technicznie wdrożone (checkout + webhooki)
   - Brak paywalla w UI (wszystko dostępne)
   - `subscription_status` w `profiles` table

5. **Next.js 16:**
   - `params` w Server Components jest Promise - trzeba `await params`
   - `useParams()` w Client Components działa normalnie (synchronicznie)

---

## PLIKI KLUCZOWE

**API Routes:**
- `app/api/vocab/enrich/route.ts` - pobieranie danych z open APIs (IPA, audio, przykłady)
- `app/api/vocab/generate-example/route.ts` - generowanie przykładów AI (z cache)
- `app/api/vocab/build-gap-test/route.ts` - budowanie testów luk
- `app/api/vocab/log-exercise/route.ts` - logowanie wyników ćwiczeń
- `app/api/vocab/repeat-suggestions/route.ts` - sugestie powtórek
- `app/api/vocab/progress-extended/route.ts` - rozszerzony dashboard progresu
- `app/api/vocab/add-to-pool/route.ts` - **NOWY** - auto-dodawanie do puli

**Frontend:**
- `app/app/vocab/page.tsx` - główny hub słówek (3 zakładki)
- `app/app/vocab/PoolTab.tsx` - **NOWY** - komponent zakładki "Cała pula"
- `app/app/vocab/lesson/[id]/page.tsx` - szczegóły lekcji
- `app/app/vocab/pool/page.tsx` - redirect do zakładki
- `app/app/status/page.tsx` - dashboard progresu

**Utils:**
- `lib/supabase/admin.ts` - service role client
- `lib/supabase/client.ts` - anon client (RLS)
- `lib/auth/profile.ts` - pomocnicze funkcje auth

---

## TESTY MANUALNE (Checklista)

Po każdym deployu sprawdź:
- [ ] `/app/vocab` - 3 zakładki działają
- [ ] `/app/vocab?tab=pool` - automatycznie otwiera zakładkę "Cała pula"
- [ ] `/app/vocab/pool` - przekierowuje do `/app/vocab?tab=pool`
- [ ] Dodanie słówka do lekcji → pojawia się w "Cała pula"
- [ ] Dodanie własnego słówka → pojawia się w "Cała pula"
- [ ] Wszystkie funkcje puli działają (enrich, test, repeat suggestions)
- [ ] API routes wymagają JWT (401 bez tokenu)

---

## NOTATKI TECHNICZNE

**Service Role vs Anon Key:**
- Service role (`SUPABASE_SERVICE_ROLE_KEY`) - omija RLS, używany w API routes
- Anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) - respektuje RLS, używany w kliencie

**RLS:**
- Student widzi tylko swoje dane (filtrowanie po `auth.uid()`)
- Admin widzi wszystko (sprawdzanie `role = 'admin'` w profiles)
- Service role omija RLS całkowicie

**Struktura tabel:**
- `global_vocab_items`: `id`, `term_en`, `term_en_norm` (unique)
- `user_vocab`: `student_id`, `global_vocab_item_id`, `created_at` (composite key, brak `id`)
- `vocab_enrichments`: `term_en_norm` (unique), `translation_pl_suggested`, `example_en`, `example_en_manual`, `example_en_ai`, `ipa`, `audio_url`

---

**Data audytu:** 2025-01-XX
**Status:** ✅ Produkcja stabilna, wszystkie krytyczne problemy naprawione
