-- Migration: Switch legacy vocab views to v2 definitions
-- Date: 2025-02-27
-- 
-- After verifying v2 views work correctly, replace legacy view definitions
-- with v2 implementations (vocab_answer_events-based)

-- ============================================
-- Drop legacy views (respect dependencies)
-- ============================================
-- vocab_to_learn_* and vocab_repeat_suggestions depend on vocab_learned_total.
-- vocab_learned_today (legacy) depends on vocab_learned_at.
-- vocab_learned_at depends on vocab_current_streaks.
-- Drop order: learned_total CASCADE -> learned_today -> learned_week -> learned_at -> accuracy -> current_streaks.

drop view if exists vocab_learned_total cascade;
drop view if exists vocab_learned_today;
drop view if exists vocab_learned_week;
drop view if exists vocab_learned_at;
drop view if exists vocab_accuracy_extended;
drop view if exists vocab_current_streaks;

-- ============================================
-- Create vocab_* as aliases to v2_*
-- ============================================

create view vocab_accuracy_extended as
select * from v2_vocab_accuracy_extended;

create view vocab_learned_total as
select * from v2_vocab_learned_total;

create view vocab_learned_today as
select * from v2_vocab_learned_today;

create view vocab_learned_week as
select * from v2_vocab_learned_week;

create view vocab_to_learn_total as
select * from v2_vocab_to_learn_total;

create view vocab_to_learn_today as
select * from v2_vocab_to_learn_today;

create view vocab_to_learn_week as
select * from v2_vocab_to_learn_week;

create view vocab_repeat_suggestions as
select * from v2_vocab_repeat_suggestions;

create view vocab_current_streaks as
select * from v2_vocab_current_streaks;

-- Note: Run 20260122_create_missing_v2_views_for_switch.sql first if v2_* views are missing.
