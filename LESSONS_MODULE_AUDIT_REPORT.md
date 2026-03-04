# Lessons Module — Structural Audit Report

**Date:** 2026-03-02  
**Purpose:** Full structural audit before extending the Lessons system (e.g. Lessons Calendar).  
**Scope:** Database schema, API endpoints, frontend, vocabulary integration, data flow, risks.

---

## STEP 1 — DATABASE STRUCTURE

### Tables analyzed

#### 1. `lessons` (tutoring sessions)

**Purpose:** Represents 1:1 tutoring sessions between teacher and student. Stores lesson metadata (date, topic, summary). Also used for **course video lessons** when `course_id` is set (polymorphic table).

**Columns:**
| Column       | Type         | Nullable | Notes                                      |
|-------------|--------------|----------|--------------------------------------------|
| id          | uuid         | NOT NULL | PK, default gen_random_uuid()              |
| student_id  | uuid         | NOT NULL | FK → profiles(id) ON DELETE CASCADE        |
| created_by  | uuid         | NOT NULL | FK → profiles(id) ON DELETE CASCADE        |
| lesson_date | date         | NOT NULL | Date of the lesson                         |
| topic       | text         | NOT NULL | Lesson topic                               |
| summary     | text         | NULL     | Optional summary                           |
| created_at  | timestamptz  | NOT NULL | default now()                              |
| updated_at  | timestamptz  | NOT NULL | default now()                              |

**Note:** Course lessons use `course_id`, `title`, `slug`, `position`, `video_url`, `content`, `is_published`, `is_free_preview` (added by other migrations). The table is polymorphic.

**Primary key:** `id`  
**Foreign keys:** `student_id` → profiles(id), `created_by` → profiles(id)  
**Indexes:** `idx_lessons_student_date` on (student_id, lesson_date desc)  
**RLS:** Yes — student sees own, admin sees all

---

#### 2. `student_lessons` (vocab lesson collections)

**Purpose:** Personal vocabulary lesson collections. Students group words from their pool into "lessons" (e.g. by date or topic). Used by vocab/lesson UI and `lesson_vocab_items`.

**Columns (inferred from usage):**
| Column      | Type        | Nullable | Notes                          |
|-------------|-------------|----------|--------------------------------|
| id          | uuid        | NOT NULL | PK                             |
| student_id  | uuid        | NOT NULL | FK → profiles(id)              |
| lesson_date | date        |          | yyyy-mm-dd                     |
| title       | text        |          | Lesson title                   |
| notes       | text        | NULL     | Optional notes                 |

**Primary key:** `id`  
**Foreign keys:** `student_id` → profiles(id)  
**Indexes:** Not defined in migrations in repo  
**RLS:** Inferred from `lesson_vocab_items` policies (student sees own via student_id)

**Critical:** `student_lessons` is **not created in any migration in this repository**. It is referenced by `lesson_vocab_items` (FK) and by `20250223_migrate_vocab_data.sql` (via `student_lesson_vocab`). It must exist from a pre-existing migration or manual setup.

---

#### 3. `lesson_notes`

**Purpose:** Notes attached to tutoring lessons (`lessons`). Supports multi-author (student vs admin) notes.

**Columns:**
| Column     | Type        | Nullable | Notes                                      |
|------------|-------------|----------|--------------------------------------------|
| id         | uuid        | NOT NULL | PK, default gen_random_uuid()               |
| lesson_id  | uuid        | NOT NULL | FK → lessons(id) ON DELETE CASCADE         |
| author_id  | uuid        | NOT NULL | FK → profiles(id) ON DELETE CASCADE        |
| author_role| text        | NOT NULL | CHECK IN ('student', 'admin')              |
| content    | text        | NOT NULL | Note content                               |
| created_at | timestamptz | NOT NULL | default now()                              |

**Primary key:** `id`  
**Foreign keys:** `lesson_id` → lessons(id), `author_id` → profiles(id)  
**Indexes:** `idx_lesson_notes_lesson_created` on (lesson_id, created_at desc)  
**RLS:** Yes — via lesson ownership

---

#### 4. `lesson_vocab_items`

