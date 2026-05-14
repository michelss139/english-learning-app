-- Daily vocab packs ("fiszki codzienne"): drop selected lexicon senses from specific packs, update PL glosses for pack-linked senses.
-- Translation updates are limited to senses that appear in each pack (vocab_pack_items), to avoid silently changing lexicon for other courses.

begin;

-- ---------------------------------------------------------------------------
-- Removals: unlink pack items by pack slug + English lemma (lemma_norm)
-- ---------------------------------------------------------------------------
with removals(pack_slug, lemma_norm) as (
  values
    -- W restauracji
    ('food-restaurant-daily', 'menu'),
    ('food-restaurant-daily', 'beverage'),
    -- Gotowanie
    ('food-cooking-daily', 'grill'),
    ('food-cooking-daily', 'chef'),
    -- Mięso i drób
    ('food-meat-and-poultry-daily', 'salami'),
    ('food-meat-and-poultry-daily', 'drumstick'),
    ('food-meat-and-poultry-daily', 'roast'),
    -- Nabiał
    ('food-dairy-products-daily', 'soft cheese'),
    ('food-dairy-products-daily', 'yoghurt drink'),
    ('food-dairy-products-daily', 'whey'),
    ('food-dairy-products-daily', 'skim milk'),
    ('food-dairy-products-daily', 'clotted cream'),
    ('food-dairy-products-daily', 'mozzarella'),
    ('food-dairy-products-daily', 'hard cheese'),
    ('food-dairy-products-daily', 'ricotta'),
    ('food-dairy-products-daily', 'crème fraîche'),
    ('food-dairy-products-daily', 'curd'),
    ('food-dairy-products-daily', 'kefir'),
    -- Napoje
    ('food-drinks-daily', 'milkshake'),
    ('food-drinks-daily', 'energy drink'),
    -- Owoce morza
    ('food-seafood-daily', 'tilapia'),
    ('food-seafood-daily', 'anchovy'),
    ('food-seafood-daily', 'halibut'),
    ('food-seafood-daily', 'scallop'),
    ('food-seafood-daily', 'mussel'),
    ('food-seafood-daily', 'sea bass'),
    -- Sklepy i miejsca zakupów
    ('shopping-shopping-locations-daily', 'supermarket'),
    ('shopping-shopping-locations-daily', 'discount store'),
    -- Zboża i produkty zbożowe
    ('food-grains-and-cereals-daily', 'popcorn'),
    ('food-grains-and-cereals-daily', 'cereal'),
    ('food-grains-and-cereals-daily', 'quinoa'),
    ('food-grains-and-cereals-daily', 'cornflakes'),
    ('food-grains-and-cereals-daily', 'cracker'),
    ('food-grains-and-cereals-daily', 'bun'),
    ('food-grains-and-cereals-daily', 'pita bread'),
    ('food-grains-and-cereals-daily', 'muesli'),
    ('food-grains-and-cereals-daily', 'tortilla'),
    -- Zioła i przyprawy
    ('food-herbs-and-spices-daily', 'chili powder'),
    ('food-herbs-and-spices-daily', 'fennel'),
    ('food-herbs-and-spices-daily', 'tarragon')
)
delete from public.vocab_pack_items vpi
using removals r,
  public.vocab_packs vp,
  public.lexicon_entries e,
  public.lexicon_senses s
where vp.slug = r.pack_slug
  and e.lemma_norm = r.lemma_norm
  and s.entry_id = e.id
  and vpi.pack_id = vp.id
  and vpi.sense_id = s.id;

-- If a mistaken Polish lemma was ever linked as its own entry, drop it from the herbs pack only.
delete from public.vocab_pack_items vpi
using public.vocab_packs vp,
  public.lexicon_entries e,
  public.lexicon_senses s
where vp.slug = 'food-herbs-and-spices-daily'
  and e.lemma_norm = 'imbir'
  and s.entry_id = e.id
  and vpi.pack_id = vp.id
  and vpi.sense_id = s.id;

-- ---------------------------------------------------------------------------
-- Translation / gloss updates (lexicon_translations), pack-scoped
-- ---------------------------------------------------------------------------

-- W restauracji: reservation → also “booking”
update public.lexicon_translations lt
set translation_pl = 'rezerwacja · booking'
from public.lexicon_senses s
join public.lexicon_entries e on e.id = s.entry_id
join public.vocab_pack_items vpi on vpi.sense_id = s.id
join public.vocab_packs vp on vp.id = vpi.pack_id and vp.slug = 'food-restaurant-daily'
where lt.sense_id = s.id
  and e.lemma_norm = 'reservation';

