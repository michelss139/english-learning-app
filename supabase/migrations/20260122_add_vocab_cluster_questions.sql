-- Migration: Add vocab_cluster_questions table for cluster practice
-- Date: 2026-01-22
--
-- Goal: Manage cluster questions manually (not from lexicon_examples),
-- with strict form scoring (exact form only).
-- Clean slate: remove old clusters, seed new 5 clusters.

-- Ensure vocab_cluster_entries has a stable surrogate key `id`
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'vocab_cluster_entries'
  ) then
    -- Add id column if missing
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'vocab_cluster_entries'
        and column_name = 'id'
    ) then
      alter table vocab_cluster_entries
        add column id uuid default gen_random_uuid();
      
      -- Backfill existing rows
      update vocab_cluster_entries set id = gen_random_uuid() where id is null;
      
      -- Set NOT NULL
      alter table vocab_cluster_entries alter column id set not null;
    end if;

    -- Ensure `id` is unique so it can be a FK target
    if not exists (
      select 1
      from information_schema.table_constraints
      where constraint_schema = 'public'
        and table_name = 'vocab_cluster_entries'
        and constraint_type = 'UNIQUE'
        and constraint_name = 'vocab_cluster_entries_id_key'
    ) then
      alter table vocab_cluster_entries
        add constraint vocab_cluster_entries_id_key unique (id);
    end if;
  end if;
end
$$;

-- Now define vocab_cluster_questions, whose `correct_entry_id` will reference `vocab_cluster_entries(id)`
create table if not exists vocab_cluster_questions (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references vocab_clusters(id) on delete cascade,
  prompt text not null, -- sentence with gap "_____"
  slot text not null,   -- e.g. 'past_simple' | 'past_participle' | 'present_3sg' | 'base' | 'ing_form'
  correct_entry_id uuid not null, -- FK to vocab_cluster_entries(id) - set below
  correct_choice text not null, -- exact form, e.g. 'made'
  choices text[] not null,      -- 2-4 options, all same slot
  explanation text null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz null,
  constraint vocab_cluster_questions_choices_len check (array_length(choices, 1) between 2 and 4),
  constraint vocab_cluster_questions_correct_in_choices check (correct_choice = any(choices))
);

-- Fix FK if table already exists with wrong reference
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'vocab_cluster_questions') then
    -- Drop old FK if it exists (might reference lexicon_entries)
    alter table vocab_cluster_questions drop constraint if exists vocab_cluster_questions_correct_entry_id_fkey;
    -- Add correct FK to vocab_cluster_entries
    alter table vocab_cluster_questions 
      add constraint vocab_cluster_questions_correct_entry_id_fkey 
      foreign key (correct_entry_id) references vocab_cluster_entries(id) on delete cascade;
  end if;
end
$$;

-- Add FK if table was just created (and doesn't have it yet)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'vocab_cluster_questions'
      and constraint_name = 'vocab_cluster_questions_correct_entry_id_fkey'
  ) then
    alter table vocab_cluster_questions 
      add constraint vocab_cluster_questions_correct_entry_id_fkey 
      foreign key (correct_entry_id) references vocab_cluster_entries(id) on delete cascade;
  end if;
end
$$;

create index if not exists idx_vocab_cluster_questions_cluster_id
  on vocab_cluster_questions(cluster_id);

create index if not exists idx_vocab_cluster_questions_last_used_at
  on vocab_cluster_questions(cluster_id, last_used_at);

-- ============================================
-- RLS POLICIES
-- ============================================

alter table vocab_cluster_questions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vocab_cluster_questions'
      and policyname = 'Vocab cluster questions: authenticated select'
  ) then
    create policy "Vocab cluster questions: authenticated select"
      on vocab_cluster_questions
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vocab_cluster_questions'
      and policyname = 'Vocab cluster questions: admin manage all'
  ) then
    create policy "Vocab cluster questions: admin manage all"
      on vocab_cluster_questions
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end
$$;

-- ============================================
-- CLEAN SLATE: Remove old clusters
-- ============================================

-- Delete old cluster questions
delete from vocab_cluster_questions
where cluster_id in (
  select id from vocab_clusters
  where slug in ('make-do-take-get', 'say-tell', 'lend-borrow-rent-hire')
);

-- Delete old unlocked clusters
delete from user_unlocked_vocab_clusters
where cluster_id in (
  select id from vocab_clusters
  where slug in ('make-do-take-get', 'say-tell', 'lend-borrow-rent-hire')
);

-- Delete old cluster entries
delete from vocab_cluster_entries
where cluster_id in (
  select id from vocab_clusters
  where slug in ('make-do-take-get', 'say-tell', 'lend-borrow-rent-hire')
);

-- Delete old clusters
delete from vocab_clusters
where slug in ('make-do-take-get', 'say-tell', 'lend-borrow-rent-hire');

-- ============================================
-- SEED: New clusters (5)
-- ============================================

