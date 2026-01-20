-- Migration: Fix vocab_answer_events nullable columns for cluster practice
-- Date: 2025-02-25
-- 
-- Ensures test_run_id and user_vocab_item_id are nullable
-- and removes foreign key constraint on user_vocab_item_id if it blocks nulls

-- ============================================
-- Ensure test_run_id is nullable
-- ============================================
alter table if exists vocab_answer_events
  alter column test_run_id drop not null;

-- ============================================
-- Ensure user_vocab_item_id is nullable
-- ============================================
-- First, drop the foreign key constraint if it exists
alter table if exists vocab_answer_events
  drop constraint if exists vocab_answer_events_user_vocab_item_id_fkey;

-- Make column nullable
alter table if exists vocab_answer_events
  alter column user_vocab_item_id drop not null;

-- Re-add foreign key constraint but allow nulls
-- (PostgreSQL FK constraints allow nulls by default)
alter table if exists vocab_answer_events
  add constraint vocab_answer_events_user_vocab_item_id_fkey
  foreign key (user_vocab_item_id)
  references user_vocab_items(id)
  on delete cascade;

-- ============================================
-- Ensure context fields exist
-- ============================================
alter table if exists vocab_answer_events
  add column if not exists context_type text,
  add column if not exists context_id text;

-- ============================================
-- Ensure question_mode constraint allows 'cluster-choice'
-- ============================================
alter table if exists vocab_answer_events 
  drop constraint if exists vocab_answer_events_question_mode_check;

alter table if exists vocab_answer_events
  add constraint vocab_answer_events_question_mode_check 
  check (question_mode in ('en-pl', 'pl-en', 'cluster-choice'));

-- ============================================
-- Create index for context fields if not exists
-- ============================================
create index if not exists idx_vocab_answer_events_context 
  on vocab_answer_events(context_type, context_id);
