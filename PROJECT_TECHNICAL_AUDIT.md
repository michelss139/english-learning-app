# Audyt techniczny projektu English Platform (LANGBracket)

**Data:** 2026-03-06  
**Cel:** Pełny audyt dla osoby wchodzącej w projekt od strony technicznej. Mapowanie elementów, identyfikacja nieużywanych części oraz nakładających się systemów.

---

## 1. Executive Summary

**English Platform** to aplikacja do nauki języka angielskiego (Next.js 16, Supabase, TypeScript). Obejmuje:

- **Słownictwo:** pula słówek, fiszki (packs), typowe błędy (clusters), lekcje
- **Gramatyka:** 12 czasów, conditionals, modal verbs, stative verbs, sentence builder
- **Czasowniki nieregularne:** trening z przypinaniem czasowników
- **Profil:** XP, streak, odznaki, sugestie treningowe
- **Lekcje:** tutoring (lessons) + lekcje słówek (student_lessons)
- **Kursy:** publiczne kursy wideo (courses)
- **Admin:** zarządzanie kursami
- **Story Generator:** generowanie historii z lukami (AI)

**Główne ustalenia audytu:**
- ~20 API routes **nie jest wywoływanych** z frontendu
- Dwa równoległe systemy vocab: `user_vocab_items` (główny) vs `user_vocab` + `global_vocab_items` (legacy)
- Dwa systemy sugestii: GlobalTrainingSuggestion (statyczny) vs intelligent-suggestions-v2 (profil)
- Stripe wdrożony technicznie, brak paywalla w UI

---

## 2. Tech Stack i architektura

### 2.1 Stack

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 16.1.1 (App Router) |
| Język | TypeScript |
| Stylowanie | Tailwind CSS 4 |
| Baza danych | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Płatności | Stripe (checkout + webhook) |
| Hosting | Vercel (auto-deploy z main) |

### 2.2 Struktura katalogów

```
app/
├── app/                    # Panel ucznia (główna aplikacja)
│   ├── page.tsx            # Dashboard
│   ├── layout.tsx          # Layout z GlobalCoach, GlobalTrainingSuggestion
│   ├── grammar/            # Gramatyka (czasy, conditionals, modals)
│   ├── vocab/              # Słownictwo (pool, packs, clusters, lessons)
│   ├── irregular-verbs/     # Czasowniki nieregularne
│   ├── profile/            # Profil użytkownika
│   ├── lessons/            # Lista lekcji tutoringowych
│   ├── story-generator/    # Generator historii
│   └── status/             # Dashboard progresu
├── admin/                  # Panel admina (role=admin)
│   └── courses/            # Zarządzanie kursami
├── api/                    # API routes (Next.js Route Handlers)
├── courses/                # Publiczne kursy (nie /app)
├── login, register, logout
└── profile                 # Redirect do /app/profile
```

**Uwaga:** Panel ucznia jest w `app/app/...` (podwójny folder `app`). To zamierzone – `/app` to route, `app/` to folder Next.js.

### 2.3 Źródła danych

| Źródło | Użycie |
|--------|--------|
| Supabase (client) | Bezpośrednie zapytania z komponentów (RLS) |
| Supabase (server) | Server Components, SSR |
| Supabase (admin) | API routes – operacje wymagające omijania RLS |
| API routes | Operacje złożone, JWT auth, integracje zewnętrzne |

---

## 3. Mapowanie modułów

### 3.1 Słownictwo (Vocab)

| Element | Opis | Źródło danych |
|---------|------|---------------|
| **Hub** `/app/vocab` | 3 kafelki: Moja pula, Fiszki, Typowe błędy | Statyczna nawigacja |
| **Moja pula** `/app/vocab/pool` | Zakładki: Moja pula, Dodaj słówko | `user_vocab_items` (Supabase) |
| **PoolTab** | Lista słówek, repeat suggestions, test | `user_vocab_items`, `/api/vocab/repeat-suggestions`, `/api/vocab/generate-example` |
| **Fiszki** `/app/vocab/packs` | Lista packów | `vocab_packs`, `vocab_pack_items` (Supabase) |
| **Pack trening** `/app/vocab/pack/[slug]` | Trening fiszek | Supabase + `/api/vocab/packs/[slug]/answer`, complete, add-words, recommendations |
| **Typowe błędy** `/app/vocab/clusters` | Lista clusterów | `/api/vocab/clusters` |
| **Cluster trening** `/app/vocab/cluster/[slug]` | Trening clusterów | `loadClusterPageData` (lib) + POST `/api/vocab/clusters/[slug]/questions`, complete |
| **Lekcja** `/app/vocab/lesson/[id]` | Słówka przypięte do lekcji | `student_lessons`, `lesson_vocab_items`, `user_vocab_items` |
| **Test** `/app/vocab/test` | Test słówek (pool/lesson/ids) | `loadTestItems` (lib) |

