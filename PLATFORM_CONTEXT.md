# English Platform — Kontekst projektu dla planowania

**Data:** 2026-05-20  
**Cel dokumentu:** Briefing dla Claude — pełny obraz platformy, stan aktualny, co zostało zrobione, co wymaga pracy. Podstawa do stworzenia planu A–Z.

---

## 1. Czym jest platforma

Aplikacja do nauki języka angielskiego dla polskich użytkowników, zbudowana jako **SaaS premium**. Aktualnie w fazie **pre-launch** (3 użytkowników testowych). Stripe jest wdrożony technicznie, ale brak paywalla w UI — platforma jest w pełni bezpłatna de facto.

**Właściciel:** Michał Surmacz  
**Cel biznesowy:** Płatna subskrypcja — premium platforma językowa generująca stały przychód.

---

## 2. Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 16.1.1 (App Router, TypeScript) |
| Stylowanie | Tailwind CSS v4 |
| Backend/Auth/DB | Supabase (PostgreSQL 17, RLS) |
| Płatności | Stripe (checkout + webhook — technicznie gotowe) |
| Hosting | Vercel (auto-deploy z `main`) |
| AI | Anthropic Claude API (grammar dialog, story generator, vocab enrichment) |
| Testy | Vitest |

**Architektura katalogów:**
```
app/
├── app/          ← Panel ucznia (UWAGA: podwójny folder app — celowe)
│   ├── page.tsx  ← Dashboard
│   ├── vocab/    ← Słownictwo
│   ├── grammar/  ← Gramatyka
│   ├── irregular-verbs/
│   ├── lessons/  ← Lekcje z nauczycielem
│   ├── profile/
│   ├── story-generator/
│   └── status/
├── admin/        ← Panel admina (role=admin)
├── api/          ← API routes (Next.js Route Handlers)
├── courses/      ← Publiczne kursy (poza panelem ucznia)
└── login/register/logout
```

---

## 3. Moduły — stan aktualny

### 3.1 Słownictwo (Vocab) ← najważniejszy moduł

**Trzy ścieżki nauki:**
- **Moja pula** (`/app/vocab/pool`) — osobista baza słówek ucznia (zakładki: Trenuj / Słowa / Dodaj)
- **Fiszki** (`/app/vocab/packs`) — 239 paczek tematycznych, 4196 pozycji
- **Typowe błędy** (`/app/vocab/clusters`) — 8 clusterów semantycznych (make/do, say/tell, hear/listen itd.)

**Leksykon (treść bazy):**
- `lexicon_entries` — 5 803 haseł
- `lexicon_senses` — 6 042 sensów
- `lexicon_translations` — 6 042 tłumaczeń
- `lexicon_examples` — 11 362 przykładów
- `lexicon_patterns` — 2 142 wzorców

**WAŻNE — dwa systemy vocab (nierozwiązany dług techniczny):**
| System | Tabele | Status |
|--------|--------|--------|
| **Główny (aktywny)** | `user_vocab_items` | Używany przez PoolTab, pool page, testy, lekcje |
| **Legacy** | `global_vocab_items`, `user_vocab` | Używany przez stare API (`/api/vocab/pool`, `/api/vocab/add-to-pool`) — niewywoływane z UI |

### 3.2 Gramatyka

- 12 czasów angielskich + conditionals + modal verbs + stative verbs
- Ćwiczenia z AI dialogiem (cache w `grammar_ai_dialog_cache`)
- Sentence Builder
- `grammar_sessions` — 34 sesje, `grammar_session_answers` — 9

### 3.3 Czasowniki nieregularne

- 180 czasowników w bazie (`irregular_verbs`)
- System przypinania (`user_irregular_verbs` — 5 przypiętych)
- Trening z 3 formami (`irregular_verb_runs` — 160 przebiegów)
- Wsparcie trybu targetowanego (`mode=targeted`)

### 3.4 Profil / Gamifikacja

