-- Migration: Add 'grammar' question_mode for vocab_answer_events
-- Date: 2026-03-18
--
-- Enables grammar practice answers to be logged in vocab_answer_events
-- with context_type='grammar' and context_id=slug.

begin;

alter table public.vocab_answer_events
  drop constraint if exists vocab_answer_events_question_mode_check;

alter table public.vocab_answer_events
  add constraint vocab_answer_events_question_mode_check
  check (question_mode in (
    'en-pl',
    'pl-en',
    'cluster-choice',
    'cluster-correction',
    'cluster-translation',
    'grammar'
  ));

commit;
