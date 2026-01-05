-- Tworzy tabelę z wynikami testów słówek i ustawia RLS dla studenta/admina.
create table if not exists vocab_test_runs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  mode text not null default 'en-pl',
  total int not null,
  correct int not null,
  created_at timestamptz not null default now(),
  item_ids uuid[] not null
);

alter table vocab_test_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_test_runs' and policyname = 'Vocab test runs: student select own'
  ) then
    create policy "Vocab test runs: student select own"
      on vocab_test_runs
      for select
      using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_test_runs' and policyname = 'Vocab test runs: student insert own'
  ) then
    create policy "Vocab test runs: student insert own"
      on vocab_test_runs
      for insert
      with check (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_test_runs' and policyname = 'Vocab test runs: admin select all'
  ) then
    create policy "Vocab test runs: admin select all"
      on vocab_test_runs
      for select
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_test_runs' and policyname = 'Vocab test runs: admin manage all'
  ) then
    create policy "Vocab test runs: admin manage all"
      on vocab_test_runs
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end
$$;
