-- Migration: XP/Levels + Badges
-- Date: 2026-01-28

begin;

-- ============================================
-- TABLE: user_xp
-- ============================================
create table if not exists user_xp (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp_total int not null default 0,
  level int not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================
-- TABLE: xp_events
-- ============================================
create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  source_slug text null,
  session_id uuid not null,
  awarded_on date not null,
  dedupe_key text not null,
  xp_awarded int not null,
  perfect boolean not null,
  meta jsonb null,
  created_at timestamptz not null default now(),
  constraint xp_events_dedupe_unique unique (user_id, dedupe_key, awarded_on)
);

create index if not exists idx_xp_events_user_created_at on xp_events(user_id, created_at);
create index if not exists idx_xp_events_dedupe_awarded on xp_events(dedupe_key, awarded_on);

-- ============================================
-- TABLE: badges
-- ============================================
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text null,
  icon text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================
-- TABLE: user_badges
-- ============================================
create table if not exists user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  source text null,
  source_slug text null,
  meta jsonb null,
  primary key (user_id, badge_id)
);

create index if not exists idx_user_badges_user_awarded_at on user_badges(user_id, awarded_at);

-- ============================================
-- UPDATE: irregular_verb_runs (add session_id)
-- ============================================
alter table if exists irregular_verb_runs
  add column if not exists session_id uuid;

-- ============================================
-- RLS POLICIES
-- ============================================
alter table user_xp enable row level security;
alter table xp_events enable row level security;
alter table badges enable row level security;
alter table user_badges enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_xp' and policyname = 'User xp: authenticated select own'
  ) then
    create policy "User xp: authenticated select own"
      on user_xp
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'xp_events' and policyname = 'XP events: authenticated select own'
  ) then
    create policy "XP events: authenticated select own"
      on xp_events
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'badges' and policyname = 'Badges: authenticated select'
  ) then
    create policy "Badges: authenticated select"
      on badges
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_badges' and policyname = 'User badges: authenticated select own'
  ) then
    create policy "User badges: authenticated select own"
      on user_badges
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

-- ============================================
-- SEED: initial badge
-- ============================================
insert into badges (slug, title, description, icon, is_active)
values (
  'pack_shop_master',
  'Mistrz fiszek: W sklepie',
  'Ukończ pakiet „W sklepie” bezbłędnie.',
  null,
  true
)
on conflict (slug) do nothing;

commit;
