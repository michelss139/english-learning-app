-- Migration: Label existing vocab packs as 'nouns', prepare for POS filter.
-- Date: 2026-05-22
--
-- vocab_packs.category already exists (text, default 'general').
-- We relabel all current packs to 'nouns' so the new POS filter works correctly.
-- Phrasal verb packs will be inserted with category = 'phrasal_verbs' by the seed script.

begin;

-- All currently published packs are noun-based (generated via generate:nouns scripts).
update public.vocab_packs
set category = 'nouns'
where category = 'general' or category is null;

commit;
