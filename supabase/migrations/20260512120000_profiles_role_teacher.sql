-- Self-service registration: store account type as profiles.role = 'teacher' | 'student'.

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'profiles'
      and t.relnamespace = (select oid from pg_namespace where nspname = 'public')
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['admin'::text, 'student'::text, 'teacher'::text]));
