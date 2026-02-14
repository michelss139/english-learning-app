-- Placeholder cluster "tenses" for grammar typical errors (link from Present Simple map)
-- One question: "Does she works?" -> Yes/No, correct: No

begin;

insert into public.vocab_clusters (slug, title, is_recommended, is_unlockable)
values ('tenses', 'Czasy – typowe błędy', true, false)
on conflict (slug) do nothing;

-- One cluster entry (required for vocab_cluster_questions FK): use any lexicon entry
insert into public.vocab_cluster_entries (cluster_id, entry_id)
select c.id, (select id from public.lexicon_entries limit 1)
from public.vocab_clusters c
where c.slug = 'tenses'
  and exists (select 1 from public.lexicon_entries limit 1)
on conflict (cluster_id, entry_id) do nothing;

-- One placeholder question (only if not already present)
insert into public.vocab_cluster_questions (cluster_id, prompt, slot, correct_entry_id, correct_choice, choices, explanation)
select
  c.id,
  'Does she works?',
  'grammar',
  vce.id,
  'No',
  array['Yes', 'No']::text[],
  'Correct form: Does she work? (no -s after does)'
from public.vocab_clusters c
join public.vocab_cluster_entries vce on vce.cluster_id = c.id
where c.slug = 'tenses'
  and not exists (
    select 1 from public.vocab_cluster_questions q
    where q.cluster_id = c.id and q.prompt = 'Does she works?'
  )
limit 1;

commit;
