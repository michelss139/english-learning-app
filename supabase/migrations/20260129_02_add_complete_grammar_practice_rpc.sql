-- Atomic completion helper for grammar practice:
-- validates ownership + min answers and inserts completion idempotently.

create or replace function public.complete_grammar_practice(
  p_student_id uuid,
  p_session_id uuid
)
returns table (
  inserted boolean,
  exercise_slug text,
  answer_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_answer_count int;
  v_completion_id uuid;
begin
  select gs.exercise_slug
    into v_slug
  from public.grammar_sessions gs
  where gs.id = p_session_id
    and gs.student_id = p_student_id
  limit 1;

  if v_slug is null then
    raise exception 'GRAMMAR_SESSION_NOT_FOUND';
  end if;

  select count(*)::int
    into v_answer_count
  from public.grammar_session_answers gsa
  where gsa.session_id = p_session_id
    and gsa.student_id = p_student_id;

  if v_answer_count < 1 then
    raise exception 'GRAMMAR_SESSION_NO_ANSWERS';
  end if;

  insert into public.exercise_session_completions (
    student_id,
    session_id,
    exercise_type,
    exercise_slug,
    context_id,
    context_slug
  )
  values (
    p_student_id,
    p_session_id,
    'grammar_practice',
    v_slug,
    null,
    v_slug
  )
  on conflict (student_id, exercise_type, session_id) do nothing
  returning id into v_completion_id;

  return query
  select (v_completion_id is not null), v_slug, v_answer_count;
end;
$$;
