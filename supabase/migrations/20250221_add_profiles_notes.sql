-- Dodaje kolumnę na notatki użytkownika i pilnuje polityk RLS dla własnego profilu.
alter table profiles
  add column if not exists notes text;

-- Zachowaj istniejące reguły; dodaj tylko, gdy brakuje.
alter table profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles select own row') then
    create policy "Profiles select own row"
      on profiles
      for select
      using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles update own row') then
    create policy "Profiles update own row"
      on profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end
$$;