**Tabele:** `user_vocab_items`, `lexicon_*`, `vocab_packs`, `vocab_pack_items`, `vocab_clusters`, `vocab_cluster_*`, `vocab_answer_events`, `student_lessons`, `lesson_vocab_items`.

### 3.2 Gramatyka

| Element | Opis | Źródło danych |
|---------|------|---------------|
| **Hub** `/app/grammar` | Linki do czasów, conditionals, modals | Statyczna nawigacja |
| **Czasy** | 12 czasów (present-simple, past-simple, itd.) | `lib/grammar/content.ts`, `practice.ts` |
| **Practice** | Ćwiczenia wielokrotnego wyboru | `/api/grammar/start`, answer, complete |
| **AI Dialog** | Chat z AI (np. wyjaśnienia) | `/api/grammar/ai-dialog` |
| **Sentence Builder** | Budowanie zdań | `irregular_verbs` + `lexicon_verb_forms` |
| **Conditionals** | Zero, First, Second, Third, Mixed | Statyczna treść |
| **Modal verbs** | must, possibility, advice, ability | Statyczna treść |

### 3.3 Czasowniki nieregularne

| Element | Opis | Źródło danych |
|---------|------|---------------|
| **Lista** `/app/irregular-verbs` | Przypinanie czasowników | Supabase: `user_irregular_verbs`, `irregular_verbs` |
| **Trening** `/app/irregular-verbs/train` | Test form | `/api/irregular-verbs/next`, submit, complete, pin |

**Uwaga:** Irregular **nie** zapisuje do `user_learning_unit_knowledge` – sugestie intelligent-suggestions dla irregular są zwykle puste.

### 3.4 Profil

| Element | Opis | Źródło danych |
|---------|------|---------------|
| **Profil** `/app/profile` | XP, streak, odznaki, sugestie | `/api/profile/xp`, streak, badges, `/api/app/intelligent-suggestions-v2` |
| **Twój plan na teraz** | Packs/clusters/irregular do powtórki | `intelligent-suggestions-v2` (mv_user_*_accuracy, user_learning_unit_knowledge) |

### 3.5 Lekcje (tutoring)

| Element | Opis | Źródło danych |
|---------|------|---------------|
| **Lista** `/app/lessons` | Kalendarz lekcji | `/api/lessons`, calendar |
| **Szczegóły** `/app/lessons/[id]` | Notatki, zadania, zasoby | `/api/lessons/[id]`, topics, notes, resources, teacher-comment |
| **Assignments** | Zadania (pack/cluster/irregular) | `lesson_assignments`, `/api/lessons/assignments/[id]/complete` |

### 3.6 Kursy

| Element | Opis | Źródło danych |
|---------|------|---------------|
| **Publiczne** `/courses` | Lista kursów | Supabase: `courses` |
| **Admin** `/admin/courses` | Zarządzanie kursami | Supabase |

### 3.7 Story Generator

| Element | Opis | Źródło danych |
|---------|------|---------------|
| **Generator** `/app/story-generator` | Historia z lukami | `/api/story-generator`, complete |

---

## 4. API routes – użyte vs nieużywane

### 4.1 Używane (potwierdzone)

| Route | Użycie |
|-------|--------|
| `GET /api/app/intelligent-suggestions-v2` | ProfilePage |
| `GET/POST /api/grammar/ai-dialog` | TensePageContent, stative-verbs, GrammarCompareClient |
| `POST /api/grammar/start`, answer, complete | GrammarPracticeClient |
| `POST /api/irregular-verbs/next`, submit, complete | TrainClient |
| `POST /api/irregular-verbs/pin` | IrregularVerbsClient |
| `GET /api/profile/xp`, streak, badges | ProfilePage, DashboardClient, status |
| `POST /api/story-generator`, complete | StoryGeneratorClient |
| `GET /api/vocab/clusters` | ClustersSection |
| `POST /api/vocab/clusters/pin` | ClustersClient |
| `POST /api/vocab/clusters/[slug]/questions` | ClusterClient (logowanie odpowiedzi) |
| `POST /api/vocab/clusters/[slug]/complete` | ClusterClient |
| `POST /api/vocab/packs/[slug]/answer`, complete, add-words | PackTrainingClient |
| `GET /api/vocab/packs/[slug]/recommendations` | PackTrainingClient |
| `POST /api/vocab/add-word` | SenseSelectionModal |
| `POST /api/vocab/lookup-word` | SenseSelectionModal |
| `DELETE /api/vocab/delete-word` | PoolTab, pool page, lesson page |
| `GET /api/vocab/repeat-suggestions` | PoolTab |
| `POST /api/vocab/generate-example` | PoolTab |
| `POST /api/vocab/load-test-items` | test page |
| `GET /api/vocab/progress-extended` | status page |
| `GET /api/lessons`, calendar | lessons list, LessonCalendar |
| `GET/PATCH /api/lessons/[id]` | lesson detail |
| `GET/POST /api/lessons/[id]/topics`, notes, resources, teacher-comment | lesson detail |
| `POST /api/lessons/assignments/[assignmentId]/complete` | PackTrainingClient, ClusterClient, TrainClient |
| `POST /api/stripe/webhook` | Stripe (zewnętrzny) |

