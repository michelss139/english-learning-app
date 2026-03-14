-- Migration: normalize make-do and bring-take cluster content
-- Date: 2026-03-13
-- Goal: align older clusters with the current content specification

begin;

alter table public.vocab_cluster_questions
  add column if not exists target_tokens text[];

-- Remove unused correction tasks from vocab clusters.
delete from public.vocab_cluster_questions q
using public.vocab_clusters c
where q.cluster_id = c.id
  and c.slug in ('make-do', 'bring-take')
  and q.task_type = 'correction';

-- Deterministically keep the first 25 choice tasks and first 15 translation tasks
-- per normalized cluster, ordered by sort_order nulls last, then id.
with ranked as (
  select
    q.id,
    q.cluster_id,
    q.task_type,
    row_number() over (
      partition by q.cluster_id, q.task_type
      order by q.sort_order nulls last, q.id
    ) as rn
  from public.vocab_cluster_questions q
  join public.vocab_clusters c
    on c.id = q.cluster_id
  where c.slug in ('make-do', 'bring-take')
    and q.task_type in ('choice', 'translation')
),
to_delete as (
  select id
  from ranked
  where (task_type = 'choice' and rn > 25)
     or (task_type = 'translation' and rn > 15)
)
delete from public.vocab_cluster_questions q
using to_delete d
where q.id = d.id;

-- Normalize make-do translation tasks to target_tokens-based scoring.
update public.vocab_cluster_questions q
set target_tokens = array[le.lemma_norm]::text[],
    explanation = 'Użyj właściwego czasownika z pary make / do.'
from public.vocab_clusters c
join public.vocab_cluster_entries vce
  on vce.cluster_id = c.id
join public.lexicon_entries le
  on le.id = vce.entry_id
where q.cluster_id = c.id
  and q.correct_entry_id = vce.id
  and c.slug = 'make-do'
  and q.task_type = 'translation';

-- Normalize bring-take translation tasks to target_tokens-based scoring.
update public.vocab_cluster_questions q
set target_tokens = array[le.lemma_norm]::text[],
    explanation = 'Użyj właściwego czasownika z pary bring / take.'
from public.vocab_clusters c
join public.vocab_cluster_entries vce
  on vce.cluster_id = c.id
join public.lexicon_entries le
  on le.id = vce.entry_id
where q.cluster_id = c.id
  and q.correct_entry_id = vce.id
  and c.slug = 'bring-take'
  and q.task_type = 'translation';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vocab_cluster_questions_translation_target_tokens_required'
      and conrelid = 'public.vocab_cluster_questions'::regclass
  ) then
    alter table public.vocab_cluster_questions
      add constraint vocab_cluster_questions_translation_target_tokens_required
      check (
        task_type <> 'translation'
        or (target_tokens is not null and cardinality(target_tokens) >= 1)
      ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vocab_cluster_questions_choice_single_blank'
      and conrelid = 'public.vocab_cluster_questions'::regclass
  ) then
    alter table public.vocab_cluster_questions
      add constraint vocab_cluster_questions_choice_single_blank
      check (
        task_type <> 'choice'
        or regexp_count(prompt, '_{2,}') = 1
      ) not valid;
  end if;
end $$;

create unique index if not exists idx_vocab_cluster_questions_active_unique_sort_order
on public.vocab_cluster_questions (cluster_id, task_type, sort_order)
where is_active = true;

do $$
declare
  make_choice_count integer;
  make_translation_count integer;
  correction_count integer;
  missing_targets integer;
begin
  select count(*) into make_choice_count
  from public.vocab_cluster_questions q
  join public.vocab_clusters c on c.id = q.cluster_id
  where c.slug = 'make-do' and q.task_type = 'choice';

  select count(*) into make_translation_count
  from public.vocab_cluster_questions q
  join public.vocab_clusters c on c.id = q.cluster_id
  where c.slug = 'make-do' and q.task_type = 'translation';

  select count(*) into correction_count
  from public.vocab_cluster_questions q
  join public.vocab_clusters c on c.id = q.cluster_id
  where c.slug in ('make-do', 'bring-take') and q.task_type = 'correction';

  select count(*) into missing_targets
  from public.vocab_cluster_questions q
  join public.vocab_clusters c on c.id = q.cluster_id
  where c.slug in ('make-do', 'bring-take')
    and q.task_type = 'translation'
    and (q.target_tokens is null or cardinality(q.target_tokens) = 0);

  if make_choice_count <> 25 then
    raise exception 'make-do choice count expected 25, got %', make_choice_count;
  end if;

  if make_translation_count <> 15 then
    raise exception 'make-do translation count expected 15, got %', make_translation_count;
  end if;

  if correction_count <> 0 then
    raise exception 'Expected 0 correction tasks, got %', correction_count;
  end if;

  if missing_targets <> 0 then
    raise exception 'Expected all translation tasks to have target_tokens, but % rows are missing them', missing_targets;
  end if;
end $$;

commit;