- **XP** — `xp_events` (42), `user_xp` (2)
- **Streaki** — `user_streaks` (2)
- **Odznaki** — `badges` (1 definicja), `user_badges` (0 zdobytych)
- **Sugestie treningowe** — `GET /api/suggestions` (scoring wg `user_learning_unit_knowledge` + `irregular_verb_runs`) — widoczne w `GlobalTrainingSuggestion` i ProfilePage

### 3.5 Lekcje (tutoring)

- 15 lekcji z nauczycielem (`lessons`)
- Notatki, zadania, zasoby, tematy lekcji
- System relacji nauczyciel–uczeń (`teacher_student_relations` — 1)
- Osobny typ: lekcje słówek (`student_lessons`) — 9

### 3.6 Kursy

- 2 kursy w bazie (`courses`) — publiczne, poza panelem ucznia
- Panel admin do zarządzania: `/admin/courses`

### 3.7 Story Generator

- Generuje historyjki z lukami przez Claude API
- Ścieżka: `/app/story-generator`

---

## 4. Baza danych — pełny stan (2026-05-20)

**50 tabel, region eu-west-1, PostgreSQL 17**

Kluczowe liczby:
```
lexicon_examples         11 362
lexicon_translations      6 042
lexicon_senses            6 042
lexicon_entries           5 803
vocab_pack_items          4 196
lexicon_patterns          2 142
vocab_answer_events         797    ← log odpowiedzi
user_learning_unit_knowledge 441   ← knowledge state
vocab_packs                 239
irregular_verbs             180
training_sessions           148
exercise_session_completions 72
user_vocab_items             70    ← główna pula użytkownika
xp_events                    42
grammar_sessions              34
lessons                       15
profiles                       3   ← pre-launch!
```

---

## 5. Bezpieczeństwo — stan po naprawach (2026-05-20)

**Naprawione dziś:**
- ✅ `admin_core_senses()` — odebrano dostęp anonimowy i nieautoryzowanym
- ✅ `admin_lexicon_audit_summary()` — j.w.
- ✅ `is_admin()` — odebrano dostęp anonimowy
- ✅ `has_active_subscription()` — odebrano dostęp anonimowy
- ✅ `complete_grammar_practice()` — odebrano dostęp anonimowy
- ✅ RLS na `global_vocab_items` INSERT — ograniczono do admin
- ✅ `search_path` zabezpieczony w 4 funkcjach

**Pozostałe (akceptowalne):**
- 4 materialized views dostępne dla `authenticated` — dane filtrowane po user_id, niskie ryzyko
- `has_active_subscription()`, `is_admin()`, `complete_grammar_practice()` — celowo dostępne dla zalogowanych
- Ochrona przed wyciekłymi hasłami — do włączenia ręcznie w dashboardzie Supabase (Auth → Password Security)

---

## 6. Dług techniczny (znane problemy)

### Krytyczny / do usunięcia
- **~20 nieużywanych API routes** (zidentyfikowane, nie usunięte) — m.in. `/api/app/intelligent-suggestions-v2`, `/api/vocab/pool`, `/api/vocab/add-to-pool`, `/api/irregular-verbs/toggle`
- **Legacy vocab system** — `global_vocab_items` + `user_vocab` używane przez martwe API; docelowo cały ruch na `user_vocab_items`

### Ważny
- **Brak paywalla w UI** — Stripe wdrożony (`subscription_status` w `profiles`), checkout istnieje, ale ZERO ograniczeń w interfejsie
- **Error handling** — `alert()` zamiast UI error states, brak error boundaries
- **Brak wspólnej funkcji auth** — duplikacja JWT verification w każdym API route

### Niski
- `SuggestionsPanel.tsx` istnieje, nie jest podpięty do żadnej strony
- Materialized views odświeżane manualnie (brak pg_cron)
- `GET /api/app/intelligent-suggestions-v2` — nadal w repo, nieużywany

---

