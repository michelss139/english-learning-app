-- Allow exercise_type 'present_simple_practice' for grammar practice completions
alter table exercise_session_completions
  drop constraint if exists exercise_session_completions_exercise_type_check;

alter table exercise_session_completions
  add constraint exercise_session_completions_exercise_type_check
  check (exercise_type in ('pack', 'cluster', 'irregular', 'present_simple_practice'));
