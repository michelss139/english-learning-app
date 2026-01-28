-- Migration: Create missing v2 views required by 20250227_switch_vocab_views_to_v2
-- Date: 2026-01-22
--
-- Problem: 20250227 creates vocab_* aliases that reference v2_vocab_accuracy_extended
-- and v2_vocab_current_streaks. If 20250226 was never run (or only partially),
-- those views don't exist and 20250227 fails.
--
-- This migration creates only the missing v2 views. Run it BEFORE 20250227.
-- Uses latest definitions: accuracy from rolling-windows, streaks from 20250226.

-- ============================================
-- v2_vocab_accuracy_extended (rolling 24h/3d/7d/14d)
-- ============================================
create or replace view v2_vocab_accuracy_extended as
select
  student_id,
  count(*) filter (where evaluation = 'correct' and created_at >= now() - interval '24 hours') as correct_today,
  count(*) filter (where evaluation in ('correct', 'wrong') and created_at >= now() - interval '24 hours') as total_today,
  count(*) filter (where evaluation = 'correct' and created_at >= now() - interval '3 days') as correct_3d,
  count(*) filter (where evaluation in ('correct', 'wrong') and created_at >= now() - interval '3 days') as total_3d,
  count(*) filter (where evaluation = 'correct' and created_at >= now() - interval '7 days') as correct_7d,
  count(*) filter (where evaluation in ('correct', 'wrong') and created_at >= now() - interval '7 days') as total_7d,
  count(*) filter (where evaluation = 'correct' and created_at >= now() - interval '14 days') as correct_14d,
  count(*) filter (where evaluation in ('correct', 'wrong') and created_at >= now() - interval '14 days') as total_14d
from vocab_answer_events
where evaluation in ('correct', 'wrong')
group by student_id;

-- ============================================
-- v2_vocab_current_streaks
-- ============================================
create or replace view v2_vocab_current_streaks as
with ordered_events as (
  select
    student_id,
    coalesce(
      (select le.lemma from user_vocab_items uvi
       join lexicon_senses ls on ls.id = uvi.sense_id
       join lexicon_entries le on le.id = ls.entry_id
       where uvi.id = vae.user_vocab_item_id),
      lower(trim(vae.expected))
    ) as term_en_norm,
    evaluation,
    created_at,
    row_number() over (
      partition by student_id, coalesce(
        (select le.lemma from user_vocab_items uvi
         join lexicon_senses ls on ls.id = uvi.sense_id
         join lexicon_entries le on le.id = ls.entry_id
         where uvi.id = vae.user_vocab_item_id),
        lower(trim(vae.expected))
      )
      order by created_at desc
    ) as rn
  from vocab_answer_events vae
  where evaluation in ('correct', 'wrong')
),
streaks as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'correct' and rn <= 5) as current_streak
  from ordered_events
  where term_en_norm is not null and term_en_norm != ''
  group by student_id, term_en_norm
)
select
  student_id,
  term_en_norm,
  current_streak
from streaks
where current_streak > 0;
