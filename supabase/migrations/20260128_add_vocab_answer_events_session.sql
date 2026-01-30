-- Migration: Add session + direction for vocab_answer_events
-- Date: 2026-01-28
--
-- Enables per-session recommendations for vocab packs and stores direction.

begin;

alter table if exists vocab_answer_events
  add column if not exists session_id uuid,
  add column if not exists direction text;

create index if not exists idx_vocab_answer_events_pack_session
  on vocab_answer_events(pack_id, session_id);

commit;
