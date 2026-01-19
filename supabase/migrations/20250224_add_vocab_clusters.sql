-- Migration: Add vocab clusters for disambiguation drill
-- Date: 2025-02-24
--
-- Clusters = groups of similar words that learners confuse (e.g., make/do/take/get)
-- Users practice choosing the correct word in context

-- ============================================
-- TABLE: vocab_clusters
-- ============================================
create table if not exists vocab_clusters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, -- 'make-do-take-get', 'say-tell', 'lend-borrow-rent-hire'
  title text not null, -- Display name
  is_recommended boolean not null default false, -- Always unlocked (B, C)
  is_unlockable boolean not null default false, -- Unlocks when user has all words (A)
  created_at timestamptz not null default now()
);

create index if not exists idx_vocab_clusters_slug on vocab_clusters(slug);
create index if not exists idx_vocab_clusters_is_recommended on vocab_clusters(is_recommended);
create index if not exists idx_vocab_clusters_is_unlockable on vocab_clusters(is_unlockable);

-- ============================================
-- TABLE: vocab_cluster_entries
-- ============================================
create table if not exists vocab_cluster_entries (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references vocab_clusters(id) on delete cascade,
  entry_id uuid not null references lexicon_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint vocab_cluster_entries_unique unique (cluster_id, entry_id)
);

create index if not exists idx_vocab_cluster_entries_cluster_id on vocab_cluster_entries(cluster_id);
create index if not exists idx_vocab_cluster_entries_entry_id on vocab_cluster_entries(entry_id);

-- ============================================
-- TABLE: user_unlocked_vocab_clusters
-- ============================================
create table if not exists user_unlocked_vocab_clusters (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  cluster_id uuid not null references vocab_clusters(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  constraint user_unlocked_vocab_clusters_unique unique (student_id, cluster_id)
);

create index if not exists idx_user_unlocked_vocab_clusters_student_id on user_unlocked_vocab_clusters(student_id);
create index if not exists idx_user_unlocked_vocab_clusters_cluster_id on user_unlocked_vocab_clusters(cluster_id);

-- ============================================
-- UPDATE: vocab_answer_events (add context fields and make user_vocab_item_id nullable)
-- ============================================
-- Make user_vocab_item_id nullable for cluster practice (not always tied to specific user vocab item)
alter table if exists vocab_answer_events
  alter column user_vocab_item_id drop not null;

-- Make test_run_id nullable for cluster practice (no test_run for cluster exercises)
alter table if exists vocab_answer_events
  alter column test_run_id drop not null;

-- Add context fields
alter table if exists vocab_answer_events
  add column if not exists context_type text,
  add column if not exists context_id text;

create index if not exists idx_vocab_answer_events_context on vocab_answer_events(context_type, context_id);

-- Update question_mode constraint to allow 'cluster-choice'
alter table if exists vocab_answer_events 
  drop constraint if exists vocab_answer_events_question_mode_check;

alter table if exists vocab_answer_events
  add constraint vocab_answer_events_question_mode_check check (question_mode in ('en-pl', 'pl-en', 'cluster-choice'));

-- ============================================
-- RLS POLICIES
-- ============================================

-- vocab_clusters: public read-only for authenticated users
alter table vocab_clusters enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_clusters' and policyname = 'Vocab clusters: authenticated select'
  ) then
    create policy "Vocab clusters: authenticated select"
      on vocab_clusters
      for select
      using (auth.uid() is not null);
  end if;
end
$$;

-- vocab_cluster_entries: public read-only for authenticated users
alter table vocab_cluster_entries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_cluster_entries' and policyname = 'Vocab cluster entries: authenticated select'
  ) then
    create policy "Vocab cluster entries: authenticated select"
      on vocab_cluster_entries
      for select
      using (auth.uid() is not null);
  end if;
end
$$;

-- user_unlocked_vocab_clusters: student can select/insert own
alter table user_unlocked_vocab_clusters enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_unlocked_vocab_clusters' and policyname = 'User unlocked vocab clusters: student select own'
  ) then
    create policy "User unlocked vocab clusters: student select own"
      on user_unlocked_vocab_clusters
      for select
      using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_unlocked_vocab_clusters' and policyname = 'User unlocked vocab clusters: student insert own'
  ) then
    create policy "User unlocked vocab clusters: student insert own"
      on user_unlocked_vocab_clusters
      for insert
      with check (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_unlocked_vocab_clusters' and policyname = 'User unlocked vocab clusters: admin select all'
  ) then
    create policy "User unlocked vocab clusters: admin select all"
      on user_unlocked_vocab_clusters
      for select
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_unlocked_vocab_clusters' and policyname = 'User unlocked vocab clusters: admin manage all'
  ) then
    create policy "User unlocked vocab clusters: admin manage all"
      on user_unlocked_vocab_clusters
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end
$$;

-- ============================================
-- SEED DATA: 3 clusters
-- ============================================

-- Cluster B: make/do/take/get (recommended)
insert into vocab_clusters (slug, title, is_recommended, is_unlockable)
values ('make-do-take-get', 'make / do / take / get', true, false)
on conflict (slug) do nothing;

-- Cluster C: say/tell (recommended)
insert into vocab_clusters (slug, title, is_recommended, is_unlockable)
values ('say-tell', 'say / tell', true, false)
on conflict (slug) do nothing;

-- Cluster A: lend/borrow/rent/hire (unlockable)
insert into vocab_clusters (slug, title, is_recommended, is_unlockable)
values ('lend-borrow-rent-hire', 'lend / borrow / rent / hire', false, true)
on conflict (slug) do nothing;

-- Note: vocab_cluster_entries will be populated by a separate script
-- that looks up entry_id from lexicon_entries by lemma_norm
