# Podsumowanie audytu i zmian w projekcie English Platform

## ZAKRES AUDYTU (oryginalny)

Audyt z **2025-01** dotyczył:
- **Bezpieczeństwa API** — brak JWT w enrich, build-gap-test, pool; niebezpieczny x-user-id header
- **Architektury routingu** — duplikacja "puli" (osobna strona vs zakładka)
- **Integracji danych** — słówka z lekcji i własne nie trafiały do "całej puli"
- **Martwego kodu** — PoolClient.tsx
- **Next.js 16** — params jako Promise w Server Components

**Uwaga:** Od czasu audytu projekt znacząco się rozwinął. Poniżej stan aktualny + zmiany.

---

## KONTEKST PROJEKTU

**Stack:**
- Next.js 16.1.1 (App Router, TypeScript)
- Produkcja na Vercel (auto-deploy z main branch)
- Supabase: Auth + DB + RLS
- Stripe: subskrypcja wdrożona technicznie (checkout + webhooki), ale brak paywalla w UI

**Architektura:**
- Panel ucznia: `app/app/...` (NIE `app/...` — podwójny app folder)
- API routes: `app/api/...`
- Admin panel: `app/admin/...`

**Baza danych (aktualny stan):**
- **Leksykon:** `lexicon_entries`, `lexicon_senses`, `lexicon_translations`, `lexicon_examples`, `lexicon_verb_forms`
- **Pula użytkownika:** `user_vocab_items` (powiązanie student ↔ sense_id lub custom_lemma)
- **Legacy / równoległe:** `user_vocab` + `global_vocab_items` (używane przez pool API), `vocab_items` (fallback dla starych danych)
- **Ćwiczenia:** `vocab_answer_events`, `vocab_packs`, `vocab_clusters`, `vocab_cluster_questions`
- **Widoki v2:** `vocab_current_streaks`, `vocab_learned_total`, `vocab_to_learn_total`, `vocab_repeat_suggestions` (aliasy do v2_* opartych na vocab_answer_events)

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

### COMMIT 2: Uporządkowanie routingu (historyczne)
**Pliki:**
- `app/app/vocab/PoolTab.tsx` — komponent zakładki "Moja pula"
- `app/app/vocab/pool/page.tsx` — strona z zakładkami "Moja pula" i "Dodaj słówko"

**Uwaga:** Obecnie `/app/vocab` to hub z kafelkami (Moja pula, Fiszki, Typowe błędy). Strona `/app/vocab/pool` jest osobną stroną z PoolTab — nie ma redirectu do `?tab=pool`.

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
1. **Równoległe użycie systemów vocab:**
   - `user_vocab_items` — główny system (PoolTab, pool page, test loader, lessons)
   - `user_vocab` + `global_vocab_items` — używany przez pool API route
   - `vocab_items` — legacy fallback w pool page dla starych danych
   - **Uwaga:** Migracja do jednego systemu wymagałaby większego refaktoringu.

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
- Hub vocab z kafelkami (Moja pula, Fiszki, Typowe błędy)
- Słówka (lexicon + custom) trafiają do puli (user_vocab_items)
- Next.js 16 params działają poprawnie

### 📊 Struktura routingu (aktualna)
- `/app` — panel ucznia (dashboard)
- `/app/status` — dashboard progresu
- `/app/vocab` — hub słówek (3 kafelki):
  - "Moja pula" → `/app/vocab/pool`
  - "Fiszki" → `/app/vocab/packs`
  - "Typowe błędy" → `/app/vocab/clusters`
- `/app/vocab/pool` — strona z zakładkami "Moja pula" (PoolTab) i "Dodaj słówko"
- `/app/vocab/packs` — paczki tematyczne
- `/app/vocab/clusters` — clustery (make/do, say/tell, itp.)
- `/app/vocab/lesson/[id]` — szczegóły lekcji
- `/app/vocab/test` — testy słówek (source=pool|lesson|ids)

### 🔐 Bezpieczeństwo
- Wszystkie API routes używają JWT Bearer token
- Service role używany tylko w backendzie (`createSupabaseAdmin()`)
- RLS działa poprawnie (student widzi swoje, admin pełny dostęp)
- Filtrowanie po `student_id` w kliencie dla dodatkowej warstwy bezpieczeństwa

---

## ZALECENIA NA PRZYSZŁOŚĆ

