-- Migration: Add vocab packs (sense-based flashcard packs)
-- Date: 2026-01-28
--
-- Packs are curated, sense-based sets of flashcards (lexicon_senses)
-- Users can train without adding words to their pool.

begin;

-- ============================================
-- TABLE: vocab_packs
-- ============================================
create table if not exists vocab_packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  is_published boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_vocab_packs_is_published on vocab_packs(is_published);
create index if not exists idx_vocab_packs_order_index on vocab_packs(order_index);

-- ============================================
-- TABLE: vocab_pack_items
-- ============================================
create table if not exists vocab_pack_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references vocab_packs(id) on delete cascade,
  sense_id uuid not null references lexicon_senses(id) on delete restrict,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  constraint vocab_pack_items_unique unique (pack_id, sense_id)
);

create index if not exists idx_vocab_pack_items_pack_order on vocab_pack_items(pack_id, order_index);

-- ============================================
-- UPDATE: vocab_answer_events (add pack_id)
-- ============================================
alter table if exists vocab_answer_events
  add column if not exists pack_id uuid references vocab_packs(id);

create index if not exists idx_vocab_answer_events_pack_id_created_at
  on vocab_answer_events(pack_id, created_at);

-- ============================================
-- RLS POLICIES
-- ============================================
alter table vocab_packs enable row level security;
alter table vocab_pack_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_packs' and policyname = 'Vocab packs: authenticated select'
  ) then
    create policy "Vocab packs: authenticated select"
      on vocab_packs
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_packs' and policyname = 'Vocab packs: admin manage all'
  ) then
    create policy "Vocab packs: admin manage all"
      on vocab_packs
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_pack_items' and policyname = 'Vocab pack items: authenticated select'
  ) then
    create policy "Vocab pack items: authenticated select"
      on vocab_pack_items
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_pack_items' and policyname = 'Vocab pack items: admin manage all'
  ) then
    create policy "Vocab pack items: admin manage all"
      on vocab_pack_items
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end
$$;

-- ============================================
-- SEED: Pack "W sklepie" (shop)
-- ============================================
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('shop', 'W sklepie', 'Słownictwo przydatne podczas zakupów.', true, 1)
on conflict (slug) do nothing;

-- Item 1: shop
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, 1
from vocab_packs p
join lexicon_entries e on e.lemma_norm = 'shop'
join lexicon_senses s on s.entry_id = e.id
where p.slug = 'shop'
order by s.sense_order asc
limit 1
on conflict (pack_id, sense_id) do nothing;

-- Item 2: price
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, 2
from vocab_packs p
join lexicon_entries e on e.lemma_norm = 'price'
join lexicon_senses s on s.entry_id = e.id
where p.slug = 'shop'
order by s.sense_order asc
limit 1
on conflict (pack_id, sense_id) do nothing;

-- Item 3: cashier
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, 3
from vocab_packs p
join lexicon_entries e on e.lemma_norm = 'cashier'
join lexicon_senses s on s.entry_id = e.id
where p.slug = 'shop'
order by s.sense_order asc
limit 1
on conflict (pack_id, sense_id) do nothing;

commit;
