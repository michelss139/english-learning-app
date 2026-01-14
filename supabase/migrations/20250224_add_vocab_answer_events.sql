-- Migration: Add vocab_answer_events table for detailed answer logging
-- Date: 2025-02-24
-- 
-- This table logs every single answer given during a vocab test.
-- Used for analytics, suggestions, and student progress tracking.

-- ============================================
-- TABLE: vocab_answer_events
-- ============================================
create table if not exists vocab_answer_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  test_run_id uuid not null, -- References vocab_test_runs.id (no FK to allow flexibility)
  user_vocab_item_id uuid not null references user_vocab_items(id) on delete cascade,
  question_mode text not null, -- 'en-pl' or 'pl-en'
  prompt text not null, -- term_en (for en-pl) or translation_pl (for pl-en)
  expected text, -- translation_pl (for en-pl) or term_en (for pl-en), nullable
  given text not null, -- what user typed (raw input)
  is_correct boolean, -- nullable: null for skipped/invalid, true/false for evaluated answers
  evaluation text not null, -- 'correct' | 'wrong' | 'skipped' | 'invalid'
  created_at timestamptz not null default now(),
  constraint vocab_answer_events_question_mode_check check (question_mode in ('en-pl', 'pl-en')),
  constraint vocab_answer_events_evaluation_check check (evaluation in ('correct', 'wrong', 'skipped', 'invalid'))
);

create index if not exists idx_vocab_answer_events_student_id on vocab_answer_events(student_id);
create index if not exists idx_vocab_answer_events_test_run_id on vocab_answer_events(test_run_id);
create index if not exists idx_vocab_answer_events_user_vocab_item_id on vocab_answer_events(user_vocab_item_id);
create index if not exists idx_vocab_answer_events_created_at on vocab_answer_events(created_at);
create index if not exists idx_vocab_answer_events_evaluation on vocab_answer_events(evaluation);
create index if not exists idx_vocab_answer_events_is_correct on vocab_answer_events(is_correct);

-- ============================================
-- UPDATE: vocab_test_runs (add test_run_id field)
-- ============================================
-- Note: vocab_test_runs already has 'id' field, we'll use it as test_run_id
-- But we'll add a comment to clarify and ensure mode can be 'mixed'

-- Update mode constraint to allow 'mixed'
alter table if exists vocab_test_runs 
  drop constraint if exists vocab_test_runs_mode_check;

alter table if exists vocab_test_runs
  add constraint vocab_test_runs_mode_check check (mode in ('en-pl', 'pl-en', 'mixed'));

-- Add comment to clarify that id is used as test_run_id in events
comment on column vocab_test_runs.id is 'Used as test_run_id in vocab_answer_events';

-- ============================================
-- RLS POLICIES
-- ============================================

alter table vocab_answer_events enable row level security;

-- Student can select/insert only own events
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_answer_events' and policyname = 'Vocab answer events: student select own'
  ) then
    create policy "Vocab answer events: student select own"
      on vocab_answer_events
      for select
      using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_answer_events' and policyname = 'Vocab answer events: student insert own'
  ) then
    create policy "Vocab answer events: student insert own"
      on vocab_answer_events
      for insert
      with check (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_answer_events' and policyname = 'Vocab answer events: admin select all'
  ) then
    create policy "Vocab answer events: admin select all"
      on vocab_answer_events
      for select
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_answer_events' and policyname = 'Vocab answer events: admin manage all'
  ) then
    create policy "Vocab answer events: admin manage all"
      on vocab_answer_events
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end
$$;
