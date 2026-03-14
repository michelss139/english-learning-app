# Grammar Module — Full Architectural Audit

**Date:** 2026-03-02  
**Scope:** Analysis only — no code changes.

---

## STEP 1 — FILE STRUCTURE

### app/app/grammar

```
app/app/grammar
├── page.tsx                    # Hub: links to Irregular Verbs, Czasy, Stative Verbs
├── tenses
│   └── page.tsx                # List of all 12 tenses (from content.ts)
├── compare
│   ├── page.tsx
│   └── GrammarCompareClient.tsx
├── stative-verbs
│   └── page.tsx
├── _components
│   └── GrammarPracticeClient.tsx   # Shared MC practice UI
├── present-simple
│   ├── page.tsx
│   ├── PresentSimpleClient.tsx
│   ├── Coach.tsx
│   └── practice
│       ├── page.tsx
│       └── PracticeClient.tsx
├── present-continuous
│   ├── page.tsx
│   ├── PresentContinuousClient.tsx
│   ├── Coach.tsx
│   └── practice
│       ├── page.tsx
│       └── PracticeClient.tsx
├── past-simple
│   ├── page.tsx
│   ├── PastSimpleClient.tsx
│   ├── Coach.tsx
│   └── practice
│       ├── page.tsx
│       └── PracticeClient.tsx
├── past-continuous
│   ├── page.tsx
│   └── PastContinuousClient.tsx
├── past-perfect
│   ├── page.tsx
│   └── PastPerfectClient.tsx
├── past-perfect-continuous
│   ├── page.tsx
│   └── PastPerfectContinuousClient.tsx
├── present-perfect
│   ├── page.tsx
│   └── PresentPerfectClient.tsx
├── present-perfect-continuous
│   ├── page.tsx
│   └── PresentPerfectContinuousClient.tsx
├── future-simple
│   ├── page.tsx
│   └── FutureSimpleClient.tsx
├── future-continuous
│   ├── page.tsx
│   └── FutureContinuousClient.tsx
├── future-perfect-simple
│   ├── page.tsx
│   └── FuturePerfectSimpleClient.tsx
└── future-perfect-continuous
    ├── page.tsx
    └── FuturePerfectContinuousClient.tsx
```

### lib/grammar

```
lib/grammar
├── types.ts              # GrammarTenseSlug, GrammarTense, GrammarContent
├── content.ts            # grammarContent (12 tenses), getGrammarTenseBySlug, getAllGrammarTenses
├── practice.ts           # grammarPracticeExercises, getGrammarPracticeExercise, getGrammarPracticeQuestion
├── formEngine.ts         # validateGapAnswer (for story-generator fill-in-the-blank)
├── tensePatterns.ts      # validateTenseForm (regex-based structure validation)
├── compare.ts            # getComparison, getComparisonCacheKey
├── TensePageWrapper.tsx   # Unused — renders TensePageContent from content.ts
├── TensePageContent.tsx  # Used by TensePageWrapper (unused)
├── irregularVerbs.ts     # Irregular verb data
├── irregularLoader.ts    # Load irregular forms for formEngine
└── components/          # GlossaryTooltip, ExampleSentence, RelatedTenses, StativeVsAction
```

### app/api/grammar

```
app/api/grammar
├── start
│   └── route.ts          # POST — start session, return questions
├── answer
│   └── route.ts          # POST — validate answer, store result
├── complete
│   └── route.ts          # POST — complete session, award XP
└── ai-dialog
    └── route.ts          # GET/POST — generate/cache AI dialogs
```

---

## STEP 2 — GRAMMAR TOPIC ARCHITECTURE

### Topics: File-Based + Content-Driven

- **Topics are file-based:** Each tense has its own folder under `/app/app/grammar/` (e.g. `present-simple`, `past-simple`).
- **No dynamic `[slug]` route:** There is no catch-all route; each topic is a static folder.
- **Source of truth for tense list:** `lib/grammar/content.ts` defines all 12 tenses in `grammarContent.tenses`.
- **Routing model:**
  - `/app/grammar` → Hub (Irregular Verbs, Czasy, Stative Verbs)
  - `/app/grammar/tenses` → List of tenses (from `getAllGrammarTenses()`)
  - `/app/grammar/[tense-slug]` → Each tense has its own folder, e.g. `present-simple/page.tsx`
  - `/app/grammar/[tense-slug]/practice` → Only present-simple, present-continuous, past-simple have practice subfolders
  - `/app/grammar/compare?tense1=X&tense2=Y` → Comparison page
  - `/app/grammar/stative-verbs` → Standalone topic (not a tense)

