-- Migration: Restrict vocab metric views from anon/auth
-- Date: 2026-01-28
--
-- Revoke SELECT on metric views for anon/auth; allow service_role.
-- No changes to view definitions or source tables.

do $$
declare
  view_name text;
  views text[] := array[
    -- v2 views
    'v2_vocab_accuracy_extended',
    'v2_vocab_learned_total',
    'v2_vocab_learned_today',
    'v2_vocab_learned_week',
    'v2_vocab_to_learn_total',
    'v2_vocab_to_learn_today',
    'v2_vocab_to_learn_week',
    'v2_vocab_repeat_suggestions',
    'v2_vocab_current_streaks',
    -- legacy aliases
    'vocab_accuracy_extended',
    'vocab_learned_total',
    'vocab_learned_today',
    'vocab_learned_week',
    'vocab_to_learn_total',
    'vocab_to_learn_today',
    'vocab_to_learn_week',
    'vocab_repeat_suggestions',
    'vocab_current_streaks',
    -- older summary views
    'vocab_accuracy_window',
    'vocab_most_wrong',
    'vocab_learned',
    'vocab_last_attempts'
  ];
begin
  foreach view_name in array views loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = view_name
        and c.relkind in ('v', 'm')
    ) then
      execute format('revoke select on public.%I from anon, authenticated', view_name);
      execute format('grant select on public.%I to service_role', view_name);
    end if;
  end loop;
end $$;
