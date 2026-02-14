-- Body packs items (daily + precise)

begin;

with items(pack_slug, lemma_norm, order_index) as (
  values
    ('body-daily-head', 'head', 1),
    ('body-daily-head', 'face', 2),
    ('body-daily-head', 'hair', 3),
    ('body-daily-head', 'forehead', 4),
    ('body-daily-head', 'eye', 5),
    ('body-daily-head', 'ear', 6),
    ('body-daily-head', 'nose', 7),
    ('body-daily-head', 'mouth', 8),
    ('body-daily-head', 'lip', 9),
    ('body-daily-head', 'cheek', 10),
    ('body-daily-head', 'tooth', 11),
    ('body-daily-head', 'tongue', 12),
    ('body-daily-head', 'chin', 13),
    ('body-daily-head', 'facial hair', 14)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, i.order_index
from items i
join vocab_packs p on p.slug = i.pack_slug
join lexicon_entries e on e.lemma_norm = i.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from vocab_pack_items vpi
  where vpi.pack_id = p.id and vpi.sense_id = s.id
);

with items(pack_slug, lemma_norm, order_index) as (
  values
    ('body-daily-torso', 'torso', 1),
    ('body-daily-torso', 'chest', 2),
    ('body-daily-torso', 'back', 3),
    ('body-daily-torso', 'neck', 4),
    ('body-daily-torso', 'belly', 5),
    ('body-daily-torso', 'waist', 6),
    ('body-daily-torso', 'hip', 7),
    ('body-daily-torso', 'shoulder', 8),
    ('body-daily-torso', 'arm', 9),
    ('body-daily-torso', 'elbow', 10),
    ('body-daily-torso', 'wrist', 11),
    ('body-daily-torso', 'hand', 12),
    ('body-daily-torso', 'finger', 13),
    ('body-daily-torso', 'nail', 14),
    ('body-daily-torso', 'nipple', 15),
    ('body-daily-torso', 'breast', 16)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, i.order_index
from items i
join vocab_packs p on p.slug = i.pack_slug
join lexicon_entries e on e.lemma_norm = i.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from vocab_pack_items vpi
  where vpi.pack_id = p.id and vpi.sense_id = s.id
);

with items(pack_slug, lemma_norm, order_index) as (
  values
    ('body-daily-legs', 'leg', 1),
    ('body-daily-legs', 'thigh', 2),
    ('body-daily-legs', 'knee', 3),
    ('body-daily-legs', 'calf', 4),
    ('body-daily-legs', 'ankle', 5),
    ('body-daily-legs', 'foot', 6),
    ('body-daily-legs', 'heel', 7),
    ('body-daily-legs', 'toe', 8),
    ('body-daily-legs', 'toenail', 9)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, i.order_index
from items i
join vocab_packs p on p.slug = i.pack_slug
join lexicon_entries e on e.lemma_norm = i.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from vocab_pack_items vpi
  where vpi.pack_id = p.id and vpi.sense_id = s.id
);

with items(pack_slug, lemma_norm, order_index) as (
  values
    ('body-daily-skin', 'skin', 1),
    ('body-daily-skin', 'complexion', 2),
    ('body-daily-skin', 'scar', 3),
    ('body-daily-skin', 'bruise', 4),
    ('body-daily-skin', 'cut', 5),
    ('body-daily-skin', 'scratch', 6),
    ('body-daily-skin', 'rash', 7),
    ('body-daily-skin', 'spot', 8),
    ('body-daily-skin', 'pimple', 9),
    ('body-daily-skin', 'wrinkle', 10),
    ('body-daily-skin', 'freckle', 11),
    ('body-daily-skin', 'mole', 12),
    ('body-daily-skin', 'sweat', 13),
    ('body-daily-skin', 'dirt', 14)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, i.order_index
from items i
join vocab_packs p on p.slug = i.pack_slug
join lexicon_entries e on e.lemma_norm = i.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from vocab_pack_items vpi
  where vpi.pack_id = p.id and vpi.sense_id = s.id
);

with items(pack_slug, lemma_norm, order_index) as (
  values
    ('body-daily-organs', 'brain', 1),
    ('body-daily-organs', 'throat', 2),
    ('body-daily-organs', 'heart', 3),
    ('body-daily-organs', 'lungs', 4),
    ('body-daily-organs', 'stomach', 5),
    ('body-daily-organs', 'liver', 6),
    ('body-daily-organs', 'kidneys', 7),
    ('body-daily-organs', 'intestines', 8),
    ('body-daily-organs', 'bladder', 9),
    ('body-daily-organs', 'blood', 10),
    ('body-daily-organs', 'muscles', 11),
    ('body-daily-organs', 'bones', 12)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, i.order_index
from items i
join vocab_packs p on p.slug = i.pack_slug
join lexicon_entries e on e.lemma_norm = i.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from vocab_pack_items vpi
  where vpi.pack_id = p.id and vpi.sense_id = s.id
);