### 4.2 Nieużywane (brak wywołań z frontendu)

| Route | Uwagi |
|-------|-------|
| `GET /api/app/suggestion` | Zastąpiony przez intelligent-suggestions-v2 |
| `GET /api/app/onboarding-status` | Brak użycia w UI |
| `GET /api/irregular-verbs/list` | Irregular verbs ładuje dane przez Supabase (SSR) |
| `POST /api/irregular-verbs/toggle` | UI używa `/api/irregular-verbs/pin` |
| `POST /api/stripe/checkout` | Brak paywalla – nie wywoływany |
| `PATCH /api/lessons/assignments/[assignmentId]` | Tylko complete jest używane |
| `GET /api/vocab/clusters/[slug]/questions` | Strona ładuje przez `loadClusterPageData` (lib), nie przez GET API |
| `GET /api/vocab/pool` | PoolTab używa Supabase bezpośrednio |
| `GET /api/vocab/packs` | Packs page używa Supabase |
| `GET /api/vocab/packs/[slug]/items` | Pack ładuje items przez Supabase |
| `GET /api/vocab/suggestions` | Brak użycia |
| `POST /api/vocab/add-to-pool` | App używa add-word (user_vocab_items); add-to-pool pisze do global_vocab_items/user_vocab |
| `POST /api/vocab/log-exercise` | Brak użycia |
| `GET /api/vocab/progress-summary` | Brak użycia (progress-extended jest używany) |
| `POST /api/vocab/build-gap-test` | Brak użycia |
| `POST /api/vocab/enrich` | Enrichment przez lookup-word |
| `DELETE /api/vocab/delete-lesson` | Brak użycia |
| `GET /api/vocab/check-migration` | Narzędzie dev |
| `POST /api/vocab/run-migration` | Narzędzie dev |
| `POST /api/vocab/clear-cache` | Narzędzie dev |

---

## 5. Nakładające się i redundantne systemy

### 5.1 Dwa systemy vocab

| System | Tabele | Użycie |
|--------|--------|--------|
| **Główny (lexicon-based)** | `user_vocab_items` (sense_id lub custom_lemma) | PoolTab, pool page, lesson page, add-word, test loader |
| **Legacy** | `global_vocab_items`, `user_vocab` | `/api/vocab/pool`, `/api/vocab/add-to-pool` – **nieużywane z UI** |

PoolTab i pool page korzystają z `user_vocab_items` przez Supabase. API `pool` i `add-to-pool` operują na legacy – nie są wywoływane.

### 5.2 Dwa systemy sugestii treningowych

| System | Komponent | Źródło | Użycie |
|--------|-----------|--------|--------|
| **GlobalTrainingSuggestion** | „Co trenować” (prawy dolny róg) | Statyczna lista 3 opcji | Wszędzie w /app |
| **Intelligent suggestions** | „Twój plan na teraz” (profil) | `/api/app/intelligent-suggestions-v2` | Tylko profil |

GlobalTrainingSuggestion **nie** pobiera danych z API – zawsze te same 3 linki. Szczegóły: `CO_TRENOWAC_AUDIT.md`.

### 5.3 Dwa endpointy sugestii

| Endpoint | Użycie |
|----------|--------|
| `/api/app/suggestion` | **Nieużywany** |
| `/api/app/intelligent-suggestions-v2` | Profil |

### 5.4 Lekcje – dwa typy

| Typ | Tabela | Opis |
|-----|--------|------|
| **Tutoring** | `lessons` | Sesje z nauczycielem (data, temat, notatki) |
| **Lekcje słówek** | `student_lessons` | Kolekcje słówek (np. na datę) |

Różne modele – `lesson_vocab_items` łączy `student_lessons` z `user_vocab_items`.

### 5.5 Profile – dwa route

- `/profile` – redirect do `/app/profile`
- `/app/profile` – właściwy profil użytkownika

### 5.6 Courses vs Lessons

