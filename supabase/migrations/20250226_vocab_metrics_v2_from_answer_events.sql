-- Migration: Vocab Metrics v2 - Single Source of Truth from vocab_answer_events
-- Date: 2025-02-26
-- 
-- Replaces legacy vocab_exercise_runs-based views with vocab_answer_events-based views
-- vocab_answer_events is now the single source of truth for all metrics

-- ============================================
-- VIEW: v2_vocab_accuracy_extended
-- ============================================
-- Accuracy metrics for different time windows
-- Based on vocab_answer_events with evaluation IN ('correct', 'wrong')
create or replace view v2_vocab_accuracy_extended as
select
  student_id,
  -- Today
  count(*) filter (where evaluation = 'correct' and date_trunc('day', created_at) = date_trunc('day', now())) as correct_today,
  count(*) filter (where evaluation in ('correct', 'wrong') and date_trunc('day', created_at) = date_trunc('day', now())) as total_today,
  -- 3 days
  count(*) filter (where evaluation = 'correct' and created_at >= now() - interval '3 days') as correct_3d,
  count(*) filter (where evaluation in ('correct', 'wrong') and created_at >= now() - interval '3 days') as total_3d,
  -- 7 days
  count(*) filter (where evaluation = 'correct' and created_at >= now() - interval '7 days') as correct_7d,
  count(*) filter (where evaluation in ('correct', 'wrong') and created_at >= now() - interval '7 days') as total_7d,
  -- 14 days
  count(*) filter (where evaluation = 'correct' and created_at >= now() - interval '14 days') as correct_14d,
  count(*) filter (where evaluation in ('correct', 'wrong') and created_at >= now() - interval '14 days') as total_14d
from vocab_answer_events
where evaluation in ('correct', 'wrong')
group by student_id;

-- ============================================
-- VIEW: v2_vocab_learned_total
-- ============================================
-- Words with ≥3 correct answers without errors in all attempts
-- Based on vocab_answer_events
create or replace view v2_vocab_learned_total as
with word_stats as (
  select
    student_id,
    coalesce(
      -- Try to get term from user_vocab_items -> lexicon_senses -> lexicon_entries
      (select le.lemma from user_vocab_items uvi
       join lexicon_senses ls on ls.id = uvi.sense_id
       join lexicon_entries le on le.id = ls.entry_id
       where uvi.id = vae.user_vocab_item_id),
      -- Fallback: use expected field (for cluster practice)
      lower(trim(vae.expected))
    ) as term_en_norm,
    count(*) filter (where evaluation = 'correct') as correct_count,
    count(*) filter (where evaluation = 'wrong') as wrong_count,
    count(*) as total_attempts
  from vocab_answer_events vae
  where evaluation in ('correct', 'wrong')
    and user_vocab_item_id is not null  -- Only for user vocab items (not cluster practice)
  group by student_id, coalesce(
    (select le.lemma from user_vocab_items uvi
     join lexicon_senses ls on ls.id = uvi.sense_id
     join lexicon_entries le on le.id = ls.entry_id
     where uvi.id = vae.user_vocab_item_id),
    lower(trim(vae.expected))
  )
)
select
  student_id,
  term_en_norm
from word_stats
where correct_count >= 3
  and wrong_count = 0
  and term_en_norm is not null
  and term_en_norm != '';

-- ============================================
-- VIEW: v2_vocab_learned_today
-- ============================================
-- Words learned today (≥3 correct, no errors, in last N attempts today)
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
    and user_vocab_item_id is not null
    and date_trunc('day', created_at) = date_trunc('day', now())
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
-- VIEW: v2_vocab_learned_week
-- ============================================
-- Words learned this week (≥3 correct, no errors, in last 7 days)
create or replace view v2_vocab_learned_week as
with week_events as (
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
    and user_vocab_item_id is not null
    and created_at >= now() - interval '7 days'
),
word_stats as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'correct') as correct_count,
    count(*) filter (where evaluation = 'wrong') as wrong_count
  from week_events
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
-- VIEW: v2_vocab_to_learn_total
-- ============================================
-- Words with highest error_rate or last wrong answer
-- Excludes words from learned_total
create or replace view v2_vocab_to_learn_total as
with word_stats as (
  select
    student_id,
    coalesce(
      (select le.lemma from user_vocab_items uvi
       join lexicon_senses ls on ls.id = uvi.sense_id
       join lexicon_entries le on le.id = ls.entry_id
       where uvi.id = vae.user_vocab_item_id),
      lower(trim(vae.expected))
    ) as term_en_norm,
    count(*) filter (where evaluation = 'correct') as correct_count,
    count(*) filter (where evaluation = 'wrong') as wrong_count,
    max(created_at) filter (where evaluation = 'wrong') as last_wrong_at,
    max(created_at) as last_attempt_at
  from vocab_answer_events vae
  where evaluation in ('correct', 'wrong')
    and user_vocab_item_id is not null
  group by student_id, coalesce(
    (select le.lemma from user_vocab_items uvi
     join lexicon_senses ls on ls.id = uvi.sense_id
     join lexicon_entries le on le.id = ls.entry_id
     where uvi.id = vae.user_vocab_item_id),
    lower(trim(vae.expected))
  )
),
error_rates as (
  select
    student_id,
    term_en_norm,
    case
      when (correct_count + wrong_count) > 0
      then wrong_count::float / (correct_count + wrong_count)
      else 0.0
    end as error_rate,
    last_wrong_at,
    last_attempt_at
  from word_stats
  where term_en_norm is not null
    and term_en_norm != ''
    and (wrong_count > 0 or correct_count < 3)  -- Has errors or not learned yet
),
learned_words as (
  select student_id, term_en_norm from v2_vocab_learned_total
)
select
  er.student_id,
  er.term_en_norm