with items(pack_slug, lemma_norm, order_index) as (
  values
    ('body-precise-head', 'scalp', 1),
    ('body-precise-head', 'temple', 2),
    ('body-precise-head', 'eyebrow', 3),
    ('body-precise-head', 'eyelid', 4),
    ('body-precise-head', 'eyelash', 5),
    ('body-precise-head', 'jaw', 6),
    ('body-precise-head', 'cheekbone', 7),
    ('body-precise-head', 'beard', 8),
    ('body-precise-head', 'moustache', 9),
    ('body-precise-head', 'upper lip', 10),
    ('body-precise-head', 'lower lip', 11)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, i.order_index
from items i
join vocab_packs p on p.slug = i.pack_slug
join lexicon_entries e on e.lemma_norm = i.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from vocab_pack_items vpi
  where vpi.pack_id = p.id and vpi.sense_id = s.id
);

with items(pack_slug, lemma_norm, order_index) as (
  values
    ('body-precise-torso', 'rib', 1),
    ('body-precise-torso', 'ribcage', 2),
    ('body-precise-torso', 'spine', 3),
    ('body-precise-torso', 'shoulder blade', 4),
    ('body-precise-torso', 'collarbone', 5),
    ('body-precise-torso', 'abdomen', 6),
    ('body-precise-torso', 'navel', 7),
    ('body-precise-torso', 'pelvis', 8),
    ('body-precise-torso', 'forearm', 9),
    ('body-precise-torso', 'upper arm', 10),
    ('body-precise-torso', 'palm', 11),
    ('body-precise-torso', 'knuckle', 12),
    ('body-precise-torso', 'fingertip', 13),
    ('body-precise-torso', 'armpit', 14),
    ('body-precise-torso', 'thumb', 15)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, i.order_index
from items i
join vocab_packs p on p.slug = i.pack_slug
join lexicon_entries e on e.lemma_norm = i.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from vocab_pack_items vpi
  where vpi.pack_id = p.id and vpi.sense_id = s.id
);

with items(pack_slug, lemma_norm, order_index) as (
  values
    ('body-precise-legs', 'kneecap', 1),
    ('body-precise-legs', 'shin', 2),
    ('body-precise-legs', 'achilles tendon', 3),
    ('body-precise-legs', 'instep', 4),
    ('body-precise-legs', 'sole', 5),
    ('body-precise-legs', 'ball of the foot', 6),
    ('body-precise-legs', 'big toe', 7),
    ('body-precise-legs', 'little toe', 8)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, i.order_index
from items i
join vocab_packs p on p.slug = i.pack_slug
join lexicon_entries e on e.lemma_norm = i.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from vocab_pack_items vpi
  where vpi.pack_id = p.id and vpi.sense_id = s.id
);

with items(pack_slug, lemma_norm, order_index) as (
  values
    ('body-precise-skin', 'blemish', 1),
    ('body-precise-skin', 'scar tissue', 2),
    ('body-precise-skin', 'burn', 3),
    ('body-precise-skin', 'blister', 4),
    ('body-precise-skin', 'swelling', 5),
    ('body-precise-skin', 'irritation', 6),
    ('body-precise-skin', 'redness', 7),
    ('body-precise-skin', 'stretch marks', 8),
    ('body-precise-skin', 'flaky skin', 9)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, i.order_index
from items i
join vocab_packs p on p.slug = i.pack_slug
join lexicon_entries e on e.lemma_norm = i.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from vocab_pack_items vpi
  where vpi.pack_id = p.id and vpi.sense_id = s.id
);

with items(pack_slug, lemma_norm, order_index) as (
  values
    ('body-precise-organs', 'spinal cord', 1),
    ('body-precise-organs', 'ribs', 2),
    ('body-precise-organs', 'ribcage', 3),
    ('body-precise-organs', 'pancreas', 4),
    ('body-precise-organs', 'spleen', 5),
    ('body-precise-organs', 'gallbladder', 6),
    ('body-precise-organs', 'esophagus', 7),
    ('body-precise-organs', 'colon', 8),
    ('body-precise-organs', 'small intestine', 9),
    ('body-precise-organs', 'large intestine', 10),
    ('body-precise-organs', 'appendix', 11),
    ('body-precise-organs', 'diaphragm', 12),
    ('body-precise-organs', 'veins', 13),
    ('body-precise-organs', 'arteries', 14)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, i.order_index
from items i
join vocab_packs p on p.slug = i.pack_slug
join lexicon_entries e on e.lemma_norm = i.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from vocab_pack_items vpi
  where vpi.pack_id = p.id and vpi.sense_id = s.id
);

update vocab_packs
set is_published = true
where slug in (
  'body-daily-head',
  'body-daily-torso',
  'body-daily-legs',
  'body-daily-skin',
  'body-daily-organs',
  'body-precise-head',
  'body-precise-torso',
  'body-precise-legs',
  'body-precise-skin',
  'body-precise-organs'
);

commit;
