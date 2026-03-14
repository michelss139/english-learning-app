# Clusters Module — Full Architectural Audit

**Date:** 2026-03-06  
**Scope:** Analysis only — no code changes.

---

## STEP 1 — FILE STRUCTURE

### app/app/vocab

```
app/app/vocab
├── page.tsx                    # Hub: Moja pula, Fiszki, Typowe błędy (clusters)
├── ClustersSection.tsx         # ⚠️ UNUSED — fetches from API, never imported
├── clusters
│   ├── page.tsx                # Lista clusterów (SSR, Supabase direct)
│   ├── ClustersClient.tsx       # UI: recommended/unlockable, pin toggle
│   └── cluster
│       └── [slug]
│           ├── page.tsx        # Cluster detail (SSR, Supabase direct)
│           └── ClusterClient.tsx # MC practice UI, answer flow, XP award
```

### app/api/vocab/clusters

```
app/api/vocab/clusters
├── route.ts                    # GET — list clusters + unlock status
├── pin
│   └── route.ts                # POST — toggle pin (profiles.notes)
├── [slug]
│   ├── questions
│   │   └── route.ts            # GET — questions (⚠️ no correct_choice in response)
│   │                          # POST — log answer, update knowledge
│   └── complete
│       └── route.ts           # POST — award XP, update streak, session completion
```

### lib/vocab

```
lib/vocab
├── clusterQualityGates.ts     # Quality gates for cluster-choice (evaluateExample, tokenizeWords)
├── clusterQualityGates.test.ts # Ad-hoc tests (not Vitest)
└── pinnedClusters.ts          # parsePinnedClusterSlugs, writePinnedClusterSlugs (profiles.notes)
```

---

## STEP 2 — DATABASE SCHEMA

### Tables

| Table | Purpose |
|-------|---------|
| `vocab_clusters` | id, slug, title, is_recommended, is_unlockable |
| `vocab_cluster_entries` | cluster_id, entry_id (FK → lexicon_entries), id (surrogate for FK) |
| `vocab_cluster_questions` | cluster_id, prompt, slot, choices, correct_choice, correct_entry_id (FK → vocab_cluster_entries), explanation, last_used_at |
| `user_unlocked_vocab_clusters` | student_id, cluster_id, unlocked_at |

**Note:** `vocab_cluster_questions` is modified in `20260122_add_vocab_cluster_questions.sql` but the table creation is not in the repo. It may have been created elsewhere or manually.

### vocab_answer_events

- `context_type: "vocab_cluster"`, `context_id: slug`
- `question_mode: "cluster-choice"`
- `user_vocab_item_id`, `test_run_id` nullable for cluster practice

### Materialized views (intelligent suggestions)

- `mv_user_cluster_accuracy` — student_id, cluster_slug, total_answers, correct_answers, accuracy

---

## STEP 3 — DATA FLOW

### Unlock logic

1. **Recommended** (`is_recommended=true`): always unlocked, no DB record.
2. **Unlockable** (`is_unlockable=true`): unlocked when user has all `vocab_cluster_entries.entry_id` in their pool (via `user_vocab_items` → `lexicon_senses.entry_id`).
3. Unlock record: `user_unlocked_vocab_clusters` (inserted when criteria met).
4. Unlock check: duplicated in `page.tsx` (SSR), API `route.ts`, API `questions/route.ts`.

### Questions flow

1. **Page load:** `cluster/[slug]/page.tsx` fetches from Supabase directly (not API):
   - `vocab_cluster_questions` with `correct_choice` included.
   - Orders by `last_used_at` asc, nulls first.
   - Updates `last_used_at` after fetch (best-effort).
2. **Client:** `ClusterClient` receives `initialQuestions` with `correct_choice` for optimistic validation.
3. **Answer:** POST `/api/vocab/clusters/[slug]/questions` — logs to `vocab_answer_events`, calls `updateLearningUnitKnowledge`.
4. **Completion:** POST `/api/vocab/clusters/[slug]/complete` — awards XP, updates streak, `exercise_session_completions`.

### Pinned clusters

- Stored in `profiles.notes` as JSON: `__vocab_pinned_clusters__=["slug1","slug2"]`
- API: POST `/api/vocab/clusters/pin` — toggle by slug.
- Used on clusters list for sort (pinned first).

---

## STEP 4 — INTEGRATIONS

