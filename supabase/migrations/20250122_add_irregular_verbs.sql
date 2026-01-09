-- Migration: Irregular Verbs Module
-- Creates tables for irregular verbs testing feature
-- Date: 2025-01-22

-- ============================================
-- TABLE: irregular_verbs (global, system-wide)
-- ============================================
create table if not exists irregular_verbs (
  id uuid primary key default gen_random_uuid(),
  base text not null,
  base_norm text not null,
  past_simple text not null,
  past_simple_variants text[],
  past_participle text not null,
  past_participle_variants text[],
  created_at timestamptz not null default now(),
  constraint irregular_verbs_base_norm_unique unique (base_norm)
);

create index if not exists idx_irregular_verbs_base_norm on irregular_verbs(base_norm);

-- ============================================
-- TABLE: user_irregular_verbs (user-verb links)
-- ============================================
create table if not exists user_irregular_verbs (
  student_id uuid not null references profiles(id) on delete cascade,
  irregular_verb_id uuid not null references irregular_verbs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, irregular_verb_id)
);

create index if not exists idx_user_irregular_verbs_student on user_irregular_verbs(student_id);
create index if not exists idx_user_irregular_verbs_verb on user_irregular_verbs(irregular_verb_id);

-- ============================================
-- TABLE: irregular_verb_runs (exercise logs)
-- ============================================
create table if not exists irregular_verb_runs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  irregular_verb_id uuid not null references irregular_verbs(id) on delete cascade,
  entered_past_simple text,
  entered_past_participle text,
  correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_irregular_verb_runs_student on irregular_verb_runs(student_id);
create index if not exists idx_irregular_verb_runs_verb on irregular_verb_runs(irregular_verb_id);
create index if not exists idx_irregular_verb_runs_created on irregular_verb_runs(created_at desc);

-- ============================================
-- RLS: irregular_verbs
-- ============================================
alter table irregular_verbs enable row level security;

do $$
begin
  -- SELECT: all authenticated users can read
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irregular_verbs' and policyname = 'Irregular verbs: authenticated select'
  ) then
    create policy "Irregular verbs: authenticated select"
      on irregular_verbs
      for select
      using (auth.uid() is not null);
  end if;

  -- INSERT: only admin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irregular_verbs' and policyname = 'Irregular verbs: admin insert'
  ) then
    create policy "Irregular verbs: admin insert"
      on irregular_verbs
      for insert
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  -- UPDATE: only admin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irregular_verbs' and policyname = 'Irregular verbs: admin update'
  ) then
    create policy "Irregular verbs: admin update"
      on irregular_verbs
      for update
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  -- DELETE: only admin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irregular_verbs' and policyname = 'Irregular verbs: admin delete'
  ) then
    create policy "Irregular verbs: admin delete"
      on irregular_verbs
      for delete
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end
$$;

-- ============================================
-- RLS: user_irregular_verbs
-- ============================================
alter table user_irregular_verbs enable row level security;

do $$
begin
  -- SELECT: student sees own + admin sees all
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_irregular_verbs' and policyname = 'User irregular verbs: student select own'
  ) then
    create policy "User irregular verbs: student select own"
      on user_irregular_verbs
      for select
      using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_irregular_verbs' and policyname = 'User irregular verbs: admin select all'
  ) then
    create policy "User irregular verbs: admin select all"
      on user_irregular_verbs
      for select
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  -- INSERT: student can add own + admin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_irregular_verbs' and policyname = 'User irregular verbs: student insert own'
  ) then
    create policy "User irregular verbs: student insert own"
      on user_irregular_verbs
      for insert
      with check (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_irregular_verbs' and policyname = 'User irregular verbs: admin insert'
  ) then
    create policy "User irregular verbs: admin insert"
      on user_irregular_verbs
      for insert
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  -- DELETE: student can delete own + admin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_irregular_verbs' and policyname = 'User irregular verbs: student delete own'
  ) then
    create policy "User irregular verbs: student delete own"
      on user_irregular_verbs
      for delete
      using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_irregular_verbs' and policyname = 'User irregular verbs: admin delete'
  ) then
    create policy "User irregular verbs: admin delete"
      on user_irregular_verbs
      for delete
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end
$$;

-- ============================================
-- RLS: irregular_verb_runs
-- ============================================
alter table irregular_verb_runs enable row level security;

do $$
begin
  -- SELECT: student sees own + admin sees all
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irregular_verb_runs' and policyname = 'Irregular verb runs: student select own'
  ) then
    create policy "Irregular verb runs: student select own"
      on irregular_verb_runs
      for select
      using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irregular_verb_runs' and policyname = 'Irregular verb runs: admin select all'
  ) then
    create policy "Irregular verb runs: admin select all"
      on irregular_verb_runs
      for select
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  -- INSERT: student can add own + admin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irregular_verb_runs' and policyname = 'Irregular verb runs: student insert own'
  ) then
    create policy "Irregular verb runs: student insert own"
      on irregular_verb_runs
      for insert
      with check (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irregular_verb_runs' and policyname = 'Irregular verb runs: admin insert'
  ) then
    create policy "Irregular verb runs: admin insert"
      on irregular_verb_runs
      for insert
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end
$$;