## 7. Co brakuje do platformy premium

### Monetyzacja (PILNE przed launchem)
- [ ] Paywall w UI — middleware sprawdzający `subscription_status`
- [ ] Strona z planami subskrypcji
- [ ] Bramka do checkout (`/api/stripe/checkout` istnieje — tylko UI brakuje)
- [ ] Obsługa wygaśnięcia subskrypcji (webhook już działa)
- [ ] Free tier vs Premium tier — co jest dostępne bez płatności?

### UI/UX (kluczowe dla konwersji)
- [ ] Design system — brak spójnej palety kolorów, typografii, komponentów
- [ ] Landing page (strona główna `/`) — prawdopodobnie placeholder
- [ ] Onboarding flow — nowy użytkownik nie wie od czego zacząć
- [ ] Mobile responsiveness — nieweryfikowana
- [ ] Loading states i animacje — surowe
- [ ] Dashboard — kafelki/sekcje bez wizualnego hierarchy

### Retencja
- [ ] Streak — istnieje w DB, nie wiadomo czy widoczny prominentnie w UI
- [ ] Odznaki — 1 definicja, 0 zdobytych — system nieaktywny
- [ ] Email notifications (daily reminder, streak break) — brak
- [ ] Progress visualization — status page istnieje ale UI nieznany

### Content
- [ ] Leksykon — 5 803 haseł, wiele bez pełnej weryfikacji (flagged_for_review)
- [ ] CEFR labeling — częściowe (migracje dodały kolumny, ale nie wszystkie wypełnione)
- [ ] Fiszki — 239 paczek, część może mieć duplikaty lub nieaktualne dane

---

## 8. Znane pliki kluczowe

```
lib/
├── supabase/admin.ts       ← service role client (omija RLS)
├── supabase/client.ts      ← anon client (respektuje RLS)
├── auth/profile.ts         ← pomocnicze funkcje auth
├── vocab/                  ← engine słownictwa
├── grammar/                ← content + practice logic
├── xp/                     ← system XP, levels, badges
└── lessons/                ← logika lekcji

app/api/
├── suggestions/route.ts    ← główny endpoint sugestii treningowych
├── stripe/webhook/route.ts ← webhook Stripe (działa)
├── stripe/checkout/route.ts← checkout Stripe (działa, brak UI)
└── grammar/ai-dialog/      ← Claude API dialog
```

---

## 9. Zasady architektoniczne (WAŻNE)

1. Panel ucznia zawsze w `app/app/...` — NIE w `app/...`
2. API routes w `app/api/...`
3. Auth w API: zawsze `Authorization: Bearer <JWT>`, weryfikacja przez `createSupabaseAdmin()`
4. Service role (`SUPABASE_SERVICE_ROLE_KEY`) — tylko w backendzie, nigdy w kliencie
5. `params` w Server Components to Promise — zawsze `await params`
6. Nowe migracje DB przez `supabase/migrations/` lub bezpośrednio przez MCP

---

## 10. Priorytety do ustalenia w planie

Poniżej lista obszarów wymagających decyzji — co robimy i w jakiej kolejności:

**A. Monetyzacja** — bez paywalla nie ma biznesu. Stripe gotowy, tylko UI.  
**B. UI/UX redesign** — platforma wygląda jak MVP, nie jak premium produkt.  
**C. Landing page** — punkt wejścia dla płacących klientów.  
**D. Onboarding** — nowy użytkownik musi wiedzieć co robić.  
**E. Content quality** — duplikaty, brakujące tłumaczenia, CEFR gaps.  
**F. Dług techniczny** — martwe API, legacy vocab, error handling.  
**G. Retencja** — email, streaki, odznaki.  
**H. Teacher flow** — lekcje z nauczycielem jako feature premium.  

---

*Dokument wygenerowany przez Claude Code na podstawie analizy kodu źródłowego i bezpośredniego dostępu do bazy danych Supabase.*