| System | Integration |
|--------|-------------|
| **Lessons** | `exercise_type: "cluster"`, `context_slug` in assignments; completion via `/api/lessons/assignments/[id]/complete` |
| **XP/Badges** | `awardXpAndBadges` with `source: "cluster"`, `sourceSlug: slug` |
| **Streaks** | `updateStreak` on completion |
| **Knowledge** | `updateLearningUnitKnowledge` with `unitType: "cluster"`, `unitId: slug` |
| **Session summary** | `getSessionSummary` for `cluster` |
| **Intelligent suggestions** | `mv_user_cluster_accuracy` (accuracy per cluster) |
| **Training events** | `emitTrainingCompleted({ type: "cluster", slug })` |

---

## STEP 5 — ISSUES & RECOMMENDATIONS

### Critical

1. **API GET questions does not return `correct_choice`**
   - `questionSelect = "id, prompt, slot, choices, explanation, last_used_at"` — missing `correct_choice`.
   - Page uses Supabase direct, so it works. But any consumer of GET `/api/vocab/clusters/[slug]/questions` would fail optimistic validation.
   - **Recommendation:** Add `correct_choice` to API response for consistency.

2. **Duplicate data fetching**
   - Clusters list: `clusters/page.tsx` uses Supabase direct; `ClustersSection` uses API (but ClustersSection is unused).
   - Questions: page uses Supabase; API GET exists but is not used by the app.
   - **Recommendation:** Decide on single source (SSR vs API). If API is for future/mobile, ensure it returns `correct_choice`.

### Medium

3. **Dead code: ClustersSection.tsx**
   - Fetches from `/api/vocab/clusters`, never imported.
   - **Recommendation:** Remove or integrate.

4. **clusterQualityGates not used in runtime**
   - `evaluateExample`, `tokenizeWords`, `buildAcceptedFormsForLemma` exist but are not called from cluster flow.
   - Used only in `clusterQualityGates.test.ts`.
   - **Recommendation:** Use for validating new questions (admin/seed) or document as future use.

5. **vocab_cluster_questions table creation**
   - Migration `20260122` alters/inserts into `vocab_cluster_questions` but does not create it.
   - **Recommendation:** Add explicit `CREATE TABLE` in migration or document external creation.

### Low

6. **Redundant correct_entry_id**
   - `vocab_cluster_questions` has both `correct_choice` (text) and `correct_entry_id` (FK).
   - Validation uses `correct_choice`; `correct_entry_id` is for FK constraint only.
   - **Recommendation:** Document relationship; consider dropping `correct_entry_id` if not needed for analytics.

7. **Tenses cluster**
   - Placeholder cluster "tenses" with Yes/No question ("Does she works?") — different from typical word-choice clusters.
   - **Recommendation:** Decide if this belongs in clusters or grammar module.

---

## STEP 6 — SEED DATA (current)

| Slug | Title | Type | Questions |
|------|-------|------|-----------|
| make-do | make / do | recommended | 1 |
| get-take | get / take | recommended | 1 |
| say-tell-speak-talk | say / tell / speak / talk | recommended | 1 |
| lend-borrow-rent-hire | lend / borrow / rent / hire | recommended | 1 |
| bring-take | bring / take | recommended | 1 |
| tenses | Czasy – typowe błędy | recommended | 1 (Yes/No) |

**Note:** All 5 vocab clusters are `is_recommended=true`; no unlockable clusters in current seed.

---

## STEP 7 — RLS & SECURITY

- `vocab_clusters`, `vocab_cluster_entries`: authenticated select.
- `user_unlocked_vocab_clusters`: student select/insert own; admin select/manage all.
- `vocab_cluster_questions`: no explicit RLS in migrations; likely inherits from schema.
- Pin API: requires auth; updates own `profiles.notes`.

---

## SUMMARY

| Aspect | Status |
|--------|--------|
| File structure | Clear, one unused component |
| Schema | Solid, minor doc gap (table creation) |
| Unlock logic | Works, duplicated in 3 places |
| Questions flow | Works via SSR; API incomplete |
| Integrations | XP, streaks, lessons, knowledge, suggestions |
| clusterQualityGates | Present but unused in runtime |
| Pinned clusters | Works via profiles.notes |

**Priority fixes:** Add `correct_choice` to API GET questions; remove or integrate `ClustersSection`.