-- ============================================
-- SEED DATA: Insert irregular verbs
-- Source: Standard educational list (public domain)
-- License: Educational use, public domain
-- ============================================

-- Helper function to parse variants (e.g. "was/were" -> ["was", "were"])
-- We'll handle variants in the seed data below

insert into irregular_verbs (base, base_norm, past_simple, past_simple_variants, past_participle, past_participle_variants)
values
  ('be', 'be', 'was', ARRAY['were'], 'been', NULL),
  ('beat', 'beat', 'beat', NULL, 'beaten', NULL),
  ('become', 'become', 'became', NULL, 'become', NULL),
  ('begin', 'begin', 'began', NULL, 'begun', NULL),
  ('bend', 'bend', 'bent', NULL, 'bent', NULL),
  ('bet', 'bet', 'bet', NULL, 'bet', NULL),
  ('bite', 'bite', 'bit', NULL, 'bitten', NULL),
  ('blow', 'blow', 'blew', NULL, 'blown', NULL),
  ('break', 'break', 'broke', NULL, 'broken', NULL),
  ('bring', 'bring', 'brought', NULL, 'brought', NULL),
  ('build', 'build', 'built', NULL, 'built', NULL),
  ('burn', 'burn', 'burned', ARRAY['burnt'], 'burned', ARRAY['burnt']),
  ('buy', 'buy', 'bought', NULL, 'bought', NULL),
  ('catch', 'catch', 'caught', NULL, 'caught', NULL),
  ('choose', 'choose', 'chose', NULL, 'chosen', NULL),
  ('come', 'come', 'came', NULL, 'come', NULL),
  ('cost', 'cost', 'cost', NULL, 'cost', NULL),
  ('cut', 'cut', 'cut', NULL, 'cut', NULL),
  ('deal', 'deal', 'dealt', NULL, 'dealt', NULL),
  ('dig', 'dig', 'dug', NULL, 'dug', NULL),
  ('do', 'do', 'did', NULL, 'done', NULL),
  ('draw', 'draw', 'drew', NULL, 'drawn', NULL),
  ('dream', 'dream', 'dreamed', ARRAY['dreamt'], 'dreamed', ARRAY['dreamt']),
  ('drink', 'drink', 'drank', NULL, 'drunk', NULL),
  ('drive', 'drive', 'drove', NULL, 'driven', NULL),
  ('eat', 'eat', 'ate', NULL, 'eaten', NULL),
  ('fall', 'fall', 'fell', NULL, 'fallen', NULL),
  ('feed', 'feed', 'fed', NULL, 'fed', NULL),
  ('feel', 'feel', 'felt', NULL, 'felt', NULL),
  ('fight', 'fight', 'fought', NULL, 'fought', NULL),
  ('find', 'find', 'found', NULL, 'found', NULL),
  ('fly', 'fly', 'flew', NULL, 'flown', NULL),
  ('forget', 'forget', 'forgot', NULL, 'forgotten', NULL),
  ('forgive', 'forgive', 'forgave', NULL, 'forgiven', NULL),
  ('freeze', 'freeze', 'froze', NULL, 'frozen', NULL),
  ('get', 'get', 'got', NULL, 'got', ARRAY['gotten']),
  ('give', 'give', 'gave', NULL, 'given', NULL),
  ('go', 'go', 'went', NULL, 'gone', NULL),
  ('grow', 'grow', 'grew', NULL, 'grown', NULL),
  ('hang', 'hang', 'hung', NULL, 'hung', NULL),
  ('have', 'have', 'had', NULL, 'had', NULL),
  ('hear', 'hear', 'heard', NULL, 'heard', NULL),
  ('hide', 'hide', 'hid', NULL, 'hidden', NULL),
  ('hit', 'hit', 'hit', NULL, 'hit', NULL),
  ('hold', 'hold', 'held', NULL, 'held', NULL),
  ('hurt', 'hurt', 'hurt', NULL, 'hurt', NULL),
  ('keep', 'keep', 'kept', NULL, 'kept', NULL),
  ('know', 'know', 'knew', NULL, 'known', NULL),
  ('lay', 'lay', 'laid', NULL, 'laid', NULL),
  ('lead', 'lead', 'led', NULL, 'led', NULL),
  ('learn', 'learn', 'learned', ARRAY['learnt'], 'learned', ARRAY['learnt']),
  ('leave', 'leave', 'left', NULL, 'left', NULL),
  ('lend', 'lend', 'lent', NULL, 'lent', NULL),
  ('let', 'let', 'let', NULL, 'let', NULL),
  ('lie', 'lie', 'lay', NULL, 'lain', NULL),
  ('light', 'light', 'lit', NULL, 'lit', NULL),
  ('lose', 'lose', 'lost', NULL, 'lost', NULL),
  ('make', 'make', 'made', NULL, 'made', NULL),
  ('mean', 'mean', 'meant', NULL, 'meant', NULL),
  ('meet', 'meet', 'met', NULL, 'met', NULL),
  ('pay', 'pay', 'paid', NULL, 'paid', NULL),
  ('put', 'put', 'put', NULL, 'put', NULL),
  ('read', 'read', 'read', NULL, 'read', NULL),
  ('ride', 'ride', 'rode', NULL, 'ridden', NULL),
  ('ring', 'ring', 'rang', NULL, 'rung', NULL),
  ('rise', 'rise', 'rose', NULL, 'risen', NULL),
  ('run', 'run', 'ran', NULL, 'run', NULL),
  ('say', 'say', 'said', NULL, 'said', NULL),
  ('see', 'see', 'saw', NULL, 'seen', NULL),
  ('sell', 'sell', 'sold', NULL, 'sold', NULL),
  ('send', 'send', 'sent', NULL, 'sent', NULL),
  ('set', 'set', 'set', NULL, 'set', NULL),
  ('shake', 'shake', 'shook', NULL, 'shaken', NULL),
  ('shine', 'shine', 'shone', NULL, 'shone', NULL),
  ('shoot', 'shoot', 'shot', NULL, 'shot', NULL),
  ('show', 'show', 'showed', NULL, 'shown', NULL),
  ('shut', 'shut', 'shut', NULL, 'shut', NULL),
  ('sing', 'sing', 'sang', NULL, 'sung', NULL),
  ('sink', 'sink', 'sank', NULL, 'sunk', NULL),
  ('sit', 'sit', 'sat', NULL, 'sat', NULL),
  ('sleep', 'sleep', 'slept', NULL, 'slept', NULL),
  ('speak', 'speak', 'spoke', NULL, 'spoken', NULL),
  ('spend', 'spend', 'spent', NULL, 'spent', NULL),
  ('stand', 'stand', 'stood', NULL, 'stood', NULL),
  ('steal', 'steal', 'stole', NULL, 'stolen', NULL),
  ('stick', 'stick', 'stuck', NULL, 'stuck', NULL),
  ('strike', 'strike', 'struck', NULL, 'struck', NULL),
  ('swim', 'swim', 'swam', NULL, 'swum', NULL),
  ('take', 'take', 'took', NULL, 'taken', NULL),
  ('teach', 'teach', 'taught', NULL, 'taught', NULL),
  ('tear', 'tear', 'tore', NULL, 'torn', NULL),
  ('tell', 'tell', 'told', NULL, 'told', NULL),
  ('think', 'think', 'thought', NULL, 'thought', NULL),
  ('throw', 'throw', 'threw', NULL, 'thrown', NULL),
  ('understand', 'understand', 'understood', NULL, 'understood', NULL),
  ('wake', 'wake', 'woke', NULL, 'woken', NULL),
  ('wear', 'wear', 'wore', NULL, 'worn', NULL),
  ('win', 'win', 'won', NULL, 'won', NULL),
  ('write', 'write', 'wrote', NULL, 'written', NULL)
