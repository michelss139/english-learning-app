-- Migration: Update lexicon_entries unique constraint to support multiple POS per lemma
-- Date: 2025-02-24
-- 
-- Changes:
-- - Remove unique constraint on lemma_norm only
-- - Add unique constraint on (lemma_norm, pos) to allow multiple entries per lemma (different POS)
-- - This enables words like "work" (verb + noun), "light" (noun + verb + adjective), etc.

-- Drop old unique constraint
alter table if exists lexicon_entries drop constraint if exists lexicon_entries_lemma_norm_unique;

-- Add new unique constraint on (lemma_norm, pos)
alter table if exists lexicon_entries 
  add constraint lexicon_entries_lemma_norm_pos_unique unique (lemma_norm, pos);

-- Update index to support the new constraint
drop index if exists idx_lexicon_entries_lemma_norm;
create index if not exists idx_lexicon_entries_lemma_norm_pos on lexicon_entries(lemma_norm, pos);