**Purpose:** Pins `user_vocab_items` to vocab lessons (`student_lessons`). Does not create words; links existing pool items to a lesson.

**Columns:**
| Column             | Type        | Nullable | Notes                                      |
|--------------------|-------------|----------|--------------------------------------------|
| id                 | uuid        | NOT NULL | PK, default gen_random_uuid()               |
| student_lesson_id  | uuid        | NOT NULL | FK → student_lessons(id) ON DELETE CASCADE |
| user_vocab_item_id | uuid        | NOT NULL | FK → user_vocab_items(id) ON DELETE CASCADE|
| created_at        | timestamptz | NOT NULL | default now()                              |

**Primary key:** `id`  
**Foreign keys:** `student_lesson_id` → student_lessons(id), `user_vocab_item_id` → user_vocab_items(id)  
**Unique constraint:** `lesson_vocab_items_unique` on (student_lesson_id, user_vocab_item_id)  
**Indexes:** idx_lesson_vocab_items_lesson_id, idx_lesson_vocab_items_vocab_item_id, idx_lesson_vocab_items_created_at  
**RLS:** Yes — student sees own via student_lessons.student_id

---

#### 5. `lesson_assignments`

**Purpose:** Homework assignments attached to tutoring lessons (`lessons`). Links to pack, cluster, or irregular verb exercises.

**Columns:**
| Column                 | Type        | Nullable | Notes                                      |
|------------------------|-------------|----------|--------------------------------------------|
| id                     | uuid        | NOT NULL | PK, default gen_random_uuid()               |
| lesson_id              | uuid        | NOT NULL | FK → lessons(id) ON DELETE CASCADE         |
| exercise_type          | text        | NOT NULL | CHECK IN ('pack', 'cluster', 'irregular')  |
| context_slug           | text        | NOT NULL | e.g. pack slug, cluster slug               |
| params                 | jsonb       | NOT NULL | default '{}'                               |
| due_date               | date        | NULL     | Optional due date                          |
| status                 | text        | NOT NULL | CHECK IN ('assigned', 'done', 'skipped'), default 'assigned' |
| completed_session_id   | text        | NULL     | Session ID when marked done                |
| completed_at           | timestamptz | NULL     | When completed                            |
| created_at             | timestamptz | NOT NULL | default now()                              |

**Primary key:** `id`  
**Foreign keys:** `lesson_id` → lessons(id)  
**Indexes:** `idx_lesson_assignments_lesson_status` on (lesson_id, status)  
**RLS:** Yes — via lesson ownership

---

#### 6. `student_lesson_vocab` (legacy)

**Purpose:** Legacy join table linking old `vocab_items` to `student_lessons`. Used only in migration `20250223_migrate_vocab_data.sql` to migrate data to `lesson_vocab_items`. **Not used by application code.**

**Columns (from migration):** `student_lesson_id`, `vocab_item_id`, `created_at`

---

#### 7. `student_lesson_global_vocab`

**Purpose:** **Not used anywhere in the codebase.** No references found. Likely deprecated or planned but never implemented.

---

### Architecture diagram

```
profiles
   │
   ├── lessons (tutoring: student_id, created_by, lesson_date, topic, summary)
   │      ├── lesson_notes (author_id, author_role, content)
   │      └── lesson_assignments (exercise_type, context_slug, status, completed_session_id)
   │
   └── student_lessons (vocab collections: lesson_date, title, notes)
          └── lesson_vocab_items
                 └── user_vocab_items
                        └── lexicon_senses (optional)
```

**Separate branch (courses):**
```
courses
   └── lessons (course_id set: title, slug, video_url, content, is_published)
```

---

## STEP 2 — API ENDPOINTS

### Lessons (tutoring)