-- Gotowanie: patelnia / frying pan; garnek / cooking pot
update public.lexicon_translations lt
set translation_pl = 'patelnia · frying pan'
from public.lexicon_senses s
join public.lexicon_entries e on e.id = s.entry_id
join public.vocab_pack_items vpi on vpi.sense_id = s.id
join public.vocab_packs vp on vp.id = vpi.pack_id and vp.slug = 'food-cooking-daily'
where lt.sense_id = s.id
  and e.lemma_norm = 'pan';

update public.lexicon_translations lt
set translation_pl = 'garnek · cooking pot'
from public.lexicon_senses s
join public.lexicon_entries e on e.id = s.entry_id
join public.vocab_pack_items vpi on vpi.sense_id = s.id
join public.vocab_packs vp on vp.id = vpi.pack_id and vp.slug = 'food-cooking-daily'
where lt.sense_id = s.id
  and e.lemma_norm = 'pot';

-- Mięso i drób: bacon → bekon
update public.lexicon_translations lt
set translation_pl = 'boczek · bekon'
from public.lexicon_senses s
join public.lexicon_entries e on e.id = s.entry_id
join public.vocab_pack_items vpi on vpi.sense_id = s.id
join public.vocab_packs vp on vp.id = vpi.pack_id and vp.slug = 'food-meat-and-poultry-daily'
where lt.sense_id = s.id
  and e.lemma_norm = 'bacon';

-- Nabiał: ghee wording
update public.lexicon_translations lt
set translation_pl = 'masło klarowane'
from public.lexicon_senses s
join public.lexicon_entries e on e.id = s.entry_id
join public.vocab_pack_items vpi on vpi.sense_id = s.id
join public.vocab_packs vp on vp.id = vpi.pack_id and vp.slug = 'food-dairy-products-daily'
where lt.sense_id = s.id
  and e.lemma_norm = 'ghee';

-- Napoje: soda → fizzy drink
update public.lexicon_translations lt
set translation_pl = 'napój gazowany · fizzy drink'
from public.lexicon_senses s
join public.lexicon_entries e on e.id = s.entry_id
join public.vocab_pack_items vpi on vpi.sense_id = s.id
join public.vocab_packs vp on vp.id = vpi.pack_id and vp.slug = 'food-drinks-daily'
where lt.sense_id = s.id
  and e.lemma_norm = 'soda';

-- Owoce: pomegranate → granat (not “granat owoc”)
update public.lexicon_translations lt
set translation_pl = 'granat'
from public.lexicon_senses s
join public.lexicon_entries e on e.id = s.entry_id
join public.vocab_pack_items vpi on vpi.sense_id = s.id
join public.vocab_packs vp on vp.id = vpi.pack_id and vp.slug = 'food-fruits-daily'
where lt.sense_id = s.id
  and e.lemma_norm = 'pomegranate';

-- Sklepy: fishmonger, greengrocer
update public.lexicon_translations lt
set translation_pl = 'sklep rybny · sprzedawca ryb'
from public.lexicon_senses s
join public.lexicon_entries e on e.id = s.entry_id
join public.vocab_pack_items vpi on vpi.sense_id = s.id
join public.vocab_packs vp on vp.id = vpi.pack_id and vp.slug = 'shopping-shopping-locations-daily'
where lt.sense_id = s.id
  and e.lemma_norm = 'fishmonger';

update public.lexicon_translations lt
set translation_pl = 'warzywniak · grocery shop'
from public.lexicon_senses s
join public.lexicon_entries e on e.id = s.entry_id
join public.vocab_pack_items vpi on vpi.sense_id = s.id
join public.vocab_packs vp on vp.id = vpi.pack_id and vp.slug = 'shopping-shopping-locations-daily'
where lt.sense_id = s.id
  and e.lemma_norm = 'greengrocer';

-- Warzywa: carrot, eggplant / aubergine
update public.lexicon_translations lt
set translation_pl = 'marchew · marchewka'
from public.lexicon_senses s
join public.lexicon_entries e on e.id = s.entry_id
join public.vocab_pack_items vpi on vpi.sense_id = s.id
join public.vocab_packs vp on vp.id = vpi.pack_id and vp.slug = 'food-vegetables-daily'
where lt.sense_id = s.id
  and e.lemma_norm = 'carrot';

update public.lexicon_translations lt
set translation_pl = 'bakłażan · aubergine'
from public.lexicon_senses s
join public.lexicon_entries e on e.id = s.entry_id
join public.vocab_pack_items vpi on vpi.sense_id = s.id
join public.vocab_packs vp on vp.id = vpi.pack_id and vp.slug = 'food-vegetables-daily'
where lt.sense_id = s.id
  and e.lemma_norm = 'eggplant';

-- Zioła i przyprawy: ginger stays PL “imbir” (lemma remains EN “ginger”) — no lexicon change here.

commit;
