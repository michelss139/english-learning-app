begin;

-- =========================================================
-- 0) HARD RESET PYTAŃ (żeby FK dało się założyć bez błędów)
-- =========================================================
-- Chcesz clean slate: kasujemy wszystkie pytania (to tylko moduł clusterów).
delete from public.vocab_cluster_questions;

-- =========================================================
-- 1) UPEWNIJ SIĘ, ŻE vocab_cluster_entries MA STABILNE id
-- =========================================================

-- 1a) Dodaj kolumnę id jeśli jej nie ma
alter table public.vocab_cluster_entries
  add column if not exists id uuid;

-- 1b) Ustaw domyślną wartość (dla nowych wierszy)
alter table public.vocab_cluster_entries
  alter column id set default gen_random_uuid();

-- 1c) Backfill dla istniejących wierszy
update public.vocab_cluster_entries
set id = gen_random_uuid()
where id is null;

-- 1d) NOT NULL na id
alter table public.vocab_cluster_entries
  alter column id set not null;

-- 1e) UNIQUE na id (żeby było targetem FK)
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'vocab_cluster_entries'
      and constraint_name = 'vocab_cluster_entries_id_key'
  ) then
    alter table public.vocab_cluster_entries
      add constraint vocab_cluster_entries_id_key unique (id);
  end if;
end $$;

-- 1f) (Opcjonalnie, ale praktyczne) UNIQUE (cluster_id, entry_id) pod ON CONFLICT
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'vocab_cluster_entries'
      and constraint_name = 'vocab_cluster_entries_cluster_id_entry_id_key'
  ) then
    alter table public.vocab_cluster_entries
      add constraint vocab_cluster_entries_cluster_id_entry_id_key unique (cluster_id, entry_id);
  end if;
end $$;

-- =========================================================
-- 2) NAPRAW vocab_cluster_questions: constraints + FK
-- =========================================================

-- 2a) Napraw constraint długości choices na 2–4
alter table public.vocab_cluster_questions
  drop constraint if exists vocab_cluster_questions_choices_len;

alter table public.vocab_cluster_questions
  add constraint vocab_cluster_questions_choices_len
  check (array_length(choices, 1) between 2 and 4);

-- 2b) Napraw FK correct_entry_id -> vocab_cluster_entries(id)
alter table public.vocab_cluster_questions
  drop constraint if exists vocab_cluster_questions_correct_entry_id_fkey;

alter table public.vocab_cluster_questions
  add constraint vocab_cluster_questions_correct_entry_id_fkey
  foreign key (correct_entry_id) references public.vocab_cluster_entries(id) on delete cascade;

-- =========================================================
-- 3) CLEAN SLATE CLUSTERÓW (stare + ewentualnie nowe po próbach)
-- =========================================================

-- Czyścimy po slugach: stare + nowe docelowe (żeby migracja była idempotentna)
with target_clusters as (
  select id
  from public.vocab_clusters
  where slug in (
    'make-do-take-get', 'say-tell', 'lend-borrow-rent-hire',        -- stare
    'make-do', 'get-take', 'say-tell-speak-talk', 'bring-take'      -- nowe (jeśli już były)
  )
)
delete from public.user_unlocked_vocab_clusters
where cluster_id in (select id from target_clusters);

with target_clusters as (
  select id
  from public.vocab_clusters
  where slug in (
    'make-do-take-get', 'say-tell', 'lend-borrow-rent-hire',
    'make-do', 'get-take', 'say-tell-speak-talk', 'bring-take'
  )
)
delete from public.vocab_cluster_entries
where cluster_id in (select id from target_clusters);

-- (pytania już skasowane globalnie na początku, więc tu nie musimy)

delete from public.vocab_clusters
where slug in (
  'make-do-take-get', 'say-tell', 'lend-borrow-rent-hire',
  'make-do', 'get-take', 'say-tell-speak-talk', 'bring-take'
);

-- =========================================================
-- 4) DODAJ 5 NOWYCH CLUSTERÓW
-- =========================================================

insert into public.vocab_clusters (slug, title, is_recommended, is_unlockable)
values
  ('make-do', 'make / do', true, false),
  ('get-take', 'get / take', true, false),
  ('say-tell-speak-talk', 'say / tell / speak / talk', true, false),
  ('lend-borrow-rent-hire', 'lend / borrow / rent / hire', true, false),
  ('bring-take', 'bring / take', true, false);

