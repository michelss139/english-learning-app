-- Migration: Fix vocab metrics rolling windows (timezone-safe)
-- Date: 2026-01-20
--
-- Problem: current views use date truncation (UTC midnight), so "today"
-- can show 0 even when there are events in the last 24h.
-- Solution: switch all "today" checks to rolling windows based on now().

-- ============================================
-- v2_vocab_accuracy_extended
-- ============================================
create or replace view v2_vocab_accuracy_extended as
select
  student_id,
  -- Rolling 24h instead of UTC date boundary
  count(*) filter (where evaluation = 'correct' and created_at >= now() - interval '24 hours') as correct_today,
  count(*) filter (where evaluation in ('correct', 'wrong') and created_at >= now() - interval '24 hours') as total_today,
  -- 3 days rolling window
  count(*) filter (where evaluation = 'correct' and created_at >= now() - interval '3 days') as correct_3d,
  count(*) filter (where evaluation in ('correct', 'wrong') and created_at >= now() - interval '3 days') as total_3d,
  -- 7 days rolling window
  count(*) filter (where evaluation = 'correct' and created_at >= now() - interval '7 days') as correct_7d,
  count(*) filter (where evaluation in ('correct', 'wrong') and created_at >= now() - interval '7 days') as total_7d,
  -- 14 days rolling window
  count(*) filter (where evaluation = 'correct' and created_at >= now() - interval '14 days') as correct_14d,
  count(*) filter (where evaluation in ('correct', 'wrong') and created_at >= now() - interval '14 days') as total_14d
from vocab_answer_events
where evaluation in ('correct', 'wrong')
group by student_id;

-- ============================================
-- v2_vocab_learned_today (rolling 24h)
-- ============================================
create or replace view v2_vocab_learned_today as
with today_events as (
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
    created_at
  from vocab_answer_events vae
  where evaluation in ('correct', 'wrong')
    and created_at >= now() - interval '24 hours'
),
word_stats as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'correct') as correct_count,
    count(*) filter (where evaluation = 'wrong') as wrong_count
  from today_events
  where term_en_norm is not null and term_en_norm != ''
  group by student_id, term_en_norm
)
select
  student_id,
  term_en_norm
from word_stats
where correct_count >= 3
  and wrong_count = 0;

-- ============================================
-- v2_vocab_to_learn_today (rolling 24h)
-- ============================================
create or replace view v2_vocab_to_learn_today as
with today_events as (
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
    created_at
  from vocab_answer_events vae
  where evaluation in ('correct', 'wrong')
    and created_at >= now() - interval '24 hours'
),
word_stats as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'wrong') as wrong_count_today
  from today_events
  where term_en_norm is not null and term_en_norm != ''
  group by student_id, term_en_norm
),
learned_words as (
  select student_id, term_en_norm from v2_vocab_learned_total
)
select
  ws.student_id,
  ws.term_en_norm
from word_stats ws
left join learned_words lw on lw.student_id = ws.student_id and lw.term_en_norm = ws.term_en_norm
where ws.wrong_count_today > 0
  and lw.term_en_norm is null;  -- Exclude learned words

-- ============================================
-- Note:
-- Legacy views (vocab_accuracy_extended, vocab_learned_today, vocab_to_learn_today)
-- are already aliased to v2_* via 20250227_switch_vocab_views_to_v2.sql,
-- so updating v2_* definitions propagates to the legacy names.