from error_rates er
left join learned_words lw on lw.student_id = er.student_id and lw.term_en_norm = er.term_en_norm
where lw.term_en_norm is null  -- Exclude learned words
order by er.error_rate desc, er.last_wrong_at desc nulls last;

-- ============================================
-- VIEW: v2_vocab_to_learn_today
-- ============================================
-- Words to learn today (wrong answers today or high error rate)
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
    and user_vocab_item_id is not null
    and date_trunc('day', created_at) = date_trunc('day', now())
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
-- VIEW: v2_vocab_to_learn_week
-- ============================================
-- Words to learn this week (wrong answers in last 7 days or high error rate)
create or replace view v2_vocab_to_learn_week as
with week_events as (
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
    and user_vocab_item_id is not null
    and created_at >= now() - interval '7 days'
),
word_stats as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'wrong') as wrong_count_week
  from week_events
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
where ws.wrong_count_week > 0
  and lw.term_en_norm is null;  -- Exclude learned words

-- ============================================
-- VIEW: v2_vocab_repeat_suggestions
-- ============================================
-- Words that need repetition:
-- - Have wrong answers in last X days
-- - Or error_rate > threshold
-- - Or not practiced for Y days
create or replace view v2_vocab_repeat_suggestions as
with word_stats as (
  select
    student_id,
    coalesce(
      (select le.lemma from user_vocab_items uvi
       join lexicon_senses ls on ls.id = uvi.sense_id
       join lexicon_entries le on le.id = ls.entry_id
       where uvi.id = vae.user_vocab_item_id),
      lower(trim(vae.expected))
    ) as term_en_norm,
    count(*) filter (where evaluation = 'correct') as correct_count,
    count(*) filter (where evaluation = 'wrong') as wrong_count,
    max(created_at) filter (where evaluation = 'correct') as last_correct_at,
    max(created_at) as last_attempt_at
  from vocab_answer_events vae
  where evaluation in ('correct', 'wrong')
    and user_vocab_item_id is not null
  group by student_id, coalesce(
    (select le.lemma from user_vocab_items uvi
     join lexicon_senses ls on ls.id = uvi.sense_id
     join lexicon_entries le on le.id = ls.entry_id
     where uvi.id = vae.user_vocab_item_id),
    lower(trim(vae.expected))
  )
),
error_rates as (
  select
    student_id,
    term_en_norm,
    case
      when (correct_count + wrong_count) > 0
      then wrong_count::float / (correct_count + wrong_count)
      else 0.0
    end as error_rate,
    last_correct_at,
    last_attempt_at,
    wrong_count
  from word_stats
  where term_en_norm is not null
    and term_en_norm != ''
)
select
  student_id,
  term_en_norm,
  last_correct_at
from error_rates
where (
  -- Wrong in last 7 days
  (wrong_count > 0 and last_attempt_at >= now() - interval '7 days')
  -- Or error rate > 0.3
  or error_rate > 0.3
  -- Or not practiced for 14 days
  or (last_attempt_at < now() - interval '14 days')
)
order by error_rate desc, last_correct_at asc nulls first;

-- ============================================
-- VIEW: v2_vocab_current_streaks
-- ============================================
-- Current streaks (consecutive correct answers) per word
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
    and user_vocab_item_id is not null
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

-- ============================================
-- RLS: Enable RLS on views (views inherit from base tables)
-- ============================================
-- Views automatically respect RLS policies from vocab_answer_events
-- No additional RLS needed