-- =========================================================
-- 5) SEED vocab_cluster_entries (mapowanie do lexicon_entries)
-- =========================================================

insert into public.vocab_cluster_entries (cluster_id, entry_id)
select c.id, e.id
from public.vocab_clusters c
join public.lexicon_entries e
  on e.pos = 'verb'
 and (
    (c.slug = 'make-do' and e.lemma_norm in ('make', 'do')) or
    (c.slug = 'get-take' and e.lemma_norm in ('get', 'take')) or
    (c.slug = 'say-tell-speak-talk' and e.lemma_norm in ('say', 'tell', 'speak', 'talk')) or
    (c.slug = 'lend-borrow-rent-hire' and e.lemma_norm in ('lend', 'borrow', 'rent', 'hire')) or
    (c.slug = 'bring-take' and e.lemma_norm in ('bring', 'take'))
 )
on conflict (cluster_id, entry_id) do nothing;

-- =========================================================
-- 6) SEED vocab_cluster_questions (1 na cluster, wg Twoich przykładów)
--    correct_entry_id = vocab_cluster_entries.id (surrogate)
-- =========================================================

-- make/do
insert into public.vocab_cluster_questions (cluster_id, prompt, slot, correct_entry_id, correct_choice, choices, explanation)
select
  c.id,
  'How often do you ___ breakfast?',
  'base',
  vce.id,
  'make',
  array['make','do']::text[],
  null
from public.vocab_clusters c
join public.vocab_cluster_entries vce on vce.cluster_id = c.id
join public.lexicon_entries le on le.id = vce.entry_id
where c.slug = 'make-do' and le.lemma_norm = 'make'
limit 1;

-- get/take
insert into public.vocab_cluster_questions (cluster_id, prompt, slot, correct_entry_id, correct_choice, choices, explanation)
select
  c.id,
  'It ____ me around 5 years to learn English perfectly.',
  'past_simple',
  vce.id,
  'took',
  array['got','took']::text[],
  null
from public.vocab_clusters c
join public.vocab_cluster_entries vce on vce.cluster_id = c.id
join public.lexicon_entries le on le.id = vce.entry_id
where c.slug = 'get-take' and le.lemma_norm = 'take'
limit 1;

-- say/tell/speak/talk
insert into public.vocab_cluster_questions (cluster_id, prompt, slot, correct_entry_id, correct_choice, choices, explanation)
select
  c.id,
  'We were ______ on the phone when my brother started playing guitar.',
  'ing_form',
  vce.id,
  'talking',
  array['saying','telling','speaking','talking']::text[],
  '''Speaking'' can also be possible in some contexts, but ''talking on the phone'' is the natural collocation.'
from public.vocab_clusters c
join public.vocab_cluster_entries vce on vce.cluster_id = c.id
join public.lexicon_entries le on le.id = vce.entry_id
where c.slug = 'say-tell-speak-talk' and le.lemma_norm = 'talk'
limit 1;

-- lend/borrow/rent/hire
insert into public.vocab_cluster_questions (cluster_id, prompt, slot, correct_entry_id, correct_choice, choices, explanation)
select
  c.id,
  'It''s always difficult to find a room to ____ in the high season.',
  'base',
  vce.id,
  'rent',
  array['lend','borrow','rent','hire']::text[],
  null
from public.vocab_clusters c
join public.vocab_cluster_entries vce on vce.cluster_id = c.id
join public.lexicon_entries le on le.id = vce.entry_id
where c.slug = 'lend-borrow-rent-hire' and le.lemma_norm = 'rent'
limit 1;

-- bring/take
insert into public.vocab_cluster_questions (cluster_id, prompt, slot, correct_entry_id, correct_choice, choices, explanation)
select
  c.id,
  'Have you ever ____ your dog to work',
  'past_participle',
  vce.id,
  'taken',
  array['taken','brought']::text[],
  '''Brought'' can be acceptable depending on perspective; here we test the typical usage you want.'
from public.vocab_clusters c
join public.vocab_cluster_entries vce on vce.cluster_id = c.id
join public.lexicon_entries le on le.id = vce.entry_id
where c.slug = 'bring-take' and le.lemma_norm = 'take'
limit 1;

commit;