insert into vocab_clusters (slug, title, is_recommended, is_unlockable)
values
  ('make-do', 'make / do', true, false),
  ('get-take', 'get / take', true, false),
  ('say-tell-speak-talk', 'say / tell / speak / talk', true, false),
  ('lend-borrow-rent-hire', 'lend / borrow / rent / hire', true, false),
  ('bring-take', 'bring / take', true, false)
on conflict (slug) do nothing;

-- ============================================
-- SEED: vocab_cluster_entries
-- ============================================

insert into vocab_cluster_entries (cluster_id, entry_id)
select c.id, e.id
from vocab_clusters c
join lexicon_entries e on e.pos = 'verb'
  and (
    (c.slug = 'make-do' and e.lemma_norm in ('make', 'do')) or
    (c.slug = 'get-take' and e.lemma_norm in ('get', 'take')) or
    (c.slug = 'say-tell-speak-talk' and e.lemma_norm in ('say', 'tell', 'speak', 'talk')) or
    (c.slug = 'lend-borrow-rent-hire' and e.lemma_norm in ('lend', 'borrow', 'rent', 'hire')) or
    (c.slug = 'bring-take' and e.lemma_norm in ('bring', 'take'))
  )
on conflict (cluster_id, entry_id) do nothing;

-- ============================================
-- SEED: vocab_cluster_questions (minimal, 1 per cluster)
-- ============================================

-- Cluster: make-do
insert into vocab_cluster_questions (cluster_id, prompt, slot, correct_entry_id, correct_choice, choices, explanation)
select
  c.id as cluster_id,
  'How often do you ___ breakfast?' as prompt,
  'base' as slot,
  vce.id as correct_entry_id,
  'make' as correct_choice,
  array['make', 'do']::text[] as choices,
  null as explanation
from vocab_clusters c
join vocab_cluster_entries vce on vce.cluster_id = c.id
join lexicon_entries le on le.id = vce.entry_id
where c.slug = 'make-do'
  and le.lemma_norm = 'make'
limit 1
on conflict do nothing;

-- Cluster: get-take
insert into vocab_cluster_questions (cluster_id, prompt, slot, correct_entry_id, correct_choice, choices, explanation)
select
  c.id,
  'It ____ me around 5 years to learn English perfectly.' as prompt,
  'past_simple' as slot,
  vce.id,
  'took' as correct_choice,
  array['got', 'took']::text[] as choices,
  null as explanation
from vocab_clusters c
join vocab_cluster_entries vce on vce.cluster_id = c.id
join lexicon_entries le on le.id = vce.entry_id
where c.slug = 'get-take'
  and le.lemma_norm = 'take'
limit 1
on conflict do nothing;

-- Cluster: say-tell-speak-talk
insert into vocab_cluster_questions (cluster_id, prompt, slot, correct_entry_id, correct_choice, choices, explanation)
select
  c.id,
  'We were ______ on the phone when my brother started playing guitar.' as prompt,
  'ing_form' as slot,
  vce.id,
  'talking' as correct_choice,
  array['saying', 'telling', 'speaking', 'talking']::text[] as choices,
  '''Speaking'' can also be possible in some contexts, but ''talking on the phone'' is the natural collocation.' as explanation
from vocab_clusters c
join vocab_cluster_entries vce on vce.cluster_id = c.id
join lexicon_entries le on le.id = vce.entry_id
where c.slug = 'say-tell-speak-talk'
  and le.lemma_norm = 'talk'
limit 1
on conflict do nothing;

-- Cluster: lend-borrow-rent-hire
insert into vocab_cluster_questions (cluster_id, prompt, slot, correct_entry_id, correct_choice, choices, explanation)
select
  c.id,
  'It''s always difficult to find a room to ____ in the high season.' as prompt,
  'base' as slot,
  vce.id,
  'rent' as correct_choice,
  array['lend', 'borrow', 'rent', 'hire']::text[] as choices,
  null as explanation
from vocab_clusters c
join vocab_cluster_entries vce on vce.cluster_id = c.id
join lexicon_entries le on le.id = vce.entry_id
where c.slug = 'lend-borrow-rent-hire'
  and le.lemma_norm = 'rent'
limit 1
on conflict do nothing;

-- Cluster: bring-take
insert into vocab_cluster_questions (cluster_id, prompt, slot, correct_entry_id, correct_choice, choices, explanation)
select
  c.id,
  'Have you ever ____ your dog to work' as prompt,
  'past_participle' as slot,
  vce.id,
  'taken' as correct_choice,
  array['taken', 'brought']::text[] as choices,
  '''Brought'' can be acceptable depending on perspective; here we test the typical usage you want.' as explanation
from vocab_clusters c
join vocab_cluster_entries vce on vce.cluster_id = c.id
join lexicon_entries le on le.id = vce.entry_id
where c.slug = 'bring-take'
  and le.lemma_norm = 'take'
limit 1
on conflict do nothing;
