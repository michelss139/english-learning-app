-- Add senses to vocab_pack_items for contracts packs

begin;

-- Pack A: Umowy — Pojecia ogolne
with words(lemma_norm, order_index) as (
  values
    ('agreement', 1),
    ('contract', 2),
    ('understanding', 3),
    ('terms', 4),
    ('provisions', 5),
    ('contracting parties', 6),
    ('subject of the contract', 7),
    ('scope', 8),
    ('obligations', 9),
    ('rights', 10),
    ('liability', 11),
    ('risk', 12),
    ('clause', 13),
    ('appendix', 14),
    ('amendment', 15),
    ('contract version', 16)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'contracts-general'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack B: Umowy — Zawarcie i obowiazywanie umowy
with words(lemma_norm, order_index) as (
  values
    ('conclusion of the contract', 1),
    ('contract signing', 2),
    ('conclusion date', 3),
    ('effective date', 4),
    ('duration', 5),
    ('term', 6),
    ('extension', 7),
    ('expiry', 8),
    ('termination', 9),
    ('notice of termination', 10),
    ('withdrawal from the contract', 11)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'contracts-formation'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack C: Umowy — Strony i role
with words(lemma_norm, order_index) as (
  values
    ('party', 1),
    ('counterparty', 2),
    ('client', 3),
    ('supplier', 4),
    ('service provider', 5),
    ('service recipient', 6),
    ('tenant', 7),
    ('landlord', 8),
    ('lessor', 9),
    ('lessee', 10),
    ('financing party', 11),
    ('asset user', 12),
    ('employer', 13),
    ('contractor', 14),
    ('subcontractor', 15)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'contracts-parties'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack D: Umowy — Umowa najmu
with words(lemma_norm, order_index) as (
  values
    ('rental agreement', 1),
    ('rent', 2),
    ('deposit', 3),
    ('rental period', 4),
    ('premises', 5),
    ('property', 6),
    ('fixtures', 7),
    ('technical condition', 8),
    ('handover protocol', 9),
    ('additional charges', 10),
    ('utilities', 11),
    ('notice of termination', 12),
    ('lease extension', 13)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'contracts-rental'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack E: Umowy — Leasing
with words(lemma_norm, order_index) as (
  values
    ('leasing', 1),
    ('lease agreement', 2),
    ('operating lease', 3),
    ('finance lease', 4),
    ('consumer lease', 5),
    ('leased asset', 6),
    ('lease term', 7),
    ('lessor', 8),
    ('lessee', 9),
    ('financing party', 10),
    ('asset user', 11),
    ('lease installment', 12),
    ('initial fee', 13),
    ('initial rent', 14),
    ('total lease payments', 15),
    ('repayment schedule', 16),
    ('residual value', 17),
    ('buyout', 18),
    ('buyout price', 19),
    ('payment', 20),
    ('invoice', 21),
    ('lease application', 22),
    ('lease eligibility', 23),
    ('lease decision', 24),
    ('application approval', 25),
    ('contract signing', 26),
    ('lease activation', 27),
    ('asset handover', 28),
    ('acceptance', 29),
    ('use', 30),
    ('operation', 31),
    ('service', 32),
    ('inspection', 33),
    ('repair', 34),
    ('insurance', 35),
    ('liability', 36),
    ('damage', 37),
    ('loss', 38),
    ('lease end', 39),
    ('asset return', 40),
    ('contract extension', 41),
    ('termination', 42),
    ('early termination', 43)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'contracts-leasing'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack F: Umowy — Umowy uslugowe
with words(lemma_norm, order_index) as (
  values
    ('service agreement', 1),
    ('scope of services', 2),
    ('performance', 3),
    ('completion date', 4),
    ('schedule', 5),
    ('service standard', 6),
    ('quality level', 7),
    ('reporting', 8),
    ('acceptance of work', 9),
    ('complaint', 10)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'contracts-services'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack G: Umowy — Umowy handlowe i wspolpraca
with words(lemma_norm, order_index) as (
  values
    ('commercial agreement', 1),
    ('cooperation', 2),
    ('partnership', 3),
    ('distribution', 4),
    ('exclusivity', 5),
    ('territory', 6),
    ('volume', 7),
    ('order', 8),
    ('order fulfillment', 9),
    ('delivery', 10)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'contracts-trade'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack H: Umowy — Wynagrodzenie i platnosci
with words(lemma_norm, order_index) as (
  values
    ('remuneration', 1),
    ('payment', 2),
    ('amount', 3),
    ('price', 4),
    ('rate', 5),
    ('installment', 6),
    ('invoice', 7),
    ('payment term', 8),
    ('advance payment', 9),
    ('final payment', 10),
    ('delay', 11),
    ('interest', 12),
    ('settlement', 13)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'contracts-payments'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack I: Umowy — Odpowiedzialnosc i zabezpieczenia
with words(lemma_norm, order_index) as (
  values
    ('contractual liability', 1),
    ('financial liability', 2),
    ('contractual penalty', 3),
    ('damages', 4),
    ('security', 5),
    ('guarantee', 6),
    ('statutory warranty', 7),
    ('insurance', 8),
    ('force majeure', 9)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'contracts-liability'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack J: Umowy — Poufnosc i dane
with words(lemma_norm, order_index) as (
  values
    ('confidentiality', 1),
    ('trade secret', 2),
    ('personal data', 3),
    ('data protection', 4),
    ('data processing', 5),
    ('consent', 6),
    ('breach', 7),
    ('legal liability', 8)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'contracts-confidentiality'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack K: Umowy — Spory i zakonczenie wspolpracy
with words(lemma_norm, order_index) as (
  values
    ('dispute', 1),
    ('claim', 2),
    ('negotiations', 3),
    ('mediation', 4),
    ('arbitration', 5),
    ('court', 6),
    ('dispute resolution', 7),
    ('end of cooperation', 8)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'contracts-disputes'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

commit;

-- ============================================
-- Kontrolne SELECT
-- ============================================
select p.slug, p.title, count(vpi.id) as item_count
from vocab_packs p
left join vocab_pack_items vpi on vpi.pack_id = p.id
where p.slug like 'contracts-%'
group by p.slug, p.title, p.order_index
order by p.order_index;

select
  p.slug,
  e.lemma as en,
  lt.translation_pl as pl
from vocab_packs p
join vocab_pack_items vpi on vpi.pack_id = p.id
join lexicon_senses s on s.id = vpi.sense_id
join lexicon_entries e on e.id = s.entry_id
join lexicon_translations lt on lt.sense_id = s.id
where p.slug like 'contracts-%'
  and vpi.order_index <= 3
order by p.order_index, vpi.order_index;
