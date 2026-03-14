-- Migration: add target_tokens for cluster translation validation
-- Date: 2026-03-13
-- Goal: support lemma-family validation for translation tasks

begin;

alter table public.vocab_cluster_questions
  add column if not exists target_tokens text[];

update public.vocab_cluster_questions q
set target_tokens = array[le.lemma_norm]::text[]
from public.vocab_cluster_entries vce
join public.lexicon_entries le
  on le.id = vce.entry_id
where q.correct_entry_id = vce.id
  and q.task_type = 'translation'
  and (q.target_tokens is null or cardinality(q.target_tokens) = 0)
  and le.lemma_norm is not null;

commit;
