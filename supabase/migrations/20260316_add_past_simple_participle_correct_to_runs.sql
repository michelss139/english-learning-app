-- Migration: Add per-field correctness tracking to irregular_verb_runs
-- Date: 2026-03-16
-- Notes:
-- - past_simple_correct: true if user's past simple answer was correct
-- - past_participle_correct: true if user's past participle answer was correct
-- - correct remains: true only when both are correct (backward compatibility)
-- - Backfill: existing rows get both new columns set to value of correct
--   (conservative: we don't have per-field data for old rows)

begin;

-- 1) Add new columns WITHOUT default (avoids full table rewrite in Postgres)
alter table public.irregular_verb_runs
  add column if not exists past_simple_correct boolean;

alter table public.irregular_verb_runs
  add column if not exists past_participle_correct boolean;

-- 2) Backfill existing rows
update public.irregular_verb_runs
set
  past_simple_correct = correct,
  past_participle_correct = correct;

-- 3) Set default AFTER backfill
alter table public.irregular_verb_runs
  alter column past_simple_correct set default false;

alter table public.irregular_verb_runs
  alter column past_participle_correct set default false;

-- 4) Enforce NOT NULL
alter table public.irregular_verb_runs
  alter column past_simple_correct set not null;

alter table public.irregular_verb_runs
  alter column past_participle_correct set not null;

commit;
