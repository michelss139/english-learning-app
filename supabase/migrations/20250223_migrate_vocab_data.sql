-- Migration: Migrate existing vocab data to new model
-- Date: 2025-02-23
--
-- This migration:
-- 1. Migrates vocab_items from lessons to user_vocab_items (custom, unverified)
-- 2. Creates lesson_vocab_items links
-- 3. Is idempotent (can be run multiple times safely)

-- Helper function to normalize lemma
CREATE OR REPLACE FUNCTION norm_lemma(lemma text) RETURNS text AS $$
  SELECT lower(trim(lemma));
$$ LANGUAGE SQL IMMUTABLE;

-- Step 1: Migrate vocab_items to user_vocab_items (custom words)
-- Only migrate items that are linked to lessons (via student_lesson_vocab)
-- Skip items that are already migrated (check by custom_lemma match)

INSERT INTO user_vocab_items (
  student_id,
  sense_id,
  notes,
  status,
  source,
  verified,
  custom_lemma,
  custom_translation_pl,
  created_at,
  updated_at
)
SELECT DISTINCT ON (vi.student_id, norm_lemma(vi.term_en))
  vi.student_id,
  NULL as sense_id, -- custom words have no sense_id
  NULL as notes,
  NULL as status,
  'custom' as source,
  false as verified,
  norm_lemma(vi.term_en) as custom_lemma,
  vi.translation_pl as custom_translation_pl,
  vi.created_at,
  vi.updated_at
FROM vocab_items vi
INNER JOIN student_lesson_vocab slv ON slv.vocab_item_id = vi.id
WHERE NOT EXISTS (
  -- Skip if already migrated (same student + normalized lemma)
  SELECT 1
  FROM user_vocab_items uvi
  WHERE uvi.student_id = vi.student_id
    AND uvi.custom_lemma = norm_lemma(vi.term_en)
    AND uvi.source = 'custom'
)
ON CONFLICT DO NOTHING;

-- Step 2: Create lesson_vocab_items links
-- Link existing lessons to migrated user_vocab_items

INSERT INTO lesson_vocab_items (
  student_lesson_id,
  user_vocab_item_id,
  created_at
)
SELECT DISTINCT
  slv.student_lesson_id,
  uvi.id as user_vocab_item_id,
  slv.created_at
FROM student_lesson_vocab slv
INNER JOIN vocab_items vi ON vi.id = slv.vocab_item_id
INNER JOIN user_vocab_items uvi ON 
  uvi.student_id = vi.student_id
  AND uvi.custom_lemma = norm_lemma(vi.term_en)
  AND uvi.source = 'custom'
WHERE NOT EXISTS (
  -- Skip if link already exists
  SELECT 1
  FROM lesson_vocab_items lvi
  WHERE lvi.student_lesson_id = slv.student_lesson_id
    AND lvi.user_vocab_item_id = uvi.id
)
ON CONFLICT (student_lesson_id, user_vocab_item_id) DO NOTHING;

-- Step 3: Also migrate personal vocab_items (is_personal = true) that are NOT in lessons
-- These are standalone personal words

INSERT INTO user_vocab_items (
  student_id,
  sense_id,
  notes,
  status,
  source,
  verified,
  custom_lemma,
  custom_translation_pl,
  created_at,
  updated_at
)
SELECT DISTINCT ON (vi.student_id, norm_lemma(vi.term_en))
  vi.student_id,
  NULL as sense_id,
  NULL as notes,
  NULL as status,
  'custom' as source,
  false as verified,
  norm_lemma(vi.term_en) as custom_lemma,
  vi.translation_pl as custom_translation_pl,
  vi.created_at,
  vi.updated_at
FROM vocab_items vi
WHERE vi.is_personal = true
  AND NOT EXISTS (
    -- Skip if already in a lesson (already migrated above)
    SELECT 1
    FROM student_lesson_vocab slv
    WHERE slv.vocab_item_id = vi.id
  )
  AND NOT EXISTS (
    -- Skip if already migrated
    SELECT 1
    FROM user_vocab_items uvi
    WHERE uvi.student_id = vi.student_id
      AND uvi.custom_lemma = norm_lemma(vi.term_en)
      AND uvi.source = 'custom'
  )
ON CONFLICT DO NOTHING;

-- Cleanup: Drop helper function (optional, can keep for future use)
-- DROP FUNCTION IF EXISTS norm_lemma(text);

-- Note: This migration does NOT delete old vocab_items or student_lesson_vocab
-- They can be kept for reference or deleted manually after verification
