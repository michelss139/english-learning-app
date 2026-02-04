-- Exercise session completions
create table if not exists exercise_session_completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  session_id uuid not null,
  exercise_type text not null check (exercise_type in ('pack', 'cluster', 'irregular')),
  context_id uuid null,
  context_slug text null,
  completed_at timestamptz not null default now(),
  unique (student_id, exercise_type, session_id)
);

create index if not exists idx_exercise_session_completions_student
  on exercise_session_completions(student_id);
create index if not exists idx_exercise_session_completions_type
  on exercise_session_completions(exercise_type);

alter table exercise_session_completions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'exercise_session_completions'
      and policyname = 'Exercise completions select own row'
  ) then
    create policy "Exercise completions select own row"
      on exercise_session_completions
      for select
      using (auth.uid() = student_id);
  end if;
end
$$;
