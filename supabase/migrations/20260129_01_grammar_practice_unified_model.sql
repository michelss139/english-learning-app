-- Unified grammar practice model:
-- - exercise_type = 'grammar_practice' (single type for all grammar exercises)
-- - exercise_slug stores tense slug (e.g. 'present-simple')
-- - grammar_sessions + grammar_session_answers enforce start -> answer -> complete lifecycle

begin;

alter table public.exercise_session_completions
  add column if not exists exercise_slug text;

-- Backward compatibility for already stored rows
update public.exercise_session_completions
set exercise_type = 'grammar_practice',
    exercise_slug = coalesce(exercise_slug, 'present-simple')
where exercise_type = 'present_simple_practice';

alter table public.exercise_session_completions
  drop constraint if exists exercise_session_completions_exercise_type_check;

alter table public.exercise_session_completions
  add constraint exercise_session_completions_exercise_type_check
  check (exercise_type in ('pack', 'cluster', 'irregular', 'grammar_practice'));

create index if not exists idx_exercise_session_completions_student_type_slug
  on public.exercise_session_completions(student_id, exercise_type, exercise_slug);

create table if not exists public.grammar_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  exercise_slug text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_grammar_sessions_student_created
  on public.grammar_sessions(student_id, created_at desc);

create index if not exists idx_grammar_sessions_slug
  on public.grammar_sessions(exercise_slug);

create table if not exists public.grammar_session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.grammar_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null,
  selected_option text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_grammar_session_answers_session
  on public.grammar_session_answers(session_id, created_at desc);

create index if not exists idx_grammar_session_answers_student_session
  on public.grammar_session_answers(student_id, session_id);

alter table public.grammar_sessions enable row level security;
alter table public.grammar_session_answers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'grammar_sessions'
      and policyname = 'Grammar sessions select own'
  ) then
    create policy "Grammar sessions select own"
      on public.grammar_sessions
      for select
      using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'grammar_sessions'
      and policyname = 'Grammar sessions insert own'
  ) then
    create policy "Grammar sessions insert own"
      on public.grammar_sessions
      for insert
      with check (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'grammar_session_answers'
      and policyname = 'Grammar answers select own'
  ) then
    create policy "Grammar answers select own"
      on public.grammar_session_answers
      for select
      using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'grammar_session_answers'
      and policyname = 'Grammar answers insert own'
  ) then
    create policy "Grammar answers insert own"
      on public.grammar_session_answers
      for insert
      with check (auth.uid() = student_id);
  end if;
end
$$;

commit;
