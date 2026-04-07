-- Remove empty placeholder pack "transport-overview" (never had vocab_pack_items).
-- See scripts/transport_packs.sql comment "Transport overview (placeholder)".

begin;

delete from public.vocab_answer_events
where pack_id in (select id from public.vocab_packs where slug = 'transport-overview');

delete from public.vocab_packs
where slug = 'transport-overview';

commit;