- **courses** – publiczne kursy wideo (tabela `courses`, `lessons` z `course_id`)
- **lessons** – tutoring 1:1 (tabela `lessons` bez `course_id`)

Tabela `lessons` jest polimorficzna (tutoring vs course lesson).

---

## 6. Baza danych – kluczowe tabele

### 6.1 Leksykon

- `lexicon_entries`, `lexicon_senses`, `lexicon_translations`, `lexicon_examples`, `lexicon_verb_forms`

### 6.2 Vocab

- `user_vocab_items` – główna pula użytkownika
- `vocab_packs`, `vocab_pack_items`
- `vocab_clusters`, `vocab_cluster_*`
- `vocab_answer_events` – log odpowiedzi (packs, clusters)
- `vocab_enrichments` – cache enrichment (IPA, przykłady)

### 6.3 Widoki / materialized views

- `v2_vocab_*` – learned, to_learn, repeat_suggestions
- `mv_user_pack_accuracy`, `mv_user_cluster_accuracy` – dla intelligent suggestions (wymagają REFRESH)
- `user_learning_unit_knowledge` – knowledge state (sense, cluster); irregular **nie** zapisuje

### 6.4 Irregular

- `irregular_verbs`, `user_irregular_verbs`, `irregular_verb_runs`

### 6.5 Profil / gamifikacja

- `profiles`, `user_streaks`, `xp_events`, `user_badges`

### 6.6 Lekcje / kursy

- `lessons`, `student_lessons`, `lesson_vocab_items`, `lesson_assignments`, `lesson_notes`
- `courses`

---

## 7. Istniejące raporty audytowe

| Plik | Zakres |
|------|--------|
| `AUDIT_SUMMARY.md` | Podsumowanie audytu 2025-01, zmiany, stan |
| `CO_TRENOWAC_AUDIT.md` | System „Co trenować” |
| `COACH_SYSTEM_AUDIT.md` | GlobalCoach, GlobalTrainingSuggestion, Coach gramatyki |
| `CLUSTERS_MODULE_AUDIT_REPORT.md` | Moduł clusterów |
| `GRAMMAR_MODULE_AUDIT_REPORT.md` | Moduł gramatyki |
| `IRREGULAR_VERBS_TECHNICAL_AUDIT.md` | Czasowniki nieregularne |
| `LESSONS_MODULE_AUDIT_REPORT.md` | Lekcje (tutoring + vocab) |
| `PROFILE_LEARNED_TO_LEARN_AUDIT.md` | Profil, learned/to_learn |
| `PROFILE_TRAINING_SUBSCRIPTION_AUDIT.md` | subscribeTrainingCompleted |
| `VOCAB_DB_AUDIT_REPORT.md` | Schemat bazy vocab |

---

## 8. Rekomendacje – uporządkowanie

### 8.1 Niski wysiłek

1. **Usunąć lub zdeprecjonować nieużywane API routes** – np. `/api/app/suggestion`, `/api/irregular-verbs/toggle`, `/api/irregular-verbs/list` (jeśli SSR wystarcza).
2. **Podłączyć GlobalTrainingSuggestion do intelligent-suggestions-v2** – aby „Co trenować” reagowało na postęp użytkownika.
3. **Oznaczyć narzędzia dev** – `run-migration`, `check-migration`, `clear-cache` – np. guardem `NODE_ENV` lub osobnym route group.

### 8.2 Średni wysiłek

1. **Ujednolicenie vocab** – migracja z `global_vocab_items`/`user_vocab` na `user_vocab_items` i usunięcie pool/add-to-pool API.
2. **Odświeżanie materialized views** – cron (pg_cron) dla `refresh_intelligent_suggestion_views()`.
3. **Integracja irregular z user_learning_unit_knowledge** – wywołanie `updateLearningUnitKnowledge` w complete route.

### 8.3 Wysoki wysiłek

1. **Paywall w UI** – wykorzystanie Stripe (checkout już jest).
2. **Refaktor auth w API** – wspólna funkcja `verifyJWT(req)` zamiast duplikacji.
3. **Error handling** – zamiana `alert()` na UI error states, error boundaries.

---

## 9. Szybki start dla nowego developera

1. **Klonowanie i uruchomienie:** `npm install`, `npm run dev` – wymagane zmienne: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`.
2. **Struktura:** Panel ucznia = `app/app/`, API = `app/api/`.
3. **Auth:** Wszystkie API routes wymagają `Authorization: Bearer <token>`.
4. **Baza:** Supabase – migracje w `supabase/migrations/`.
5. **Dokumentacja:** Raporty `*_AUDIT*.md` w root projektu.

---

**Koniec audytu.**
