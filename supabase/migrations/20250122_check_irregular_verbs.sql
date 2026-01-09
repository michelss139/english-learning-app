-- Diagnostic queries for Irregular Verbs module
-- Run these in Supabase SQL Editor to verify everything is correct

-- ============================================
-- 1. Check verb count (should be 100)
-- ============================================
SELECT COUNT(*) as total_verbs FROM irregular_verbs;
-- Expected: 100

-- ============================================
-- 2. Check if all expected verbs are present
-- ============================================
-- List all verbs sorted by base_norm
SELECT base, base_norm, past_simple, past_participle 
FROM irregular_verbs 
ORDER BY base_norm;

-- ============================================
-- 3. Check for duplicates (should be 0)
-- ============================================
SELECT base_norm, COUNT(*) as count 
FROM irregular_verbs 
GROUP BY base_norm 
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)

-- ============================================
-- 4. Check RLS policies exist
-- ============================================
SELECT 
  tablename, 
  policyname, 
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('irregular_verbs', 'user_irregular_verbs', 'irregular_verb_runs')
ORDER BY tablename, policyname;
-- Expected: Multiple policies for each table

-- ============================================
-- 5. Check if tables exist
-- ============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('irregular_verbs', 'user_irregular_verbs', 'irregular_verb_runs')
ORDER BY table_name;
-- Expected: 3 rows

-- ============================================
-- 6. Check indexes exist
-- ============================================
SELECT 
  tablename, 
  indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('irregular_verbs', 'user_irregular_verbs', 'irregular_verb_runs')
ORDER BY tablename, indexname;
-- Expected: Multiple indexes for each table