on conflict (base_norm) do nothing;

-- ============================================
-- DIAGNOSTICS: Check which verbs were inserted
-- ============================================
-- Run this query after migration to verify all 100 verbs were inserted:
-- SELECT COUNT(*) as total_verbs FROM irregular_verbs;
-- Expected: 100
--
-- To find which verb might be missing, compare with expected list:
-- Expected verbs (100 total):
-- be, beat, become, begin, bend, bet, bite, blow, break, bring, build, burn, buy,
-- catch, choose, come, cost, cut, deal, dig, do, draw, dream, drink, drive, eat,
-- fall, feed, feel, fight, find, fly, forget, forgive, freeze, get, give, go,
-- grow, hang, have, hear, hide, hit, hold, hurt, keep, know, lay, lead, learn,
-- leave, lend, let, lie, light, lose, make, mean, meet, pay, put, read, ride,
-- ring, rise, run, say, see, sell, send, set, shake, shine, shoot, show, shut,
-- sing, sink, sit, sleep, speak, spend, stand, steal, stick, strike, swim,
-- take, teach, tear, tell, think, throw, understand, wake, wear, win, write
--
-- To check for duplicates in base_norm:
-- SELECT base_norm, COUNT(*) FROM irregular_verbs GROUP BY base_norm HAVING COUNT(*) > 1;