### Topic Resolution

- **Slug resolution:** `getGrammarTenseBySlug(slug)` in `content.ts` looks up by slug.
- **Practice resolution:** `getGrammarPracticeExercise(slug)` in `practice.ts` returns questions for a slug; missing slugs return `null` or empty `questions`.

---

## STEP 3 — EXERCISE ENGINE

### Flow: User Clicks "Practice" → Start → Answer → Complete

```
User navigates to /app/grammar/present-simple/practice
         ↓
GrammarPracticeClient mounts
         ↓
POST /api/grammar/start { exercise_slug: "present-simple" }
         ↓
Server: getGrammarPracticeExercise("present-simple")
        → Returns questions from lib/grammar/practice.ts
        → Inserts grammar_sessions row
        → Returns { session_id, questions: [{ id, prompt, options }] }
         ↓
Client shows first question (multiple choice)
         ↓
User selects option → POST /api/grammar/answer { session_id, question_id, selected_option }
         ↓
Server: getGrammarPracticeQuestion(exercise_slug, question_id)
        → Validates selected_option is in question.options
        → Compares selected_option === question.correct_option
        → Inserts grammar_session_answers
        → Returns { is_correct, correct_option }
         ↓
Client shows feedback, "Zakończ" button
         ↓
User clicks Zakończ → POST /api/grammar/complete { session_id }
         ↓
Server: complete_grammar_practice RPC
        → Validates session ownership
        → Inserts exercise_session_completions (idempotent)
        → Returns { answer_count, exercise_slug, inserted }
        → awardXpAndBadges (source: "grammar", dedupeKey: grammar:${slug})
        → updateStreak
         ↓
Client shows XP, link back to map
```

### Exercise Generation

- **Questions are static:** Stored in `lib/grammar/practice.ts` in `grammarPracticeExercises`.
- **No dynamic generation:** Questions are hardcoded per exercise slug.
- **Only 3 exercises have questions:** present-simple (1), present-continuous (1), past-simple (1). All other tenses have `questions: []`.

### Answer Validation

- **Multiple choice only:** Validation is `selected_option === question.correct_option`.
- **No fill-in-the-blank in practice API:** The `formEngine` and `tensePatterns` are used by the **story-generator** (fill-in-the-blank gaps), not by the grammar practice API.

### Session Tracking

- **grammar_sessions:** `id`, `student_id`, `exercise_slug`, `created_at`
- **grammar_session_answers:** `id`, `session_id`, `student_id`, `question_id`, `selected_option`, `is_correct`, `created_at`
- **exercise_session_completions:** Records completion for XP/badges; `exercise_type = 'grammar_practice'`, `exercise_slug` = tense slug.

---

## STEP 4 — DATA STORAGE

| Data | Location | Format |
|------|----------|--------|
| **Tense content (explanations, examples, structure)** | `lib/grammar/content.ts` | In-memory JS object |
| **Practice questions** | `lib/grammar/practice.ts` | In-memory JS object |
| **Correct answers** | `lib/grammar/practice.ts` (per question) | `correct_option` string |
| **Explanations** | `content.ts` (usage, structure, auxiliary, confusionWarnings, commonMistakes) | String fields |
| **Hints** | `content.ts` (chips, characteristicWords) | String / chip array |
| **Sessions** | `grammar_sessions` (Supabase) | DB table |
| **Answers** | `grammar_session_answers` (Supabase) | DB table |
| **Completions** | `exercise_session_completions` (Supabase) | DB table |
| **AI dialogs** | Cached via `ai-dialog` API (storage TBD) | — |

### Database Tables

- **grammar_sessions:** `id`, `student_id`, `exercise_slug`, `created_at`
- **grammar_session_answers:** `id`, `session_id`, `student_id`, `question_id`, `selected_option`, `is_correct`, `created_at`
- **exercise_session_completions:** Used for XP/badges; `exercise_type = 'grammar_practice'`, `exercise_slug`

