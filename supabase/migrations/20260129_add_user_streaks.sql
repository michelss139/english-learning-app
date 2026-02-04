-- User streaks table
create table if not exists user_streaks (
  student_id uuid primary key references profiles(id) on delete cascade,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_activity_date date null,
  updated_at timestamptz not null default now()
);

alter table user_streaks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_streaks'
      and policyname = 'User streaks select own row'
  ) then
    create policy "User streaks select own row"
      on user_streaks
      for select
      using (auth.uid() = student_id);
  end if;
end
$$;
