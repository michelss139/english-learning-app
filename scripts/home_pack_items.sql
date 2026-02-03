-- Add senses to vocab_pack_items for home & rooms packs

begin;

-- Pack 1: Rooms in the house
with words(lemma_norm, order_index) as (
  values
    ('room', 1),
    ('living room', 2),
    ('bedroom', 3),
    ('kitchen', 4),
    ('bathroom', 5),
    ('toilet', 6),
    ('hallway', 7),
    ('corridor', 8),
    ('hall', 9),
    ('dining room', 10),
    ('porch', 11),
    ('study', 12),
    ('home office', 13),
    ('kids room', 14),
    ('guest room', 15),
    ('pantry', 16),
    ('laundry room', 17),
    ('walk-in closet', 18),
    ('basement', 19),
    ('attic', 20),
    ('loft', 21),
    ('balcony', 22),
    ('terrace', 23),
    ('veranda', 24),
    ('garage', 25)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'rooms-in-the-house'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 2: Salon / Pokój dzienny
with words(lemma_norm, order_index) as (
  values
    ('sofa', 1),
    ('couch', 2),
    ('armchair', 3),
    ('coffee table', 4),
    ('side table', 5),
    ('bookcase', 6),
    ('shelf', 7),
    ('tv', 8),
    ('floor lamp', 9),
    ('ceiling lamp', 10),
    ('carpet', 11),
    ('decorative cushions', 12),
    ('curtains', 13),
    ('sheer curtains', 14),
    ('blinds', 15),
    ('clock', 16),
    ('book cabinet', 17)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'living-room'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 3: Kuchnia
with words(lemma_norm, order_index) as (
  values
    ('fridge', 1),
    ('freezer', 2),
    ('stove', 3),
    ('oven', 4),
    ('cooktop', 5),
    ('microwave', 6),
    ('dishwasher', 7),
    ('kettle', 8),
    ('coffee machine', 9),
    ('toaster', 10),
    ('countertop', 11),
    ('kitchen cabinets', 12),
    ('sink', 13),
    ('extractor hood', 14),
    ('pots', 15),
    ('pans', 16),
    ('knives', 17),
    ('cutting board', 18),
    ('cutlery', 19),
    ('plates', 20),
    ('mugs', 21),
    ('glasses', 22),
    ('bowls', 23)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'kitchen'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 4: Jadalnia
with words(lemma_norm, order_index) as (
  values
    ('table', 1),
    ('chairs', 2),
    ('tablecloth', 3),
    ('napkins', 4),
    ('display cabinet', 5),
    ('sideboard', 6),
    ('pendant lamp', 7),
    ('dinner set', 8),
    ('cutlery', 9)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'dining-room'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 5: Sypialnia
with words(lemma_norm, order_index) as (
  values
    ('bed', 1),
    ('mattress', 2),
    ('bed frame', 3),
    ('bedside table', 4),
    ('bedside lamp', 5),
    ('wardrobe', 6),
    ('chest of drawers', 7),
    ('bedding', 8),
    ('duvet', 9),
    ('pillow', 10),
    ('bed sheet', 11),
    ('carpet', 12),
    ('mirror', 13),
    ('curtains', 14),
    ('alarm clock', 15)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'bedroom'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 6: Łazienka
with words(lemma_norm, order_index) as (
  values
    ('bathtub', 1),
    ('shower', 2),
    ('washbasin', 3),
    ('toilet', 4),
    ('mirror', 5),
    ('bathroom cabinet', 6),
    ('shelf', 7),
    ('towel', 8),
    ('shower curtain', 9),
    ('soap dispenser', 10),
    ('soap dish', 11),
    ('shower gel', 12),
    ('shampoo', 13),
    ('conditioner', 14),
    ('towel rail', 15),
    ('toilet paper', 16),
    ('toilet brush', 17),
    ('trash bin', 18),
    ('toilet bowl', 19),
    ('toilet paper holder', 20),
    ('laundry basket', 21)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'bathroom'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 7: Przedpokój / Hol
with words(lemma_norm, order_index) as (
  values
    ('coat rack', 1),
    ('wardrobe', 2),
    ('shoe cabinet', 3),
    ('mirror', 4),
    ('doormat', 5),
    ('shelf', 6),
    ('bench', 7)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'hallway'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 8: Gabinet / Biuro
with words(lemma_norm, order_index) as (
  values
    ('desk', 1),
    ('office chair', 2),
    ('computer', 3),
    ('monitor', 4),
    ('keyboard', 5),
    ('mouse', 6),
    ('desk lamp', 7),
    ('bookcase', 8),
    ('folders', 9),
    ('printer', 10),
    ('drawers', 11)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'home-office'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 9: Pokój dziecięcy
with words(lemma_norm, order_index) as (
  values
    ('bed', 1),
    ('desk', 2),
    ('chair', 3),
    ('bookcase', 4),
    ('shelves', 5),
    ('toys', 6),
    ('carpet', 7),
    ('lamp', 8),
    ('toy box', 9)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'kids-room'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 10: Pralnia
with words(lemma_norm, order_index) as (
  values
    ('washer', 1),
    ('dryer', 2),
    ('laundry basket', 3),
    ('detergents', 4),
    ('laundry powder', 5),
    ('fabric softener', 6),
    ('ironing board', 7),
    ('iron', 8),
    ('clothes rack', 9)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'laundry-room'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 11: Garderoba
with words(lemma_norm, order_index) as (
  values
    ('shelves', 1),
    ('hangers', 2),
    ('drawers', 3),
    ('baskets', 4),
    ('mirror', 5)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'walk-in-closet'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 12: Balkon / Taras
with words(lemma_norm, order_index) as (
  values
    ('garden chairs', 1),
    ('table', 2),
    ('planters', 3),
    ('plants', 4),
    ('sun lounger', 5),
    ('lighting', 6)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'balcony-terrace'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

-- Pack 13: Garaż / Piwnica
with words(lemma_norm, order_index) as (
  values
    ('shelves', 1),
    ('tools', 2),
    ('toolbox', 3),
    ('bicycle', 4),
    ('tires', 5),
    ('cardboard boxes', 6),
    ('containers', 7)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'garage-basement'
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