---

## STEP 5 — CONTENT MODEL

### Per-Tense Structure (from content.ts)

```
present-simple (example)
├── usage              (explanation)
├── characteristicWords
├── structure
│   ├── affirmative
│   ├── negative
│   └── question
├── auxiliary
├── confusionWarnings
├── commonMistakes
├── examples
├── dialog
├── chips[]            (characteristic words)
├── relatedLinks[]
├── comparisons[]
├── practiceLink       → /app/exercises/present-simple (broken — route does not exist)
└── courseLink        → /app/courses/present-simple
```

### Where Content Lives

| Content | Location |
|---------|----------|
| **Explanations** | `content.ts` (usage, structure, auxiliary, etc.) — used by TensePageContent, compare |
| **Examples** | `content.ts` (examples, dialog) |
| **Exercises** | `practice.ts` (questions) — only 3 tenses have any |
| **Tense pages** | Custom Client components (PresentSimpleClient, etc.) — **duplicate** content: each has hardcoded DefinitionContent, ConstructionContent, etc. |
| **content.ts** | Used by: tenses list, compare page, TensePageContent (which is unused) |

### Duplication

- **content.ts** has full structured content for all 12 tenses.
- **TensePageWrapper + TensePageContent** would render that content but are **never used**.
- **Custom Client components** (PresentSimpleClient, PresentContinuousClient, etc.) each have their own hardcoded sections (DefinitionContent, ConstructionContent, etc.) — **duplicating** the same information in a different format.

---

## STEP 6 — KNOWLEDGE TRACKING

### Does Grammar Contribute to user_learning_unit_knowledge?

**No.**

- `lib/knowledge/updateLearningUnitKnowledge.ts` defines `LearningUnitType = "sense" | "cluster" | "irregular"`.
- There is no `"grammar"` unit type.
- Grammar practice does **not** call `updateLearningUnitKnowledge`.
- Grammar completions are recorded in `exercise_session_completions` and used for **XP/badges/streaks** only, not for knowledge state.

### Why Not?

- The knowledge engine tracks vocabulary (senses, clusters) and irregular verbs.
- Grammar topics (tenses) are conceptual, not per-word; they don't map to `unit_id` in the same way.
- Adding grammar to knowledge would require a new `unit_type` (e.g. `"grammar"`) and `unit_id` = tense slug.

---

## STEP 7 — QUESTION TYPES

### Supported in Grammar Practice API

| Type | Implemented | Location |
|------|-------------|----------|
| **Multiple choice** | Yes | `GrammarPracticeClient.tsx`, `practice.ts` |

### Other Question Types (Elsewhere)

| Type | Used By | Location |
|------|---------|----------|
| **Fill in the blank** | Story generator | `app/api/story-generator/route.ts` — uses `formEngine.validateGapAnswer` |
| **Verb form validation** | formEngine | `lib/grammar/formEngine.ts` — validates structure + irregular verbs |

### Summary

- **Grammar practice API:** Only multiple choice.
- **Story generator:** Fill-in-the-blank with `formEngine` (tense + base verb + correct answer + irregular map).

---

## STEP 8 — EXTENSIBILITY

### Adding a New Topic: Gerund, Conditionals, Modal Verbs

These are **non-tense** topics. Current architecture is tense-centric.

#### Required Structure

1. **lib/grammar/types.ts**
   - Extend `GrammarTenseSlug` or introduce a separate type (e.g. `GrammarTopicSlug`) to include `"gerund"`, `"conditionals"`, `"modal-verbs"`.

2. **lib/grammar/content.ts**
   - Add entry to `grammarContent.tenses` (or a new `grammarContent.topics`) with slug, title, content (usage, structure, examples, etc.).

3. **lib/grammar/practice.ts**
   - Add entry to `grammarPracticeExercises` with slug, title, questions array.

