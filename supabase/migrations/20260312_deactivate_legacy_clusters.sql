-- Migration: Deactivate legacy vocab clusters in UI
-- Date: 2026-03-12
-- Goal: keep legacy cluster data, but only expose make-do in the clusters catalog

begin;

update public.vocab_clusters
set is_recommended = case when slug = 'make-do' then true else false end
where slug in (
  'make-do',
  'make-do-take-get',
  'get-take',
  'say-tell',
  'say-tell-speak-talk',
  'lend-borrow-rent-hire',
  'bring-take',
  'tenses'
);

commit;
