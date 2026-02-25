-- Migration: Intelligent Suggestions Engine v2 materialized views
-- Date: 2026-02-20

drop materialized view if exists public.mv_user_pack_accuracy;
create materialized view public.mv_user_pack_accuracy as
with base as (
  select
    vae.student_id,
    vae.pack_id,
    vp.slug as pack_slug,
    vae.evaluation
  from public.vocab_answer_events vae
  join public.vocab_packs vp on vp.id = vae.pack_id
  where vae.context_type = 'vocab_pack'
    and vae.question_mode in ('en-pl', 'pl-en')
    and vae.pack_id is not null
    and vae.evaluation in ('correct', 'wrong')
)
select
  b.student_id,
  b.pack_id,
  b.pack_slug,
  count(*)::bigint as total_answers,
  count(*) filter (where b.evaluation = 'correct')::bigint as correct_answers,
  (
    count(*) filter (where b.evaluation = 'correct')::double precision
    / nullif(count(*)::double precision, 0.0)
  ) as accuracy
from base b
group by b.student_id, b.pack_id, b.pack_slug
with data;

create unique index idx_mv_user_pack_accuracy_unique
  on public.mv_user_pack_accuracy(student_id, pack_id);

create index idx_mv_user_pack_accuracy_student_accuracy
  on public.mv_user_pack_accuracy(student_id, accuracy);

drop materialized view if exists public.mv_user_cluster_accuracy;
create materialized view public.mv_user_cluster_accuracy as
with base as (
  select
    vae.student_id,
    vae.context_id as cluster_slug,
    vae.evaluation
  from public.vocab_answer_events vae
  where vae.context_type = 'vocab_cluster'
    and vae.context_id is not null
    and vae.evaluation in ('correct', 'wrong')
)
select
  b.student_id,
  b.cluster_slug,
  count(*)::bigint as total_answers,
  count(*) filter (where b.evaluation = 'correct')::bigint as correct_answers,
  (
    count(*) filter (where b.evaluation = 'correct')::double precision
    / nullif(count(*)::double precision, 0.0)
  ) as accuracy
from base b
group by b.student_id, b.cluster_slug
with data;

create unique index idx_mv_user_cluster_accuracy_unique
  on public.mv_user_cluster_accuracy(student_id, cluster_slug);

create index idx_mv_user_cluster_accuracy_student_accuracy
  on public.mv_user_cluster_accuracy(student_id, accuracy);

create or replace function public.refresh_intelligent_suggestion_views()
returns void
language plpgsql
as $$
begin
  refresh materialized view concurrently public.mv_user_pack_accuracy;
  refresh materialized view concurrently public.mv_user_cluster_accuracy;
end;
$$;

revoke all on public.mv_user_pack_accuracy from anon;
revoke all on public.mv_user_cluster_accuracy from anon;
grant select on public.mv_user_pack_accuracy to authenticated;
grant select on public.mv_user_cluster_accuracy to authenticated;
grant select on public.mv_user_pack_accuracy to service_role;
grant select on public.mv_user_cluster_accuracy to service_role;