4. **app/app/grammar/[topic]/**
   - Create folder, e.g. `gerund/`:
     - `page.tsx` → renders `GerundClient` (or reuse a generic wrapper if one exists)
     - `GerundClient.tsx` → explanation + link to practice
     - `practice/page.tsx` → renders `GrammarPracticeClient` with `exerciseSlug="gerund"`
     - `practice/PracticeClient.tsx` → wraps `GrammarPracticeClient` with slug and labels

5. **app/app/grammar/page.tsx** (Hub)
   - Add tile for new topic if it should appear on the hub.

6. **app/app/grammar/tenses/page.tsx**
   - If the topic is a "tense-like" item, add to the list; otherwise it may live only under the hub or a new section.

7. **API**
   - No changes needed: `start`, `answer`, `complete` already accept any `exercise_slug` and look it up in `practice.ts`.

#### FormEngine / TensePatterns

- **formEngine** and **tensePatterns** are tense-specific (verb forms: present-simple, past-simple, etc.).
- Gerund, conditionals, modals would need **new validation logic** if you add fill-in-the-blank exercises for them (e.g. in story generator or a new exercise type).

---

## STEP 9 — PROBLEMS

### Architectural Issues

1. **Broken practice links in content.ts**
   - `practiceLink: "/app/exercises/present-simple"` — `/app/exercises/` does not exist.
   - Actual practice routes: `/app/grammar/present-simple/practice`.

2. **Duplicate content**
   - `content.ts` has full structured content for all 12 tenses.
   - Custom Client components (PresentSimpleClient, etc.) duplicate explanations in hardcoded JSX.
   - `TensePageWrapper` + `TensePageContent` would use `content.ts` but are **unused** (dead code).

3. **Hardcoded topics**
   - `GrammarTenseSlug` is a union type; adding a topic requires a type change.
   - `grammarPracticeExercises` is a `Record<GrammarTenseSlug, ...>` — must add every slug even if `questions: []`.

4. **Sparse practice**
   - Only 3 tenses have practice questions (1 each for present-simple, present-continuous, past-simple).
   - 9 tenses have `questions: []` — practice UI will fail with "Brak pytań".

5. **Inconsistent exercise formats**
   - Practice API: multiple choice only.
   - Story generator: fill-in-the-blank with `formEngine`.
   - No shared abstraction for "grammar exercise type".

6. **Two validation engines**
   - `formEngine.validateGapAnswer` — used by story generator.
   - `tensePatterns.validateTenseForm` — referenced in tests but not in main flows.
   - Overlap and possible divergence.

7. **Stative verbs as special case**
   - `stative-verbs` has its own page, uses `tense1: "stative-verbs"` in ai-dialog, but is not in `GrammarTenseSlug` or `grammarContent.tenses`.

8. **Unused Coach components**
   - `present-simple/Coach.tsx`, `present-continuous/Coach.tsx`, `past-simple/Coach.tsx` exist but are never imported.

---

## STEP 10 — SUMMARY

### How the Grammar System Works

1. **Hub** (`/app/grammar`) links to Irregular Verbs, Czasy, Stative Verbs.
2. **Czasy** (`/app/grammar/tenses`) lists 12 tenses from `content.ts`.
3. **Each tense** has a folder with a custom Client component (explanation + optional practice link).
4. **Practice** (only 3 tenses) uses `GrammarPracticeClient` → `POST /api/grammar/start` → multiple choice → `answer` → `complete` → XP.
5. **Compare** page shows two tenses side-by-side; data from `content.ts`.
6. **AI dialogs** are generated/cached via `/api/grammar/ai-dialog`.

### Where Content Lives

- **Explanations, examples, structure:** `lib/grammar/content.ts` (and duplicated in custom Clients).
- **Practice questions:** `lib/grammar/practice.ts` (static, 3 tenses only).
- **Sessions/answers:** Supabase (`grammar_sessions`, `grammar_session_answers`, `exercise_session_completions`).

### How Exercises Are Generated

- **Practice:** Static questions from `practice.ts`; no generation.
- **Story generator:** Fill-in-the-blank gaps validated by `formEngine` (tense + base verb + irregular map).

### How to Safely Add New Topics

1. Add slug to types (`GrammarTenseSlug` or new topic type).
2. Add content to `content.ts` (or equivalent).
3. Add practice entry to `practice.ts` (with questions if practice is needed).
4. Create folder `app/app/grammar/[topic]/` with `page.tsx`, Client, and optionally `practice/`.
5. Fix `practiceLink` in content to use `/app/grammar/[topic]/practice`.
6. For fill-in-the-blank: extend `formEngine` or add new validation for the topic.

---

## READY FOR GRAMMAR EXPANSION