| Route | Method | Purpose | Tables |
|-------|--------|---------|--------|
| `/api/lessons` | GET | List lessons for student (or admin with student_id param) | lessons, lesson_assignments |
| `/api/lessons` | POST | Create tutoring lesson | lessons |
| `/api/lessons/[id]` | GET | Get lesson with notes and assignments | lessons, lesson_notes, lesson_assignments |
| `/api/lessons/[id]` | PATCH | Update lesson (topic, date, summary) | lessons |
| `/api/lessons/[id]/notes` | POST | Add note to lesson | lesson_notes |
| `/api/lessons/[id]/assignments` | POST | Create assignment | lesson_assignments |
| `/api/lessons/assignments/[assignmentId]` | PATCH | Update assignment (status, due_date, params) | lesson_assignments |
| `/api/lessons/assignments/[assignmentId]/complete` | POST | Mark assignment done (links to exercise_session_completions) | lesson_assignments, exercise_session_completions |

### Vocabulary (student_lessons)

| Route | Method | Purpose | Tables |
|-------|--------|---------|--------|
| `/api/vocab/add-word` | POST | Add sense to pool; optionally pin to lesson (lesson_id) | user_vocab_items, lesson_vocab_items |
| `/api/vocab/delete-lesson` | DELETE | Delete vocab lesson (student_lessons) | student_lessons |
| `/api/vocab/delete-word` | DELETE | Remove word from pool | user_vocab_items |
| `/api/vocab/load-test-items` | POST | Load test items from pool or lesson | lesson_vocab_items, user_vocab_items |

**Note:** There is **no API to create `student_lessons`** in the repository. The vocab/lesson page assumes a lesson already exists (loads by ID from URL).

---

## STEP 3 — FRONTEND STRUCTURE

### Tutoring lessons (`/app/lessons`)

| Page | Path | Purpose | API calls | Components |
|------|------|---------|-----------|------------|
| Lessons hub | `/app/lessons` | Hub with links to list and "Historia zajęć" | None | Static tiles |
| Lessons list | `/app/lessons/list` | List lessons, create new, open detail | GET/POST `/api/lessons` | Form, list |
| Lesson detail | `/app/lessons/[id]` | Edit lesson, notes, assignments | GET/PATCH `/api/lessons/[id]`, POST notes, POST/PATCH assignments | Forms, assignment links |

### Vocab lessons (`/app/vocab/lesson`)

| Page | Path | Purpose | API / Supabase | Components |
|------|------|---------|----------------|------------|
| Vocab lesson | `/app/vocab/lesson/[id]` | View/edit vocab lesson, add words, run test | Supabase: student_lessons, lesson_vocab_items, user_vocab_items; API: add-word, delete-word | SenseSelectionModal, word list, test redirect |

**Navigation to vocab lesson:** No in-app link to create or list vocab lessons was found. User reaches `/app/vocab/lesson/[id]` only if they have a direct URL (e.g. from bookmark or external link).

### Course lessons (separate)

| Page | Path | Purpose |
|------|------|---------|
| Course page | `/courses/[slug]` | List course lessons (from `lessons` where course_id = course.id) |
| Lesson page | `/courses/[slug]/lessons/[lessonSlug]` | Video/content lesson |

---

## STEP 4 — VOCABULARY INTEGRATION

### `lesson_vocab_items`

- **Usage:** Pins `user_vocab_items` to `student_lessons`.
- **Flow:** User adds word via SenseSelectionModal → `add-word` API (with optional `lesson_id`) → inserts into `user_vocab_items` and `lesson_vocab_items`.
- **Vocab lesson page:** Loads words via Supabase join: `lesson_vocab_items` → `user_vocab_items` → `lexicon_senses` / custom fields.

### `student_lesson_vocab`

- **Usage:** Legacy table. Only referenced in migration script. Application uses `lesson_vocab_items` instead.

### Do lessons add words to `user_vocab_items`?

- **Tutoring lessons (`lessons`):** No. They use `lesson_assignments` to point to pack/cluster/irregular exercises. No direct vocab link.
- **Vocab lessons (`student_lessons`):** Words are added to `user_vocab_items` first (pool), then pinned via `lesson_vocab_items`. Adding a word to a lesson can create a new `user_vocab_item` if it does not exist.

---

## STEP 5 — DATA FLOW

### Tutoring lesson lifecycle

