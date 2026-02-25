-- Migration: Create lemma diagnostics view from learning units
-- Date: 2026-02-20

create or replace view public.v_lemma_diagnostics as
with
-- 1) Map unit_type='sense' -> (student_id, entry_id, knowledge_state)
sense_rows as (
  select
    ulk.student_id,
    ls.entry_id,
    ulk.knowledge_state
  from public.user_learning_unit_knowledge ulk
  join public.lexicon_senses ls
    on coalesce(ulk.unit_id, '') = coalesce(ls.id::text, '')
  where ulk.unit_type = 'sense'
    and ls.entry_id is not null
),

-- 2) Aggregate meaning_state per (student_id, entry_id)
sense_agg as (
  select
    sr.student_id,
    sr.entry_id,
    case
      when count(*) filter (where sr.knowledge_state is not null) = 0 then null
      when bool_or(coalesce(sr.knowledge_state, '') = 'unstable') then 'unstable'
      when bool_or(coalesce(sr.knowledge_state, '') = 'improving') then 'improving'
      when bool_and(coalesce(sr.knowledge_state, '') = 'mastered') then 'mastered'
      else null
    end as meaning_state
  from sense_rows sr
  group by sr.student_id, sr.entry_id
),

-- 3) Map unit_type='cluster' (unit_id=cluster_slug) -> (student_id, entry_id, knowledge_state)
cluster_rows as (
  select
    ulk.student_id,
    vce.entry_id,
    ulk.knowledge_state
  from public.user_learning_unit_knowledge ulk
  join public.vocab_clusters vc
    on coalesce(ulk.unit_id, '') = coalesce(vc.slug, '')
  join public.vocab_cluster_entries vce
    on vce.cluster_id = vc.id
  where ulk.unit_type = 'cluster'
    and vce.entry_id is not null
),

-- 4) Aggregate usage_state per (student_id, entry_id)
cluster_agg as (
  select
    cr.student_id,
    cr.entry_id,
    case
      when count(*) filter (where cr.knowledge_state is not null) = 0 then null
      when bool_or(coalesce(cr.knowledge_state, '') = 'unstable') then 'unstable'
      when bool_or(coalesce(cr.knowledge_state, '') = 'improving') then 'improving'
      when bool_and(coalesce(cr.knowledge_state, '') = 'mastered') then 'mastered'
      else null
    end as usage_state
  from cluster_rows cr
  group by cr.student_id, cr.entry_id
),

-- 5) Map unit_type='irregular' -> (student_id, entry_id, knowledge_state)
irregular_rows as (
  select
    ulk.student_id,
    iv.entry_id,
    ulk.knowledge_state
  from public.user_learning_unit_knowledge ulk
  join public.irregular_verbs iv
    on coalesce(ulk.unit_id, '') = coalesce(iv.id::text, '')
  where ulk.unit_type = 'irregular'
    and iv.entry_id is not null
),

-- 6) Aggregate morphology_state per (student_id, entry_id)
irregular_agg as (
  select
    ir.student_id,
    ir.entry_id,
    case
      when count(*) filter (where ir.knowledge_state is not null) = 0 then null
      when bool_or(coalesce(ir.knowledge_state, '') = 'unstable') then 'unstable'
      when bool_or(coalesce(ir.knowledge_state, '') = 'improving') then 'improving'
      when bool_and(coalesce(ir.knowledge_state, '') = 'mastered') then 'mastered'
      else null
    end as morphology_state
  from irregular_rows ir
  group by ir.student_id, ir.entry_id
),

-- 7) Base keyset: exactly one row per (student_id, entry_id)
base_pairs as (
  select student_id, entry_id from sense_rows
  union
  select student_id, entry_id from cluster_rows
  union
  select student_id, entry_id from irregular_rows
)

select
  bp.student_id,
  bp.entry_id,
  le.lemma,
  sa.meaning_state,
  ca.usage_state,
  ia.morphology_state
from base_pairs bp
join public.lexicon_entries le
  on le.id = bp.entry_id
left join sense_agg sa
  on sa.student_id = bp.student_id
 and sa.entry_id = bp.entry_id
left join cluster_agg ca
  on ca.student_id = bp.student_id
 and ca.entry_id = bp.entry_id
left join irregular_agg ia
  on ia.student_id = bp.student_id
 and ia.entry_id = bp.entry_id;
