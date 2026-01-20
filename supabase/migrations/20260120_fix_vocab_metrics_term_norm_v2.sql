-- Migration: Refine vocab metrics v2 (mode-aware term, no cluster-choice)
-- Date: 2026-01-20
--
-- Changes:
-- - Filter metrics to question_mode in ('en-pl','pl-en') only (exclude cluster-choice).
-- - Compute term_en_norm once via base_events CTE with joins to user_vocab_items/lexicon tables.
-- - Keep rolling windows (24h for "today", 7d for "week"), 3d/14d only in accuracy view (unchanged here).
-- - Current streaks left untouched (better streak logic to be added later).

-- Shared CTE for all views below
-- term_en_norm priority:
--   1) lexicon_entries.lemma_norm (via user_vocab_items -> lexicon_senses -> lexicon_entries)
--   2) if question_mode = 'en-pl'  -> lower(trim(prompt))   -- prompt is term_en
--      else                        -> lower(trim(expected)) -- expected is term_en in pl-en
-- Cluster-choice is excluded by question_mode filter.

-- ============================================
-- v2_vocab_learned_total
-- ============================================
create or replace view v2_vocab_learned_total as
with base_events as (
  select
    vae.student_id,
    coalesce(
      le.lemma_norm,
      case when vae.question_mode = 'en-pl'
           then lower(trim(vae.prompt))
           else lower(trim(vae.expected)) end
    ) as term_en_norm,
    vae.evaluation,
    vae.created_at
  from vocab_answer_events vae
  left join user_vocab_items uvi on uvi.id = vae.user_vocab_item_id
  left join lexicon_senses ls on ls.id = uvi.sense_id
  left join lexicon_entries le on le.id = ls.entry_id
  where vae.evaluation in ('correct', 'wrong')
    and vae.question_mode in ('en-pl', 'pl-en')
),
word_stats as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'correct') as correct_count,
    count(*) filter (where evaluation = 'wrong') as wrong_count
  from base_events
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
-- v2_vocab_learned_today (rolling 24h)
-- ============================================
create or replace view v2_vocab_learned_today as
with base_events as (
  select
    vae.student_id,
    coalesce(
      le.lemma_norm,
      case when vae.question_mode = 'en-pl'
           then lower(trim(vae.prompt))
           else lower(trim(vae.expected)) end
    ) as term_en_norm,
    vae.evaluation,
    vae.created_at
  from vocab_answer_events vae
  left join user_vocab_items uvi on uvi.id = vae.user_vocab_item_id
  left join lexicon_senses ls on ls.id = uvi.sense_id
  left join lexicon_entries le on le.id = ls.entry_id
  where vae.evaluation in ('correct', 'wrong')
    and vae.question_mode in ('en-pl', 'pl-en')
    and vae.created_at >= now() - interval '24 hours'
),
word_stats as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'correct') as correct_count,
    count(*) filter (where evaluation = 'wrong') as wrong_count
  from base_events
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
-- v2_vocab_learned_week (rolling 7d)
-- ============================================
create or replace view v2_vocab_learned_week as
with base_events as (
  select
    vae.student_id,
    coalesce(
      le.lemma_norm,
      case when vae.question_mode = 'en-pl'
           then lower(trim(vae.prompt))
           else lower(trim(vae.expected)) end
    ) as term_en_norm,
    vae.evaluation,
    vae.created_at
  from vocab_answer_events vae
  left join user_vocab_items uvi on uvi.id = vae.user_vocab_item_id
  left join lexicon_senses ls on ls.id = uvi.sense_id
  left join lexicon_entries le on le.id = ls.entry_id
  where vae.evaluation in ('correct', 'wrong')
    and vae.question_mode in ('en-pl', 'pl-en')
    and vae.created_at >= now() - interval '7 days'
),
word_stats as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'correct') as correct_count,
    count(*) filter (where evaluation = 'wrong') as wrong_count
  from base_events
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
-- v2_vocab_to_learn_total
-- ============================================
create or replace view v2_vocab_to_learn_total as
with base_events as (
  select
    vae.student_id,
    coalesce(
      le.lemma_norm,
      case when vae.question_mode = 'en-pl'
           then lower(trim(vae.prompt))
           else lower(trim(vae.expected)) end
    ) as term_en_norm,
    vae.evaluation,
    vae.created_at
  from vocab_answer_events vae
  left join user_vocab_items uvi on uvi.id = vae.user_vocab_item_id
  left join lexicon_senses ls on ls.id = uvi.sense_id
  left join lexicon_entries le on le.id = ls.entry_id
  where vae.evaluation in ('correct', 'wrong')
    and vae.question_mode in ('en-pl', 'pl-en')
),
word_stats as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'correct') as correct_count,
    count(*) filter (where evaluation = 'wrong') as wrong_count,
    max(created_at) filter (where evaluation = 'wrong') as last_wrong_at,
    max(created_at) as last_attempt_at
  from base_events
  where term_en_norm is not null and term_en_norm != ''
  group by student_id, term_en_norm
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
    last_attempt_at,
    correct_count,
    wrong_count
  from word_stats
  where wrong_count > 0 or correct_count < 3  -- has errors or not yet learned
),
learned_words as (
  select student_id, term_en_norm from v2_vocab_learned_total
)
select
  er.student_id,
  er.term_en_norm
