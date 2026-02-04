-- Add senses to vocab_pack_items for transport packs

begin;

-- Pack A: TRANSPORT — Pojazdy
with words(lemma_norm, order_index) as (
  values
    ('vehicle', 1),
    ('means of transport', 2),
    ('car', 3),
    ('motorcycle', 4),
    ('scooter', 5),
    ('bicycle', 6),
    ('kick scooter', 7),
    ('bus', 8),
    ('tram', 9),
    ('subway', 10),
    ('train', 11),
    ('plane', 12),
    ('helicopter', 13),
    ('ship', 14),
    ('boat', 15),
    ('ferry', 16),
    ('truck', 17),
    ('coach', 18),
    ('taxi', 19)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-vehicles'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack B: TRANSPORT — Samochody
with words(lemma_norm, order_index) as (
  values
    ('car', 1),
    ('passenger car', 2),
    ('convertible', 3),
    ('trunk', 4),
    ('hood', 5),
    ('doors', 6),
    ('mirror', 7),
    ('windshield', 8),
    ('seat belts', 9),
    ('seat', 10),
    ('dashboard', 11),
    ('engine', 12),
    ('gearbox', 13),
    ('clutch', 14),
    ('brakes', 15),
    ('handbrake', 16),
    ('gas pedal', 17),
    ('turn signals', 18),
    ('windshield wipers', 19),
    ('battery', 20),
    ('radiator', 21),
    ('muffler', 22),
    ('drive system', 23),
    ('fuel', 24),
    ('speed', 25),
    ('steering wheel', 26),
    ('wheel', 27),
    ('tire', 28)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-cars'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack C: TRANSPORT — Motocykle i skutery
with words(lemma_norm, order_index) as (
  values
    ('motorcycle', 1),
    ('scooter', 2),
    ('moped', 3),
    ('helmet', 4),
    ('throttle', 5),
    ('mirrors', 6),
    ('seat', 7),
    ('fuel tank', 8),
    ('chain', 9),
    ('kickstand', 10)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-motorcycles'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack D: TRANSPORT — Rowery
with words(lemma_norm, order_index) as (
  values
    ('bicycle', 1),
    ('mountain bike', 2),
    ('road bike', 3),
    ('city bike', 4),
    ('electric bike', 5),
    ('frame', 6),
    ('handlebar', 7),
    ('saddle', 8),
    ('pedals', 9),
    ('gears', 10),
    ('brake', 11),
    ('bell', 12),
    ('basket', 13),
    ('rack', 14)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-bicycles'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack E: TRANSPORT — Transport publiczny
with words(lemma_norm, order_index) as (
  values
    ('public transit', 1),
    ('bus', 2),
    ('tram', 3),
    ('subway', 4),
    ('train', 5),
    ('railway', 6),
    ('carriage', 7),
    ('locomotive', 8),
    ('stop', 9),
    ('station', 10),
    ('timetable', 11),
    ('ticket', 12),
    ('ticket validator', 13)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-public'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack F: TRANSPORT — Autobusy i autokary
with words(lemma_norm, order_index) as (
  values
    ('city bus', 1),
    ('suburban bus', 2),
    ('coach', 3),
    ('driver', 4),
    ('passenger', 5),
    ('seat', 6),
    ('handrail', 7),
    ('doors', 8),
    ('ticket machine', 9)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-buses'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack G: TRANSPORT — Kolej
with words(lemma_norm, order_index) as (
  values
    ('train', 1),
    ('platform', 2),
    ('track', 3),
    ('compartment', 4),
    ('dining car', 5),
    ('conductor', 6),
    ('delay', 7),
    ('departure', 8),
    ('arrival', 9)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-rail'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack H: TRANSPORT — Transport lotniczy
with words(lemma_norm, order_index) as (
  values
    ('plane', 1),
    ('flight', 2),
    ('airport', 3),
    ('terminal', 4),
    ('gate', 5),
    ('check-in', 6),
    ('security check', 7),
    ('carry-on luggage', 8),
    ('checked luggage', 9),
    ('pilot', 10),
    ('flight attendant', 11),
    ('runway', 12)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-air'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack I: TRANSPORT — Transport wodny
with words(lemma_norm, order_index) as (
  values
    ('ship', 1),
    ('boat', 2),
    ('ferry', 3),
    ('yacht', 4),
    ('kayak', 5),
    ('port', 6),
    ('marina', 7),
    ('captain', 8),
    ('crew', 9),
    ('life jacket', 10)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-water'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack J: TRANSPORT — Transport towarowy
with words(lemma_norm, order_index) as (
  values
    ('truck', 1),
    ('lorry', 2),
    ('trailer', 3),
    ('delivery van', 4),
    ('cargo', 5),
    ('pallet', 6),
    ('container', 7),
    ('warehouse', 8),
    ('loading', 9),
    ('unloading', 10)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-cargo'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack K: TRANSPORT — Droga i infrastruktura
with words(lemma_norm, order_index) as (
  values
    ('road', 1),
    ('highway', 2),
    ('street', 3),
    ('intersection', 4),
    ('roundabout', 5),
    ('lane', 6),
    ('sidewalk', 7),
    ('bike path', 8),
    ('bridge', 9),
    ('tunnel', 10),
    ('parking lot', 11)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-road'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack L: TRANSPORT — Ruch drogowy i przepisy
with words(lemma_norm, order_index) as (
  values
    ('road traffic', 1),
    ('road sign', 2),
    ('traffic lights', 3),
    ('red light', 4),
    ('green light', 5),
    ('speed limit', 6),
    ('right of way', 7),
    ('traffic ticket', 8),
    ('traffic police', 9)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-rules'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack M: TRANSPORT — Prowadzenie pojazdu
with words(lemma_norm, order_index) as (
  values
    ('driver', 1),
    ('driving', 2),
    ('starting', 3),
    ('braking', 4),
    ('turning', 5),
    ('parking', 6),
    ('reversing', 7),
    ('gear shifting', 8),
    ('refueling', 9)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-driving'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack N: TRANSPORT — Awarie i serwis
with words(lemma_norm, order_index) as (
  values
    ('breakdown', 1),
    ('fault', 2),
    ('accident', 3),
    ('minor collision', 4),
    ('mechanic', 5),
    ('workshop', 6),
    ('inspection', 7),
    ('repair', 8),
    ('oil change', 9),
    ('tow truck', 10)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-repair'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack O: TRANSPORT — Ekologia i nowoczesny transport
with words(lemma_norm, order_index) as (
  values
    ('electric car', 1),
    ('hybrid car', 2),
    ('charging station', 3),
    ('exhaust emissions', 4),
    ('public transport', 5),
    ('car sharing', 6),
    ('electric scooter', 7)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'transport-eco'
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
where p.slug like 'transport-%'
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
where p.slug like 'transport-%'
  and vpi.order_index <= 3
order by p.order_index, vpi.order_index;
