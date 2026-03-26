-- Case-insensitive exact email match (deterministic; may return 0, 1, or more rows if data is dirty)

create or replace function public.find_profiles_by_email_ci(p_email text)
returns table (id uuid, email text, username text)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.email, p.username
  from public.profiles p
  where p.email is not null
    and lower(trim(p.email)) = lower(trim(p_email));
$$;

grant execute on function public.find_profiles_by_email_ci(text) to authenticated;
grant execute on function public.find_profiles_by_email_ci(text) to service_role;
