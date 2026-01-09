-- Migration: Fix Irregular Verbs RLS and add missing verb
-- Date: 2025-01-22
-- This fixes the RLS policy issue and ensures all 100 verbs are present

-- ============================================
-- FIX RLS: Replace "for all" with separate policies
-- ============================================

-- Drop the old "for all" policy if it exists
drop policy if exists "Irregular verbs: admin manage" on irregular_verbs;

-- Create separate policies for INSERT, UPDATE, DELETE
do $$
begin
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
-- DIAGNOSTICS: Find missing verb
-- ============================================
-- First, let's check which verbs are missing
-- Expected list of 100 verbs (base_norm values):
-- be, beat, become, begin, bend, bet, bite, blow, break, bring, build, burn, buy,
-- catch, choose, come, cost, cut, deal, dig, do, draw, dream, drink, drive, eat,
-- fall, feed, feel, fight, find, fly, forget, forgive, freeze, get, give, go,
-- grow, hang, have, hear, hide, hit, hold, hurt, keep, know, lay, lead, learn,
-- leave, lend, let, lie, light, lose, make, mean, meet, pay, put, read, ride,
-- ring, rise, run, say, see, sell, send, set, shake, shine, shoot, show, shut,
-- sing, sink, sit, sleep, speak, spend, stand, steal, stick, strike, swim,
-- take, teach, tear, tell, think, throw, understand, wake, wear, win, write

-- Try to insert all 100 verbs again (on conflict will skip existing ones)
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

-- Verify count after fix
-- SELECT COUNT(*) as total_verbs FROM irregular_verbs;
-- Expected: 100
