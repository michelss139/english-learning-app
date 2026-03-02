-- Migration: Move all mixed packs to daily, remove mixed as vocab_mode option
-- Packs with vocab_mode='mixed' become 'daily'. Only 'daily' and 'precise' remain.

update vocab_packs
set vocab_mode = 'daily'
where vocab_mode = 'mixed';

-- Update constraint to allow only daily and precise
alter table vocab_packs drop constraint if exists vocab_packs_vocab_mode_check;
alter table vocab_packs add constraint vocab_packs_vocab_mode_check
  check (vocab_mode in ('daily', 'precise'));