### Krótkoterminowe (niskie ryzyko)
1. **Zunifikowanie systemów vocab:**
   - Pool API używa `user_vocab` + `global_vocab_items`; PoolTab używa `user_vocab_items`
   - Rozważyć ujednolicenie na `user_vocab_items` (lexicon-based) jako jedyne źródło
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
   - Test loader już używa `user_vocab_items` (source=pool, lesson)
   - Upewnić się, że wszystkie ścieżki (source=ids itp.) są spójne

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
   - Główny system: `user_vocab_items` (lexicon-based lub custom)
   - Równolegle: `user_vocab` + `global_vocab_items` (pool API), `vocab_items` (legacy fallback)
   - Ćwiczenia: `vocab_answer_events`, widoki v2_*
   - Migracja do jednego systemu wymaga planowania i testów

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
- `app/api/vocab/enrich/route.ts` — pobieranie danych (IPA, audio, przykłady)
- `app/api/vocab/generate-example/route.ts` — generowanie przykładów AI
- `app/api/vocab/build-gap-test/route.ts` — budowanie testów luk
- `app/api/vocab/log-exercise/route.ts` — logowanie wyników ćwiczeń
- `app/api/vocab/repeat-suggestions/route.ts` — sugestie powtórek
- `app/api/vocab/progress-extended/route.ts` — dashboard progresu
- `app/api/vocab/add-to-pool/route.ts` — auto-dodawanie do puli
- `app/api/vocab/pool/route.ts` — dane puli (user_vocab + global_vocab_items)
- `app/api/vocab/clusters/route.ts` — lista clusterów

**Frontend:**
- `app/app/vocab/page.tsx` — hub słówek (3 kafelki: Moja pula, Fiszki, Typowe błędy)
- `app/app/vocab/PoolTab.tsx` — komponent zakładki "Moja pula" (user_vocab_items)
- `app/app/vocab/pool/page.tsx` — strona z zakładkami "Moja pula" i "Dodaj słówko"
- `app/app/vocab/lesson/[id]/page.tsx` — szczegóły lekcji
- `app/app/vocab/clusters/page.tsx` — lista clusterów
- `app/app/status/page.tsx` — dashboard progresu

**Utils:**
- `lib/supabase/admin.ts` - service role client
- `lib/supabase/client.ts` - anon client (RLS)
- `lib/auth/profile.ts` - pomocnicze funkcje auth

---

## TESTY MANUALNE (Checklista)

Po każdym deployu sprawdź:
- [ ] `/app/vocab` — 3 kafelki (Moja pula, Fiszki, Typowe błędy)
- [ ] `/app/vocab/pool` — zakładki "Moja pula" i "Dodaj słówko"
- [ ] Dodanie słówka (lookup / custom) → pojawia się w puli
- [ ] Funkcje puli: enrich, test, repeat suggestions
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

**Struktura tabel (wybrane):**
- `user_vocab_items`: `id`, `student_id`, `sense_id`, `custom_lemma`, `custom_translation_pl`, `source`, `verified`
- `global_vocab_items`: `id`, `term_en`, `term_en_norm` (używane przez pool API)
- `user_vocab`: `student_id`, `global_vocab_item_id` (powiązanie user–global)
- `vocab_enrichments`: `term_en_norm`, `translation_pl_suggested`, `example_en`, `ipa`, `audio_url`

---

**Data oryginalnego audytu:** 2025-01  
**Ostatnia aktualizacja:** 2026-03-28  
**Status:** ✅ Produkcja stabilna; dokument zaktualizowany pod obecną architekturę

**Zmiana 2026-03-19:** Sugestie treningowe ujednolicone w **`GET /api/suggestions`** (profil + widget „Co trenować”). **2026-03-28:** Pełny audyt knowledge engine + sugestii w jednym pliku: **`KNOWLEDGE_ENGINE_AND_TRAINING_SUGGESTIONS_AUDIT.md`** (zastępuje `CO_TRENOWAC_AUDIT.md` i `INTELLIGENT_SUGGESTIONS_V2_AUDIT.md`). Endpoint `intelligent-suggestions-v2` nie jest wywoływany z UI.

**Inne raporty audytowe:**
- `CLUSTERS_MODULE_AUDIT_REPORT.md` — moduł clusterów (typowe błędy)
- `GRAMMAR_MODULE_AUDIT_REPORT.md` — moduł gramatyki
- `KNOWLEDGE_ENGINE_AND_TRAINING_SUGGESTIONS_AUDIT.md` — knowledge engine, „Co trenować”, `/api/suggestions`, legacy MV