from error_rates er
left join learned_words lw on lw.student_id = er.student_id and lw.term_en_norm = er.term_en_norm
where lw.term_en_norm is null
order by er.error_rate desc, er.last_wrong_at desc nulls last;

-- ============================================
-- v2_vocab_to_learn_today (rolling 24h)
-- ============================================
create or replace view v2_vocab_to_learn_today as
with base_events as (
  select
    vae.student_id,
    coalesce(
      le.lemma_norm,
      case when vae.question_mode = 'en-pl'
           then lower(trim(vae.prompt))
           else lower(trim(vae.expected)) end
    ) as term_en_norm,
    vae.evaluation,
    vae.created_at
  from vocab_answer_events vae
  left join user_vocab_items uvi on uvi.id = vae.user_vocab_item_id
  left join lexicon_senses ls on ls.id = uvi.sense_id
  left join lexicon_entries le on le.id = ls.entry_id
  where vae.evaluation in ('correct', 'wrong')
    and vae.question_mode in ('en-pl', 'pl-en')
    and vae.created_at >= now() - interval '24 hours'
),
word_stats as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'wrong') as wrong_count_today
  from base_events
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
  and lw.term_en_norm is null;

-- ============================================
-- v2_vocab_to_learn_week (rolling 7d)
-- ============================================
create or replace view v2_vocab_to_learn_week as
with base_events as (
  select
    vae.student_id,
    coalesce(
      le.lemma_norm,
      case when vae.question_mode = 'en-pl'
           then lower(trim(vae.prompt))
           else lower(trim(vae.expected)) end
    ) as term_en_norm,
    vae.evaluation,
    vae.created_at
  from vocab_answer_events vae
  left join user_vocab_items uvi on uvi.id = vae.user_vocab_item_id
  left join lexicon_senses ls on ls.id = uvi.sense_id
  left join lexicon_entries le on le.id = ls.entry_id
  where vae.evaluation in ('correct', 'wrong')
    and vae.question_mode in ('en-pl', 'pl-en')
    and vae.created_at >= now() - interval '7 days'
),
word_stats as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'wrong') as wrong_count_week
  from base_events
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
  and lw.term_en_norm is null;

-- ============================================
-- v2_vocab_repeat_suggestions
-- ============================================
create or replace view v2_vocab_repeat_suggestions as
with base_events as (
  select
    vae.student_id,
    coalesce(
      le.lemma_norm,
      case when vae.question_mode = 'en-pl'
           then lower(trim(vae.prompt))
           else lower(trim(vae.expected)) end
    ) as term_en_norm,
    vae.evaluation,
    vae.created_at
  from vocab_answer_events vae
  left join user_vocab_items uvi on uvi.id = vae.user_vocab_item_id
  left join lexicon_senses ls on ls.id = uvi.sense_id
  left join lexicon_entries le on le.id = ls.entry_id
  where vae.evaluation in ('correct', 'wrong')
    and vae.question_mode in ('en-pl', 'pl-en')
),
word_stats as (
  select
    student_id,
    term_en_norm,
    count(*) filter (where evaluation = 'correct') as correct_count,
    count(*) filter (where evaluation = 'wrong') as wrong_count,
    max(created_at) filter (where evaluation = 'correct') as last_correct_at,
    max(created_at) as last_attempt_at
  from base_events
  where term_en_norm is not null and term_en_norm != ''
  group by student_id, term_en_norm
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
)
select
  student_id,
  term_en_norm,
  last_correct_at
from error_rates
where (
  (wrong_count > 0 and last_attempt_at >= now() - interval '7 days') -- wrong recently
  or error_rate > 0.3                                                -- high error rate
  or (last_attempt_at < now() - interval '14 days')                  -- stale
)
order by error_rate desc, last_correct_at asc nulls first;

-- ============================================
-- Note: v2_vocab_current_streaks intentionally left unchanged in this migration.