```
1. Admin/student creates lesson
   → POST /api/lessons
   → INSERT into lessons (student_id, created_by, lesson_date, topic, summary)

2. Notes added
   → POST /api/lessons/[id]/notes
   → INSERT into lesson_notes (lesson_id, author_id, author_role, content)

3. Assignments created
   → POST /api/lessons/[id]/assignments
   → INSERT into lesson_assignments (lesson_id, exercise_type, context_slug, params, due_date)

4. Student completes exercise
   → User does pack/cluster/irregular
   → exercise_session_completions inserted
   → POST /api/lessons/assignments/[id]/complete
   → UPDATE lesson_assignments SET status='done', completed_session_id, completed_at
```

### Vocab lesson lifecycle

```
1. student_lessons record created
   → No API in repo. Must exist from elsewhere (legacy UI or manual).

2. User adds words
   → SenseSelectionModal or custom word
   → POST /api/vocab/add-word (with lesson_id) OR direct Supabase insert to user_vocab_items + lesson_vocab_items
   → user_vocab_items (new or existing)
   → lesson_vocab_items (student_lesson_id, user_vocab_item_id)

3. User runs test
   → Select words in lesson → "Stwórz test"
   → Navigate to /app/vocab/test?source=lesson&lessonId=X&selectedIds=...
   → POST /api/vocab/load-test-items
   → loadTestItems() reads lesson_vocab_items → user_vocab_items → lexicon
```

---

## STEP 6 — RISKS

### 1. Duplicated / overlapping lesson concepts

- **`lessons`** — tutoring sessions (date, topic, notes, assignments).
- **`student_lessons`** — vocab collections (date, title, notes, pinned words).
- **`lessons` (course_id)** — video lessons in courses.

Three different concepts share the name "lesson". Calendar or history features must clearly distinguish tutoring vs vocab vs course lessons.

### 2. `student_lessons` not in migrations

- `student_lessons` is required by `lesson_vocab_items` but has no `CREATE TABLE` in the repo.
- Risk of schema drift, deployment issues, or missing table in new environments.

### 3. No API to create vocab lessons

- `/app/vocab/lesson/[id]` assumes the lesson exists.
- No endpoint or UI to create `student_lessons`.
- Vocab lessons may be orphaned or created only by legacy/out-of-repo code.

### 4. Unused / legacy tables

- `student_lesson_vocab` — legacy, only in migration.
- `student_lesson_global_vocab` — not referenced in code.

### 5. Polymorphic `lessons` table

- Same table for tutoring (student_id, lesson_date, topic) and course lessons (course_id, title, slug, video_url).
- Queries must filter by `student_id IS NOT NULL` vs `course_id IS NOT NULL` to avoid mixing types.

### 6. No link between tutoring and vocab lessons

- Tutoring lessons and vocab lessons are independent.
- Assignments point to packs/clusters/irregular, not to vocab lessons.
- A "lessons calendar" would need to decide whether to show one or both.

---

## STEP 7 — SUMMARY

### 1. What the lessons system currently does

- **Tutoring lessons:** Create/list/edit lessons with date, topic, summary; add notes; create assignments (pack/cluster/irregular); mark assignments done via `exercise_session_completions`.
- **Vocab lessons:** View vocab lessons, pin words from pool, run tests. No create/list API in repo.
- **Course lessons:** Video lessons in courses (admin-created, different use case).

### 2. Which table should represent "real lesson history"

- **Tutoring history:** `lessons` (with `student_id` set) + `lesson_notes` + `lesson_assignments`.
- **Vocab history:** `student_lessons` + `lesson_vocab_items` (if vocab lessons are part of the product).

### 3. Which tables should NOT be modified

- `lesson_notes` — stable, used by tutoring.
- `lesson_assignments` — stable, used by tutoring and completion flow.
- `lesson_vocab_items` — stable, used by vocab UI and add-word.
- `user_vocab_items` — core vocab pool, used widely.

### 4. Which tables are safe to extend

- **`lessons`** — Safe to add columns (e.g. `start_time`, `end_time`, `recurrence`) for calendar. Ensure filters for `student_id` vs `course_id` remain correct.
- **`student_lessons`** — Safe to extend if schema is brought under migration control. Add creation API and list UI before relying on it for calendar.

---

**READY FOR LESSONS CALENDAR IMPLEMENTATION**
