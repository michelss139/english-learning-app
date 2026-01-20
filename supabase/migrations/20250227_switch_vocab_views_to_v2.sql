-- Migration: Switch legacy vocab views to v2 definitions
-- Date: 2025-02-27
-- 
-- After verifying v2 views work correctly, replace legacy view definitions
-- with v2 implementations (vocab_answer_events-based)

-- ============================================
-- Replace legacy views with v2 definitions
-- ============================================

-- vocab_accuracy_extended -> use v2 definition
drop view if exists vocab_accuracy_extended;
create view vocab_accuracy_extended as
select * from v2_vocab_accuracy_extended;

-- vocab_learned_total -> use v2 definition
drop view if exists vocab_learned_total;
create view vocab_learned_total as
select * from v2_vocab_learned_total;

-- vocab_learned_today -> use v2 definition
drop view if exists vocab_learned_today;
create view vocab_learned_today as
select * from v2_vocab_learned_today;

-- vocab_learned_week -> use v2 definition
drop view if exists vocab_learned_week;
create view vocab_learned_week as
select * from v2_vocab_learned_week;

-- vocab_to_learn_total -> use v2 definition
drop view if exists vocab_to_learn_total;
create view vocab_to_learn_total as
select * from v2_vocab_to_learn_total;

-- vocab_to_learn_today -> use v2 definition
drop view if exists vocab_to_learn_today;
create view vocab_to_learn_today as
select * from v2_vocab_to_learn_today;

-- vocab_to_learn_week -> use v2 definition
drop view if exists vocab_to_learn_week;
create view vocab_to_learn_week as
select * from v2_vocab_to_learn_week;

-- vocab_repeat_suggestions -> use v2 definition
drop view if exists vocab_repeat_suggestions;
create view vocab_repeat_suggestions as
select * from v2_vocab_repeat_suggestions;

-- vocab_current_streaks -> use v2 definition
drop view if exists vocab_current_streaks;
create view vocab_current_streaks as
select * from v2_vocab_current_streaks;

-- Note: This migration should be run AFTER verifying v2 views work correctly
-- If legacy views don't exist, this will create them with v2 definitions
-- If they do exist, they will be replaced
