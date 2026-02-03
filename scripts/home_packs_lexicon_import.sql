-- Batch import for home & rooms packs lexicon data (nouns)
-- Idempotent inserts: lexicon_entries, lexicon_senses, lexicon_translations, lexicon_examples

begin;

-- ============================================
-- Pack 1: Rooms in the house
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('room', 'room', 'noun', 'a space in a house with a specific purpose', 'pokój', 'This room is bright and warm.', 1),
    ('living room', 'living room', 'noun', 'the main room for relaxing and spending time together', 'salon', 'We watch TV in the living room.', 2),
    ('bedroom', 'bedroom', 'noun', 'a room where you sleep', 'sypialnia', 'My bedroom is quiet at night.', 3),
    ('kitchen', 'kitchen', 'noun', 'a room where you cook food', 'kuchnia', 'The kitchen smells like soup.', 4),
    ('bathroom', 'bathroom', 'noun', 'a room with a bath or shower', 'łazienka', 'The bathroom is next to the bedroom.', 5),
    ('toilet', 'toilet', 'noun', 'a small room with a toilet', 'toaleta', 'The toilet is on the left.', 6),
    ('hallway', 'hallway', 'noun', 'a long passage inside a home', 'przedpokój', 'Shoes are in the hallway.', 7),
    ('corridor', 'corridor', 'noun', 'a long passage connecting rooms', 'korytarz', 'The corridor is narrow.', 8),
    ('hall', 'hall', 'noun', 'the main entrance area of a house', 'hol', 'The hall has a mirror.', 9),
    ('dining room', 'dining room', 'noun', 'a room where you eat meals', 'jadalnia', 'We eat dinner in the dining room.', 10),
    ('porch', 'porch', 'noun', 'a covered area outside the entrance', 'ganek', 'We leave our shoes on the porch.', 11),
    ('study', 'study', 'noun', 'a room used for work or reading', 'gabinet', 'He works in his study.', 12),
    ('home office', 'home office', 'noun', 'a room for work at home', 'biuro', 'She has a desk in her home office.', 13),
    ('kids room', 'kids room', 'noun', 'a room for children', 'pokój dziecięcy', 'The kids room is full of toys.', 14),
    ('guest room', 'guest room', 'noun', 'a room for visitors to sleep', 'pokój gościnny', 'We made the guest room ready.', 15),
    ('pantry', 'pantry', 'noun', 'a small room for food storage', 'spiżarnia', 'We keep pasta in the pantry.', 16),
    ('laundry room', 'laundry room', 'noun', 'a room for washing clothes', 'pralnia', 'The laundry room is downstairs.', 17),
    ('walk-in closet', 'walk-in closet', 'noun', 'a small room for clothes and shoes', 'garderoba', 'She keeps her coats in the walk-in closet.', 18),
    ('basement', 'basement', 'noun', 'the lowest level of a house', 'piwnica', 'The basement is cool in summer.', 19),
    ('attic', 'attic', 'noun', 'a space under the roof for storage', 'strych', 'Old boxes are in the attic.', 20),
    ('loft', 'loft', 'noun', 'a space under the roof used as a room', 'poddasze', 'The loft is now a bedroom.', 21),
    ('balcony', 'balcony', 'noun', 'an outdoor platform attached to a room', 'balkon', 'We sit on the balcony in the evening.', 22),
    ('terrace', 'terrace', 'noun', 'a flat outdoor area by the house', 'taras', 'We have coffee on the terrace.', 23),
    ('veranda', 'veranda', 'noun', 'a roofed open space along the house', 'weranda', 'The veranda is quiet in the morning.', 24),
    ('garage', 'garage', 'noun', 'a place where you keep a car', 'garaż', 'The garage is behind the house.', 25)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('room', 'room', 'noun', 'a space in a house with a specific purpose', 'pokój', 'This room is bright and warm.', 1),
    ('living room', 'living room', 'noun', 'the main room for relaxing and spending time together', 'salon', 'We watch TV in the living room.', 2),
    ('bedroom', 'bedroom', 'noun', 'a room where you sleep', 'sypialnia', 'My bedroom is quiet at night.', 3),
    ('kitchen', 'kitchen', 'noun', 'a room where you cook food', 'kuchnia', 'The kitchen smells like soup.', 4),
    ('bathroom', 'bathroom', 'noun', 'a room with a bath or shower', 'łazienka', 'The bathroom is next to the bedroom.', 5),
    ('toilet', 'toilet', 'noun', 'a small room with a toilet', 'toaleta', 'The toilet is on the left.', 6),
    ('hallway', 'hallway', 'noun', 'a long passage inside a home', 'przedpokój', 'Shoes are in the hallway.', 7),
    ('corridor', 'corridor', 'noun', 'a long passage connecting rooms', 'korytarz', 'The corridor is narrow.', 8),
    ('hall', 'hall', 'noun', 'the main entrance area of a house', 'hol', 'The hall has a mirror.', 9),
    ('dining room', 'dining room', 'noun', 'a room where you eat meals', 'jadalnia', 'We eat dinner in the dining room.', 10),
    ('porch', 'porch', 'noun', 'a covered area outside the entrance', 'ganek', 'We leave our shoes on the porch.', 11),
    ('study', 'study', 'noun', 'a room used for work or reading', 'gabinet', 'He works in his study.', 12),
    ('home office', 'home office', 'noun', 'a room for work at home', 'biuro', 'She has a desk in her home office.', 13),
    ('kids room', 'kids room', 'noun', 'a room for children', 'pokój dziecięcy', 'The kids room is full of toys.', 14),
    ('guest room', 'guest room', 'noun', 'a room for visitors to sleep', 'pokój gościnny', 'We made the guest room ready.', 15),
    ('pantry', 'pantry', 'noun', 'a small room for food storage', 'spiżarnia', 'We keep pasta in the pantry.', 16),
    ('laundry room', 'laundry room', 'noun', 'a room for washing clothes', 'pralnia', 'The laundry room is downstairs.', 17),
    ('walk-in closet', 'walk-in closet', 'noun', 'a small room for clothes and shoes', 'garderoba', 'She keeps her coats in the walk-in closet.', 18),
    ('basement', 'basement', 'noun', 'the lowest level of a house', 'piwnica', 'The basement is cool in summer.', 19),
    ('attic', 'attic', 'noun', 'a space under the roof for storage', 'strych', 'Old boxes are in the attic.', 20),
    ('loft', 'loft', 'noun', 'a space under the roof used as a room', 'poddasze', 'The loft is now a bedroom.', 21),
    ('balcony', 'balcony', 'noun', 'an outdoor platform attached to a room', 'balkon', 'We sit on the balcony in the evening.', 22),
    ('terrace', 'terrace', 'noun', 'a flat outdoor area by the house', 'taras', 'We have coffee on the terrace.', 23),
    ('veranda', 'veranda', 'noun', 'a roofed open space along the house', 'weranda', 'The veranda is quiet in the morning.', 24),
    ('garage', 'garage', 'noun', 'a place where you keep a car', 'garaż', 'The garage is behind the house.', 25)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('room', 'room', 'noun', 'a space in a house with a specific purpose', 'pokój', 'This room is bright and warm.', 1),
    ('living room', 'living room', 'noun', 'the main room for relaxing and spending time together', 'salon', 'We watch TV in the living room.', 2),
    ('bedroom', 'bedroom', 'noun', 'a room where you sleep', 'sypialnia', 'My bedroom is quiet at night.', 3),
    ('kitchen', 'kitchen', 'noun', 'a room where you cook food', 'kuchnia', 'The kitchen smells like soup.', 4),
    ('bathroom', 'bathroom', 'noun', 'a room with a bath or shower', 'łazienka', 'The bathroom is next to the bedroom.', 5),
    ('toilet', 'toilet', 'noun', 'a small room with a toilet', 'toaleta', 'The toilet is on the left.', 6),
    ('hallway', 'hallway', 'noun', 'a long passage inside a home', 'przedpokój', 'Shoes are in the hallway.', 7),
    ('corridor', 'corridor', 'noun', 'a long passage connecting rooms', 'korytarz', 'The corridor is narrow.', 8),
    ('hall', 'hall', 'noun', 'the main entrance area of a house', 'hol', 'The hall has a mirror.', 9),
    ('dining room', 'dining room', 'noun', 'a room where you eat meals', 'jadalnia', 'We eat dinner in the dining room.', 10),
    ('porch', 'porch', 'noun', 'a covered area outside the entrance', 'ganek', 'We leave our shoes on the porch.', 11),
    ('study', 'study', 'noun', 'a room used for work or reading', 'gabinet', 'He works in his study.', 12),
    ('home office', 'home office', 'noun', 'a room for work at home', 'biuro', 'She has a desk in her home office.', 13),
    ('kids room', 'kids room', 'noun', 'a room for children', 'pokój dziecięcy', 'The kids room is full of toys.', 14),
    ('guest room', 'guest room', 'noun', 'a room for visitors to sleep', 'pokój gościnny', 'We made the guest room ready.', 15),
    ('pantry', 'pantry', 'noun', 'a small room for food storage', 'spiżarnia', 'We keep pasta in the pantry.', 16),
    ('laundry room', 'laundry room', 'noun', 'a room for washing clothes', 'pralnia', 'The laundry room is downstairs.', 17),
    ('walk-in closet', 'walk-in closet', 'noun', 'a small room for clothes and shoes', 'garderoba', 'She keeps her coats in the walk-in closet.', 18),
    ('basement', 'basement', 'noun', 'the lowest level of a house', 'piwnica', 'The basement is cool in summer.', 19),
    ('attic', 'attic', 'noun', 'a space under the roof for storage', 'strych', 'Old boxes are in the attic.', 20),
    ('loft', 'loft', 'noun', 'a space under the roof used as a room', 'poddasze', 'The loft is now a bedroom.', 21),
    ('balcony', 'balcony', 'noun', 'an outdoor platform attached to a room', 'balkon', 'We sit on the balcony in the evening.', 22),
    ('terrace', 'terrace', 'noun', 'a flat outdoor area by the house', 'taras', 'We have coffee on the terrace.', 23),
    ('veranda', 'veranda', 'noun', 'a roofed open space along the house', 'weranda', 'The veranda is quiet in the morning.', 24),
    ('garage', 'garage', 'noun', 'a place where you keep a car', 'garaż', 'The garage is behind the house.', 25)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('room', 'room', 'noun', 'a space in a house with a specific purpose', 'pokój', 'This room is bright and warm.', 1),
    ('living room', 'living room', 'noun', 'the main room for relaxing and spending time together', 'salon', 'We watch TV in the living room.', 2),
    ('bedroom', 'bedroom', 'noun', 'a room where you sleep', 'sypialnia', 'My bedroom is quiet at night.', 3),
    ('kitchen', 'kitchen', 'noun', 'a room where you cook food', 'kuchnia', 'The kitchen smells like soup.', 4),
    ('bathroom', 'bathroom', 'noun', 'a room with a bath or shower', 'łazienka', 'The bathroom is next to the bedroom.', 5),
    ('toilet', 'toilet', 'noun', 'a small room with a toilet', 'toaleta', 'The toilet is on the left.', 6),
    ('hallway', 'hallway', 'noun', 'a long passage inside a home', 'przedpokój', 'Shoes are in the hallway.', 7),
    ('corridor', 'corridor', 'noun', 'a long passage connecting rooms', 'korytarz', 'The corridor is narrow.', 8),
    ('hall', 'hall', 'noun', 'the main entrance area of a house', 'hol', 'The hall has a mirror.', 9),
    ('dining room', 'dining room', 'noun', 'a room where you eat meals', 'jadalnia', 'We eat dinner in the dining room.', 10),
    ('porch', 'porch', 'noun', 'a covered area outside the entrance', 'ganek', 'We leave our shoes on the porch.', 11),
    ('study', 'study', 'noun', 'a room used for work or reading', 'gabinet', 'He works in his study.', 12),
    ('home office', 'home office', 'noun', 'a room for work at home', 'biuro', 'She has a desk in her home office.', 13),
    ('kids room', 'kids room', 'noun', 'a room for children', 'pokój dziecięcy', 'The kids room is full of toys.', 14),
    ('guest room', 'guest room', 'noun', 'a room for visitors to sleep', 'pokój gościnny', 'We made the guest room ready.', 15),
    ('pantry', 'pantry', 'noun', 'a small room for food storage', 'spiżarnia', 'We keep pasta in the pantry.', 16),
    ('laundry room', 'laundry room', 'noun', 'a room for washing clothes', 'pralnia', 'The laundry room is downstairs.', 17),
    ('walk-in closet', 'walk-in closet', 'noun', 'a small room for clothes and shoes', 'garderoba', 'She keeps her coats in the walk-in closet.', 18),
    ('basement', 'basement', 'noun', 'the lowest level of a house', 'piwnica', 'The basement is cool in summer.', 19),
    ('attic', 'attic', 'noun', 'a space under the roof for storage', 'strych', 'Old boxes are in the attic.', 20),
    ('loft', 'loft', 'noun', 'a space under the roof used as a room', 'poddasze', 'The loft is now a bedroom.', 21),
    ('balcony', 'balcony', 'noun', 'an outdoor platform attached to a room', 'balkon', 'We sit on the balcony in the evening.', 22),
    ('terrace', 'terrace', 'noun', 'a flat outdoor area by the house', 'taras', 'We have coffee on the terrace.', 23),
    ('veranda', 'veranda', 'noun', 'a roofed open space along the house', 'weranda', 'The veranda is quiet in the morning.', 24),
    ('garage', 'garage', 'noun', 'a place where you keep a car', 'garaż', 'The garage is behind the house.', 25)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 2: Salon / Pokój dzienny
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('sofa', 'sofa', 'noun', 'a long comfortable seat', 'sofa', 'The sofa is soft and big.', 1),
    ('couch', 'couch', 'noun', 'a comfortable seat for two or more people', 'kanapa', 'We sit on the couch in the evening.', 2),
    ('armchair', 'armchair', 'noun', 'a comfortable chair with armrests', 'fotel', 'He reads in the armchair.', 3),
    ('coffee table', 'coffee table', 'noun', 'a low table in front of a sofa', 'stolik kawowy', 'The coffee table is in the middle.', 4),
    ('side table', 'side table', 'noun', 'a small table next to a chair or sofa', 'stolik', 'Put the cup on the side table.', 5),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase is full of novels.', 6),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The photos are on the shelf.', 7),
    ('TV', 'tv', 'noun', 'a screen for watching programs', 'telewizor', 'The TV is on the wall.', 8),
    ('floor lamp', 'floor lamp', 'noun', 'a tall lamp that stands on the floor', 'lampa stojąca', 'The floor lamp lights the corner.', 9),
    ('ceiling lamp', 'ceiling lamp', 'noun', 'a lamp fixed to the ceiling', 'lampa sufitowa', 'The ceiling lamp is very bright.', 10),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is warm under my feet.', 11),
    ('decorative cushions', 'decorative cushions', 'noun', 'soft pillows used for decoration', 'poduszki dekoracyjne', 'The decorative cushions are on the sofa.', 12),
    ('curtains', 'curtains', 'noun', 'fabric panels that cover windows', 'zasłony', 'I close the curtains at night.', 13),
    ('sheer curtains', 'sheer curtains', 'noun', 'thin curtains that let light in', 'firany', 'Sheer curtains make the room bright.', 14),
    ('blinds', 'blinds', 'noun', 'window coverings with slats', 'rolety', 'The blinds block the sun.', 15),
    ('clock', 'clock', 'noun', 'a device that shows the time', 'zegar', 'The clock is above the TV.', 16),
    ('book cabinet', 'book cabinet', 'noun', 'a cabinet for storing books', 'szafka z książkami', 'The book cabinet stands by the wall.', 17)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('sofa', 'sofa', 'noun', 'a long comfortable seat', 'sofa', 'The sofa is soft and big.', 1),
    ('couch', 'couch', 'noun', 'a comfortable seat for two or more people', 'kanapa', 'We sit on the couch in the evening.', 2),
    ('armchair', 'armchair', 'noun', 'a comfortable chair with armrests', 'fotel', 'He reads in the armchair.', 3),
    ('coffee table', 'coffee table', 'noun', 'a low table in front of a sofa', 'stolik kawowy', 'The coffee table is in the middle.', 4),
    ('side table', 'side table', 'noun', 'a small table next to a chair or sofa', 'stolik', 'Put the cup on the side table.', 5),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase is full of novels.', 6),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The photos are on the shelf.', 7),
    ('TV', 'tv', 'noun', 'a screen for watching programs', 'telewizor', 'The TV is on the wall.', 8),
    ('floor lamp', 'floor lamp', 'noun', 'a tall lamp that stands on the floor', 'lampa stojąca', 'The floor lamp lights the corner.', 9),
    ('ceiling lamp', 'ceiling lamp', 'noun', 'a lamp fixed to the ceiling', 'lampa sufitowa', 'The ceiling lamp is very bright.', 10),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is warm under my feet.', 11),
    ('decorative cushions', 'decorative cushions', 'noun', 'soft pillows used for decoration', 'poduszki dekoracyjne', 'The decorative cushions are on the sofa.', 12),
    ('curtains', 'curtains', 'noun', 'fabric panels that cover windows', 'zasłony', 'I close the curtains at night.', 13),
    ('sheer curtains', 'sheer curtains', 'noun', 'thin curtains that let light in', 'firany', 'Sheer curtains make the room bright.', 14),
    ('blinds', 'blinds', 'noun', 'window coverings with slats', 'rolety', 'The blinds block the sun.', 15),
    ('clock', 'clock', 'noun', 'a device that shows the time', 'zegar', 'The clock is above the TV.', 16),
    ('book cabinet', 'book cabinet', 'noun', 'a cabinet for storing books', 'szafka z książkami', 'The book cabinet stands by the wall.', 17)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('sofa', 'sofa', 'noun', 'a long comfortable seat', 'sofa', 'The sofa is soft and big.', 1),
    ('couch', 'couch', 'noun', 'a comfortable seat for two or more people', 'kanapa', 'We sit on the couch in the evening.', 2),
    ('armchair', 'armchair', 'noun', 'a comfortable chair with armrests', 'fotel', 'He reads in the armchair.', 3),
    ('coffee table', 'coffee table', 'noun', 'a low table in front of a sofa', 'stolik kawowy', 'The coffee table is in the middle.', 4),
    ('side table', 'side table', 'noun', 'a small table next to a chair or sofa', 'stolik', 'Put the cup on the side table.', 5),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase is full of novels.', 6),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The photos are on the shelf.', 7),
    ('TV', 'tv', 'noun', 'a screen for watching programs', 'telewizor', 'The TV is on the wall.', 8),
    ('floor lamp', 'floor lamp', 'noun', 'a tall lamp that stands on the floor', 'lampa stojąca', 'The floor lamp lights the corner.', 9),
    ('ceiling lamp', 'ceiling lamp', 'noun', 'a lamp fixed to the ceiling', 'lampa sufitowa', 'The ceiling lamp is very bright.', 10),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is warm under my feet.', 11),
    ('decorative cushions', 'decorative cushions', 'noun', 'soft pillows used for decoration', 'poduszki dekoracyjne', 'The decorative cushions are on the sofa.', 12),
    ('curtains', 'curtains', 'noun', 'fabric panels that cover windows', 'zasłony', 'I close the curtains at night.', 13),
    ('sheer curtains', 'sheer curtains', 'noun', 'thin curtains that let light in', 'firany', 'Sheer curtains make the room bright.', 14),
    ('blinds', 'blinds', 'noun', 'window coverings with slats', 'rolety', 'The blinds block the sun.', 15),
    ('clock', 'clock', 'noun', 'a device that shows the time', 'zegar', 'The clock is above the TV.', 16),
    ('book cabinet', 'book cabinet', 'noun', 'a cabinet for storing books', 'szafka z książkami', 'The book cabinet stands by the wall.', 17)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('sofa', 'sofa', 'noun', 'a long comfortable seat', 'sofa', 'The sofa is soft and big.', 1),
    ('couch', 'couch', 'noun', 'a comfortable seat for two or more people', 'kanapa', 'We sit on the couch in the evening.', 2),
    ('armchair', 'armchair', 'noun', 'a comfortable chair with armrests', 'fotel', 'He reads in the armchair.', 3),
    ('coffee table', 'coffee table', 'noun', 'a low table in front of a sofa', 'stolik kawowy', 'The coffee table is in the middle.', 4),
    ('side table', 'side table', 'noun', 'a small table next to a chair or sofa', 'stolik', 'Put the cup on the side table.', 5),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase is full of novels.', 6),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The photos are on the shelf.', 7),
    ('TV', 'tv', 'noun', 'a screen for watching programs', 'telewizor', 'The TV is on the wall.', 8),
    ('floor lamp', 'floor lamp', 'noun', 'a tall lamp that stands on the floor', 'lampa stojąca', 'The floor lamp lights the corner.', 9),
    ('ceiling lamp', 'ceiling lamp', 'noun', 'a lamp fixed to the ceiling', 'lampa sufitowa', 'The ceiling lamp is very bright.', 10),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is warm under my feet.', 11),
    ('decorative cushions', 'decorative cushions', 'noun', 'soft pillows used for decoration', 'poduszki dekoracyjne', 'The decorative cushions are on the sofa.', 12),
    ('curtains', 'curtains', 'noun', 'fabric panels that cover windows', 'zasłony', 'I close the curtains at night.', 13),
    ('sheer curtains', 'sheer curtains', 'noun', 'thin curtains that let light in', 'firany', 'Sheer curtains make the room bright.', 14),
    ('blinds', 'blinds', 'noun', 'window coverings with slats', 'rolety', 'The blinds block the sun.', 15),
    ('clock', 'clock', 'noun', 'a device that shows the time', 'zegar', 'The clock is above the TV.', 16),
    ('book cabinet', 'book cabinet', 'noun', 'a cabinet for storing books', 'szafka z książkami', 'The book cabinet stands by the wall.', 17)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 3: Kuchnia
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('fridge', 'fridge', 'noun', 'a machine that keeps food cold', 'lodówka', 'Milk is in the fridge.', 1),
    ('freezer', 'freezer', 'noun', 'a machine that keeps food frozen', 'zamrażarka', 'We store ice cream in the freezer.', 2),
    ('stove', 'stove', 'noun', 'a cooker with burners for cooking', 'kuchenka', 'The soup is on the stove.', 3),
    ('oven', 'oven', 'noun', 'a hot box used for baking', 'piekarnik', 'The oven is hot.', 4),
    ('cooktop', 'cooktop', 'noun', 'the top part of a cooker with burners', 'płyta grzewcza', 'The cooktop is clean.', 5),
    ('microwave', 'microwave', 'noun', 'a small oven that heats food quickly', 'mikrofalówka', 'I warm the soup in the microwave.', 6),
    ('dishwasher', 'dishwasher', 'noun', 'a machine that washes dishes', 'zmywarka', 'The dishwasher is full.', 7),
    ('kettle', 'kettle', 'noun', 'a pot for boiling water', 'czajnik', 'The kettle is boiling.', 8),
    ('coffee machine', 'coffee machine', 'noun', 'a machine for making coffee', 'ekspres do kawy', 'The coffee machine is on the counter.', 9),
    ('toaster', 'toaster', 'noun', 'a machine for toasting bread', 'toster', 'I use the toaster every morning.', 10),
    ('countertop', 'countertop', 'noun', 'a flat work surface in a kitchen', 'blat', 'The countertop is made of wood.', 11),
    ('kitchen cabinets', 'kitchen cabinets', 'noun', 'storage cupboards in a kitchen', 'szafki kuchenne', 'The plates are in the kitchen cabinets.', 12),
    ('sink', 'sink', 'noun', 'a basin for washing dishes', 'zlew', 'The sink is full of water.', 13),
    ('extractor hood', 'extractor hood', 'noun', 'a device that removes cooking smells', 'okap', 'The extractor hood is loud.', 14),
    ('pots', 'pots', 'noun', 'containers used for cooking food', 'garnki', 'The pots are in the drawer.', 15),
    ('pans', 'pans', 'noun', 'flat containers used for frying', 'patelnie', 'We need new pans.', 16),
    ('knives', 'knives', 'noun', 'tools for cutting food', 'noże', 'The knives are sharp.', 17),
    ('cutting board', 'cutting board', 'noun', 'a board for cutting food', 'deska do krojenia', 'Chop onions on the cutting board.', 18),
    ('cutlery', 'cutlery', 'noun', 'knives, forks, and spoons', 'sztućce', 'The cutlery is in the drawer.', 19),
    ('plates', 'plates', 'noun', 'flat dishes for serving food', 'talerze', 'The plates are clean.', 20),
    ('mugs', 'mugs', 'noun', 'cups with handles for hot drinks', 'kubki', 'The mugs are on the shelf.', 21),
    ('glasses', 'glasses', 'noun', 'drinking containers made of glass', 'szklanki', 'The glasses are on the table.', 22),
    ('bowls', 'bowls', 'noun', 'deep dishes for food', 'miski', 'The bowls are in the cabinet.', 23)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('fridge', 'fridge', 'noun', 'a machine that keeps food cold', 'lodówka', 'Milk is in the fridge.', 1),
    ('freezer', 'freezer', 'noun', 'a machine that keeps food frozen', 'zamrażarka', 'We store ice cream in the freezer.', 2),
    ('stove', 'stove', 'noun', 'a cooker with burners for cooking', 'kuchenka', 'The soup is on the stove.', 3),
    ('oven', 'oven', 'noun', 'a hot box used for baking', 'piekarnik', 'The oven is hot.', 4),
    ('cooktop', 'cooktop', 'noun', 'the top part of a cooker with burners', 'płyta grzewcza', 'The cooktop is clean.', 5),
    ('microwave', 'microwave', 'noun', 'a small oven that heats food quickly', 'mikrofalówka', 'I warm the soup in the microwave.', 6),
    ('dishwasher', 'dishwasher', 'noun', 'a machine that washes dishes', 'zmywarka', 'The dishwasher is full.', 7),
    ('kettle', 'kettle', 'noun', 'a pot for boiling water', 'czajnik', 'The kettle is boiling.', 8),
    ('coffee machine', 'coffee machine', 'noun', 'a machine for making coffee', 'ekspres do kawy', 'The coffee machine is on the counter.', 9),
    ('toaster', 'toaster', 'noun', 'a machine for toasting bread', 'toster', 'I use the toaster every morning.', 10),
    ('countertop', 'countertop', 'noun', 'a flat work surface in a kitchen', 'blat', 'The countertop is made of wood.', 11),
    ('kitchen cabinets', 'kitchen cabinets', 'noun', 'storage cupboards in a kitchen', 'szafki kuchenne', 'The plates are in the kitchen cabinets.', 12),
    ('sink', 'sink', 'noun', 'a basin for washing dishes', 'zlew', 'The sink is full of water.', 13),
    ('extractor hood', 'extractor hood', 'noun', 'a device that removes cooking smells', 'okap', 'The extractor hood is loud.', 14),
    ('pots', 'pots', 'noun', 'containers used for cooking food', 'garnki', 'The pots are in the drawer.', 15),
    ('pans', 'pans', 'noun', 'flat containers used for frying', 'patelnie', 'We need new pans.', 16),
    ('knives', 'knives', 'noun', 'tools for cutting food', 'noże', 'The knives are sharp.', 17),
    ('cutting board', 'cutting board', 'noun', 'a board for cutting food', 'deska do krojenia', 'Chop onions on the cutting board.', 18),
    ('cutlery', 'cutlery', 'noun', 'knives, forks, and spoons', 'sztućce', 'The cutlery is in the drawer.', 19),
    ('plates', 'plates', 'noun', 'flat dishes for serving food', 'talerze', 'The plates are clean.', 20),
    ('mugs', 'mugs', 'noun', 'cups with handles for hot drinks', 'kubki', 'The mugs are on the shelf.', 21),
    ('glasses', 'glasses', 'noun', 'drinking containers made of glass', 'szklanki', 'The glasses are on the table.', 22),
    ('bowls', 'bowls', 'noun', 'deep dishes for food', 'miski', 'The bowls are in the cabinet.', 23)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('fridge', 'fridge', 'noun', 'a machine that keeps food cold', 'lodówka', 'Milk is in the fridge.', 1),
    ('freezer', 'freezer', 'noun', 'a machine that keeps food frozen', 'zamrażarka', 'We store ice cream in the freezer.', 2),
    ('stove', 'stove', 'noun', 'a cooker with burners for cooking', 'kuchenka', 'The soup is on the stove.', 3),
    ('oven', 'oven', 'noun', 'a hot box used for baking', 'piekarnik', 'The oven is hot.', 4),
    ('cooktop', 'cooktop', 'noun', 'the top part of a cooker with burners', 'płyta grzewcza', 'The cooktop is clean.', 5),
    ('microwave', 'microwave', 'noun', 'a small oven that heats food quickly', 'mikrofalówka', 'I warm the soup in the microwave.', 6),
    ('dishwasher', 'dishwasher', 'noun', 'a machine that washes dishes', 'zmywarka', 'The dishwasher is full.', 7),
    ('kettle', 'kettle', 'noun', 'a pot for boiling water', 'czajnik', 'The kettle is boiling.', 8),
    ('coffee machine', 'coffee machine', 'noun', 'a machine for making coffee', 'ekspres do kawy', 'The coffee machine is on the counter.', 9),
    ('toaster', 'toaster', 'noun', 'a machine for toasting bread', 'toster', 'I use the toaster every morning.', 10),
    ('countertop', 'countertop', 'noun', 'a flat work surface in a kitchen', 'blat', 'The countertop is made of wood.', 11),
    ('kitchen cabinets', 'kitchen cabinets', 'noun', 'storage cupboards in a kitchen', 'szafki kuchenne', 'The plates are in the kitchen cabinets.', 12),
    ('sink', 'sink', 'noun', 'a basin for washing dishes', 'zlew', 'The sink is full of water.', 13),
    ('extractor hood', 'extractor hood', 'noun', 'a device that removes cooking smells', 'okap', 'The extractor hood is loud.', 14),
    ('pots', 'pots', 'noun', 'containers used for cooking food', 'garnki', 'The pots are in the drawer.', 15),
    ('pans', 'pans', 'noun', 'flat containers used for frying', 'patelnie', 'We need new pans.', 16),
    ('knives', 'knives', 'noun', 'tools for cutting food', 'noże', 'The knives are sharp.', 17),
    ('cutting board', 'cutting board', 'noun', 'a board for cutting food', 'deska do krojenia', 'Chop onions on the cutting board.', 18),
    ('cutlery', 'cutlery', 'noun', 'knives, forks, and spoons', 'sztućce', 'The cutlery is in the drawer.', 19),
    ('plates', 'plates', 'noun', 'flat dishes for serving food', 'talerze', 'The plates are clean.', 20),
    ('mugs', 'mugs', 'noun', 'cups with handles for hot drinks', 'kubki', 'The mugs are on the shelf.', 21),
    ('glasses', 'glasses', 'noun', 'drinking containers made of glass', 'szklanki', 'The glasses are on the table.', 22),
    ('bowls', 'bowls', 'noun', 'deep dishes for food', 'miski', 'The bowls are in the cabinet.', 23)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('fridge', 'fridge', 'noun', 'a machine that keeps food cold', 'lodówka', 'Milk is in the fridge.', 1),
    ('freezer', 'freezer', 'noun', 'a machine that keeps food frozen', 'zamrażarka', 'We store ice cream in the freezer.', 2),
    ('stove', 'stove', 'noun', 'a cooker with burners for cooking', 'kuchenka', 'The soup is on the stove.', 3),
    ('oven', 'oven', 'noun', 'a hot box used for baking', 'piekarnik', 'The oven is hot.', 4),
    ('cooktop', 'cooktop', 'noun', 'the top part of a cooker with burners', 'płyta grzewcza', 'The cooktop is clean.', 5),
    ('microwave', 'microwave', 'noun', 'a small oven that heats food quickly', 'mikrofalówka', 'I warm the soup in the microwave.', 6),
    ('dishwasher', 'dishwasher', 'noun', 'a machine that washes dishes', 'zmywarka', 'The dishwasher is full.', 7),
    ('kettle', 'kettle', 'noun', 'a pot for boiling water', 'czajnik', 'The kettle is boiling.', 8),
    ('coffee machine', 'coffee machine', 'noun', 'a machine for making coffee', 'ekspres do kawy', 'The coffee machine is on the counter.', 9),
    ('toaster', 'toaster', 'noun', 'a machine for toasting bread', 'toster', 'I use the toaster every morning.', 10),
    ('countertop', 'countertop', 'noun', 'a flat work surface in a kitchen', 'blat', 'The countertop is made of wood.', 11),
    ('kitchen cabinets', 'kitchen cabinets', 'noun', 'storage cupboards in a kitchen', 'szafki kuchenne', 'The plates are in the kitchen cabinets.', 12),
    ('sink', 'sink', 'noun', 'a basin for washing dishes', 'zlew', 'The sink is full of water.', 13),
    ('extractor hood', 'extractor hood', 'noun', 'a device that removes cooking smells', 'okap', 'The extractor hood is loud.', 14),
    ('pots', 'pots', 'noun', 'containers used for cooking food', 'garnki', 'The pots are in the drawer.', 15),
    ('pans', 'pans', 'noun', 'flat containers used for frying', 'patelnie', 'We need new pans.', 16),
    ('knives', 'knives', 'noun', 'tools for cutting food', 'noże', 'The knives are sharp.', 17),
    ('cutting board', 'cutting board', 'noun', 'a board for cutting food', 'deska do krojenia', 'Chop onions on the cutting board.', 18),
    ('cutlery', 'cutlery', 'noun', 'knives, forks, and spoons', 'sztućce', 'The cutlery is in the drawer.', 19),
    ('plates', 'plates', 'noun', 'flat dishes for serving food', 'talerze', 'The plates are clean.', 20),
    ('mugs', 'mugs', 'noun', 'cups with handles for hot drinks', 'kubki', 'The mugs are on the shelf.', 21),
    ('glasses', 'glasses', 'noun', 'drinking containers made of glass', 'szklanki', 'The glasses are on the table.', 22),
    ('bowls', 'bowls', 'noun', 'deep dishes for food', 'miski', 'The bowls are in the cabinet.', 23)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 4: Jadalnia
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('table', 'table', 'noun', 'a piece of furniture for eating or working', 'stół', 'The table is set for dinner.', 1),
    ('chairs', 'chairs', 'noun', 'seats with a back', 'krzesła', 'The chairs are around the table.', 2),
    ('tablecloth', 'tablecloth', 'noun', 'a cloth that covers a table', 'obrus', 'The tablecloth is clean.', 3),
    ('napkins', 'napkins', 'noun', 'cloths or paper for wiping your mouth', 'serwetki', 'The napkins are on the table.', 4),
    ('display cabinet', 'display cabinet', 'noun', 'a cabinet with glass for dishes', 'witryna', 'The display cabinet has plates.', 5),
    ('sideboard', 'sideboard', 'noun', 'a low cabinet for dishes', 'kredens', 'The sideboard is in the corner.', 6),
    ('pendant lamp', 'pendant lamp', 'noun', 'a lamp hanging from the ceiling', 'lampa nad stołem', 'The pendant lamp is above the table.', 7),
    ('dinner set', 'dinner set', 'noun', 'a matching set of plates and bowls', 'zastawa stołowa', 'We bought a new dinner set.', 8),
    ('cutlery', 'cutlery', 'noun', 'knives, forks, and spoons', 'sztućce', 'The cutlery is shiny.', 9)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('table', 'table', 'noun', 'a piece of furniture for eating or working', 'stół', 'The table is set for dinner.', 1),
    ('chairs', 'chairs', 'noun', 'seats with a back', 'krzesła', 'The chairs are around the table.', 2),
    ('tablecloth', 'tablecloth', 'noun', 'a cloth that covers a table', 'obrus', 'The tablecloth is clean.', 3),
    ('napkins', 'napkins', 'noun', 'cloths or paper for wiping your mouth', 'serwetki', 'The napkins are on the table.', 4),
    ('display cabinet', 'display cabinet', 'noun', 'a cabinet with glass for dishes', 'witryna', 'The display cabinet has plates.', 5),
    ('sideboard', 'sideboard', 'noun', 'a low cabinet for dishes', 'kredens', 'The sideboard is in the corner.', 6),
    ('pendant lamp', 'pendant lamp', 'noun', 'a lamp hanging from the ceiling', 'lampa nad stołem', 'The pendant lamp is above the table.', 7),
    ('dinner set', 'dinner set', 'noun', 'a matching set of plates and bowls', 'zastawa stołowa', 'We bought a new dinner set.', 8),
    ('cutlery', 'cutlery', 'noun', 'knives, forks, and spoons', 'sztućce', 'The cutlery is shiny.', 9)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('table', 'table', 'noun', 'a piece of furniture for eating or working', 'stół', 'The table is set for dinner.', 1),
    ('chairs', 'chairs', 'noun', 'seats with a back', 'krzesła', 'The chairs are around the table.', 2),
    ('tablecloth', 'tablecloth', 'noun', 'a cloth that covers a table', 'obrus', 'The tablecloth is clean.', 3),
    ('napkins', 'napkins', 'noun', 'cloths or paper for wiping your mouth', 'serwetki', 'The napkins are on the table.', 4),
    ('display cabinet', 'display cabinet', 'noun', 'a cabinet with glass for dishes', 'witryna', 'The display cabinet has plates.', 5),
    ('sideboard', 'sideboard', 'noun', 'a low cabinet for dishes', 'kredens', 'The sideboard is in the corner.', 6),
    ('pendant lamp', 'pendant lamp', 'noun', 'a lamp hanging from the ceiling', 'lampa nad stołem', 'The pendant lamp is above the table.', 7),
    ('dinner set', 'dinner set', 'noun', 'a matching set of plates and bowls', 'zastawa stołowa', 'We bought a new dinner set.', 8),
    ('cutlery', 'cutlery', 'noun', 'knives, forks, and spoons', 'sztućce', 'The cutlery is shiny.', 9)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('table', 'table', 'noun', 'a piece of furniture for eating or working', 'stół', 'The table is set for dinner.', 1),
    ('chairs', 'chairs', 'noun', 'seats with a back', 'krzesła', 'The chairs are around the table.', 2),
    ('tablecloth', 'tablecloth', 'noun', 'a cloth that covers a table', 'obrus', 'The tablecloth is clean.', 3),
    ('napkins', 'napkins', 'noun', 'cloths or paper for wiping your mouth', 'serwetki', 'The napkins are on the table.', 4),
    ('display cabinet', 'display cabinet', 'noun', 'a cabinet with glass for dishes', 'witryna', 'The display cabinet has plates.', 5),
    ('sideboard', 'sideboard', 'noun', 'a low cabinet for dishes', 'kredens', 'The sideboard is in the corner.', 6),
    ('pendant lamp', 'pendant lamp', 'noun', 'a lamp hanging from the ceiling', 'lampa nad stołem', 'The pendant lamp is above the table.', 7),
    ('dinner set', 'dinner set', 'noun', 'a matching set of plates and bowls', 'zastawa stołowa', 'We bought a new dinner set.', 8),
    ('cutlery', 'cutlery', 'noun', 'knives, forks, and spoons', 'sztućce', 'The cutlery is shiny.', 9)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 5: Sypialnia
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bed', 'bed', 'noun', 'a piece of furniture for sleeping', 'łóżko', 'The bed is made.', 1),
    ('mattress', 'mattress', 'noun', 'a soft base for sleeping on', 'materac', 'The mattress is very comfortable.', 2),
    ('bed frame', 'bed frame', 'noun', 'the structure that holds a mattress', 'rama łóżka', 'The bed frame is made of wood.', 3),
    ('bedside table', 'bedside table', 'noun', 'a small table next to a bed', 'stolik nocny', 'My phone is on the bedside table.', 4),
    ('bedside lamp', 'bedside lamp', 'noun', 'a small lamp by the bed', 'lampka nocna', 'I turn on the bedside lamp at night.', 5),
    ('wardrobe', 'wardrobe', 'noun', 'a tall cabinet for clothes', 'szafa', 'The wardrobe is full of clothes.', 6),
    ('chest of drawers', 'chest of drawers', 'noun', 'a piece of furniture with drawers', 'komoda', 'Socks are in the chest of drawers.', 7),
    ('bedding', 'bedding', 'noun', 'sheets and covers for a bed', 'pościel', 'I change the bedding every week.', 8),
    ('duvet', 'duvet', 'noun', 'a thick warm cover for a bed', 'kołdra', 'The duvet is warm.', 9),
    ('pillow', 'pillow', 'noun', 'a soft support for your head', 'poduszka', 'The pillow is soft.', 10),
    ('bed sheet', 'bed sheet', 'noun', 'a sheet that covers a mattress', 'prześcieradło', 'The bed sheet is white.', 11),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is next to the bed.', 12),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'There is a mirror on the wall.', 13),
    ('curtains', 'curtains', 'noun', 'fabric panels that cover windows', 'zasłony', 'The curtains are closed.', 14),
    ('alarm clock', 'alarm clock', 'noun', 'a clock that wakes you up', 'budzik', 'The alarm clock rings at seven.', 15)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bed', 'bed', 'noun', 'a piece of furniture for sleeping', 'łóżko', 'The bed is made.', 1),
    ('mattress', 'mattress', 'noun', 'a soft base for sleeping on', 'materac', 'The mattress is very comfortable.', 2),
    ('bed frame', 'bed frame', 'noun', 'the structure that holds a mattress', 'rama łóżka', 'The bed frame is made of wood.', 3),
    ('bedside table', 'bedside table', 'noun', 'a small table next to a bed', 'stolik nocny', 'My phone is on the bedside table.', 4),
    ('bedside lamp', 'bedside lamp', 'noun', 'a small lamp by the bed', 'lampka nocna', 'I turn on the bedside lamp at night.', 5),
    ('wardrobe', 'wardrobe', 'noun', 'a tall cabinet for clothes', 'szafa', 'The wardrobe is full of clothes.', 6),
    ('chest of drawers', 'chest of drawers', 'noun', 'a piece of furniture with drawers', 'komoda', 'Socks are in the chest of drawers.', 7),
    ('bedding', 'bedding', 'noun', 'sheets and covers for a bed', 'pościel', 'I change the bedding every week.', 8),
    ('duvet', 'duvet', 'noun', 'a thick warm cover for a bed', 'kołdra', 'The duvet is warm.', 9),
    ('pillow', 'pillow', 'noun', 'a soft support for your head', 'poduszka', 'The pillow is soft.', 10),
    ('bed sheet', 'bed sheet', 'noun', 'a sheet that covers a mattress', 'prześcieradło', 'The bed sheet is white.', 11),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is next to the bed.', 12),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'There is a mirror on the wall.', 13),
    ('curtains', 'curtains', 'noun', 'fabric panels that cover windows', 'zasłony', 'The curtains are closed.', 14),
    ('alarm clock', 'alarm clock', 'noun', 'a clock that wakes you up', 'budzik', 'The alarm clock rings at seven.', 15)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bed', 'bed', 'noun', 'a piece of furniture for sleeping', 'łóżko', 'The bed is made.', 1),
    ('mattress', 'mattress', 'noun', 'a soft base for sleeping on', 'materac', 'The mattress is very comfortable.', 2),
    ('bed frame', 'bed frame', 'noun', 'the structure that holds a mattress', 'rama łóżka', 'The bed frame is made of wood.', 3),
    ('bedside table', 'bedside table', 'noun', 'a small table next to a bed', 'stolik nocny', 'My phone is on the bedside table.', 4),
    ('bedside lamp', 'bedside lamp', 'noun', 'a small lamp by the bed', 'lampka nocna', 'I turn on the bedside lamp at night.', 5),
    ('wardrobe', 'wardrobe', 'noun', 'a tall cabinet for clothes', 'szafa', 'The wardrobe is full of clothes.', 6),
    ('chest of drawers', 'chest of drawers', 'noun', 'a piece of furniture with drawers', 'komoda', 'Socks are in the chest of drawers.', 7),
    ('bedding', 'bedding', 'noun', 'sheets and covers for a bed', 'pościel', 'I change the bedding every week.', 8),
    ('duvet', 'duvet', 'noun', 'a thick warm cover for a bed', 'kołdra', 'The duvet is warm.', 9),
    ('pillow', 'pillow', 'noun', 'a soft support for your head', 'poduszka', 'The pillow is soft.', 10),
    ('bed sheet', 'bed sheet', 'noun', 'a sheet that covers a mattress', 'prześcieradło', 'The bed sheet is white.', 11),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is next to the bed.', 12),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'There is a mirror on the wall.', 13),
    ('curtains', 'curtains', 'noun', 'fabric panels that cover windows', 'zasłony', 'The curtains are closed.', 14),
    ('alarm clock', 'alarm clock', 'noun', 'a clock that wakes you up', 'budzik', 'The alarm clock rings at seven.', 15)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bed', 'bed', 'noun', 'a piece of furniture for sleeping', 'łóżko', 'The bed is made.', 1),
    ('mattress', 'mattress', 'noun', 'a soft base for sleeping on', 'materac', 'The mattress is very comfortable.', 2),
    ('bed frame', 'bed frame', 'noun', 'the structure that holds a mattress', 'rama łóżka', 'The bed frame is made of wood.', 3),
    ('bedside table', 'bedside table', 'noun', 'a small table next to a bed', 'stolik nocny', 'My phone is on the bedside table.', 4),
    ('bedside lamp', 'bedside lamp', 'noun', 'a small lamp by the bed', 'lampka nocna', 'I turn on the bedside lamp at night.', 5),
    ('wardrobe', 'wardrobe', 'noun', 'a tall cabinet for clothes', 'szafa', 'The wardrobe is full of clothes.', 6),
    ('chest of drawers', 'chest of drawers', 'noun', 'a piece of furniture with drawers', 'komoda', 'Socks are in the chest of drawers.', 7),
    ('bedding', 'bedding', 'noun', 'sheets and covers for a bed', 'pościel', 'I change the bedding every week.', 8),
    ('duvet', 'duvet', 'noun', 'a thick warm cover for a bed', 'kołdra', 'The duvet is warm.', 9),
    ('pillow', 'pillow', 'noun', 'a soft support for your head', 'poduszka', 'The pillow is soft.', 10),
    ('bed sheet', 'bed sheet', 'noun', 'a sheet that covers a mattress', 'prześcieradło', 'The bed sheet is white.', 11),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is next to the bed.', 12),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'There is a mirror on the wall.', 13),
    ('curtains', 'curtains', 'noun', 'fabric panels that cover windows', 'zasłony', 'The curtains are closed.', 14),
    ('alarm clock', 'alarm clock', 'noun', 'a clock that wakes you up', 'budzik', 'The alarm clock rings at seven.', 15)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 6: Łazienka
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bathtub', 'bathtub', 'noun', 'a long container for taking a bath', 'wanna', 'The bathtub is full of water.', 1),
    ('shower', 'shower', 'noun', 'a place where you wash under running water', 'prysznic', 'I take a shower every morning.', 2),
    ('washbasin', 'washbasin', 'noun', 'a sink for washing hands and face', 'umywalka', 'The washbasin is clean.', 3),
    ('toilet', 'toilet', 'noun', 'a bowl used for human waste', 'toaleta', 'The toilet is next to the sink.', 4),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'The mirror is above the sink.', 5),
    ('bathroom cabinet', 'bathroom cabinet', 'noun', 'a cabinet for bathroom items', 'szafka łazienkowa', 'The towels are in the bathroom cabinet.', 6),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The soap is on the shelf.', 7),
    ('towel', 'towel', 'noun', 'a piece of cloth for drying', 'ręcznik', 'I need a clean towel.', 8),
    ('shower curtain', 'shower curtain', 'noun', 'a curtain that keeps water inside the shower', 'zasłona prysznicowa', 'The shower curtain is blue.', 9),
    ('soap dispenser', 'soap dispenser', 'noun', 'a container that gives soap', 'dozownik mydła', 'The soap dispenser is on the sink.', 10),
    ('soap dish', 'soap dish', 'noun', 'a small plate for a bar of soap', 'mydelniczka', 'The soap dish is empty.', 11),
    ('shower gel', 'shower gel', 'noun', 'liquid soap for the body', 'żel pod prysznic', 'The shower gel smells nice.', 12),
    ('shampoo', 'shampoo', 'noun', 'liquid soap for hair', 'szampon', 'The shampoo is on the shelf.', 13),
    ('conditioner', 'conditioner', 'noun', 'a hair product after shampoo', 'odżywka', 'She uses conditioner every day.', 14),
    ('towel rail', 'towel rail', 'noun', 'a bar for hanging towels', 'uchwyt na ręczniki', 'The towel rail is warm.', 15),
    ('toilet paper', 'toilet paper', 'noun', 'paper for cleaning after using the toilet', 'papier toaletowy', 'We need more toilet paper.', 16),
    ('toilet brush', 'toilet brush', 'noun', 'a brush for cleaning the toilet', 'szczotka do toalety', 'The toilet brush is in the corner.', 17),
    ('trash bin', 'trash bin', 'noun', 'a container for rubbish', 'kosz na śmieci', 'The trash bin is full.', 18),
    ('toilet bowl', 'toilet bowl', 'noun', 'the bowl part of a toilet', 'muszla klozetowa', 'The toilet bowl is clean.', 19),
    ('toilet paper holder', 'toilet paper holder', 'noun', 'a holder for toilet paper', 'uchwyt na papier', 'The toilet paper holder is broken.', 20),
    ('laundry basket', 'laundry basket', 'noun', 'a basket for dirty clothes', 'kosz na pranie', 'The laundry basket is full.', 21)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bathtub', 'bathtub', 'noun', 'a long container for taking a bath', 'wanna', 'The bathtub is full of water.', 1),
    ('shower', 'shower', 'noun', 'a place where you wash under running water', 'prysznic', 'I take a shower every morning.', 2),
    ('washbasin', 'washbasin', 'noun', 'a sink for washing hands and face', 'umywalka', 'The washbasin is clean.', 3),
    ('toilet', 'toilet', 'noun', 'a bowl used for human waste', 'toaleta', 'The toilet is next to the sink.', 4),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'The mirror is above the sink.', 5),
    ('bathroom cabinet', 'bathroom cabinet', 'noun', 'a cabinet for bathroom items', 'szafka łazienkowa', 'The towels are in the bathroom cabinet.', 6),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The soap is on the shelf.', 7),
    ('towel', 'towel', 'noun', 'a piece of cloth for drying', 'ręcznik', 'I need a clean towel.', 8),
    ('shower curtain', 'shower curtain', 'noun', 'a curtain that keeps water inside the shower', 'zasłona prysznicowa', 'The shower curtain is blue.', 9),
    ('soap dispenser', 'soap dispenser', 'noun', 'a container that gives soap', 'dozownik mydła', 'The soap dispenser is on the sink.', 10),
    ('soap dish', 'soap dish', 'noun', 'a small plate for a bar of soap', 'mydelniczka', 'The soap dish is empty.', 11),
    ('shower gel', 'shower gel', 'noun', 'liquid soap for the body', 'żel pod prysznic', 'The shower gel smells nice.', 12),
    ('shampoo', 'shampoo', 'noun', 'liquid soap for hair', 'szampon', 'The shampoo is on the shelf.', 13),
    ('conditioner', 'conditioner', 'noun', 'a hair product after shampoo', 'odżywka', 'She uses conditioner every day.', 14),
    ('towel rail', 'towel rail', 'noun', 'a bar for hanging towels', 'uchwyt na ręczniki', 'The towel rail is warm.', 15),
    ('toilet paper', 'toilet paper', 'noun', 'paper for cleaning after using the toilet', 'papier toaletowy', 'We need more toilet paper.', 16),
    ('toilet brush', 'toilet brush', 'noun', 'a brush for cleaning the toilet', 'szczotka do toalety', 'The toilet brush is in the corner.', 17),
    ('trash bin', 'trash bin', 'noun', 'a container for rubbish', 'kosz na śmieci', 'The trash bin is full.', 18),
    ('toilet bowl', 'toilet bowl', 'noun', 'the bowl part of a toilet', 'muszla klozetowa', 'The toilet bowl is clean.', 19),
    ('toilet paper holder', 'toilet paper holder', 'noun', 'a holder for toilet paper', 'uchwyt na papier', 'The toilet paper holder is broken.', 20),
    ('laundry basket', 'laundry basket', 'noun', 'a basket for dirty clothes', 'kosz na pranie', 'The laundry basket is full.', 21)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bathtub', 'bathtub', 'noun', 'a long container for taking a bath', 'wanna', 'The bathtub is full of water.', 1),
    ('shower', 'shower', 'noun', 'a place where you wash under running water', 'prysznic', 'I take a shower every morning.', 2),
    ('washbasin', 'washbasin', 'noun', 'a sink for washing hands and face', 'umywalka', 'The washbasin is clean.', 3),
    ('toilet', 'toilet', 'noun', 'a bowl used for human waste', 'toaleta', 'The toilet is next to the sink.', 4),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'The mirror is above the sink.', 5),
    ('bathroom cabinet', 'bathroom cabinet', 'noun', 'a cabinet for bathroom items', 'szafka łazienkowa', 'The towels are in the bathroom cabinet.', 6),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The soap is on the shelf.', 7),
    ('towel', 'towel', 'noun', 'a piece of cloth for drying', 'ręcznik', 'I need a clean towel.', 8),
    ('shower curtain', 'shower curtain', 'noun', 'a curtain that keeps water inside the shower', 'zasłona prysznicowa', 'The shower curtain is blue.', 9),
    ('soap dispenser', 'soap dispenser', 'noun', 'a container that gives soap', 'dozownik mydła', 'The soap dispenser is on the sink.', 10),
    ('soap dish', 'soap dish', 'noun', 'a small plate for a bar of soap', 'mydelniczka', 'The soap dish is empty.', 11),
    ('shower gel', 'shower gel', 'noun', 'liquid soap for the body', 'żel pod prysznic', 'The shower gel smells nice.', 12),
    ('shampoo', 'shampoo', 'noun', 'liquid soap for hair', 'szampon', 'The shampoo is on the shelf.', 13),
    ('conditioner', 'conditioner', 'noun', 'a hair product after shampoo', 'odżywka', 'She uses conditioner every day.', 14),
    ('towel rail', 'towel rail', 'noun', 'a bar for hanging towels', 'uchwyt na ręczniki', 'The towel rail is warm.', 15),
    ('toilet paper', 'toilet paper', 'noun', 'paper for cleaning after using the toilet', 'papier toaletowy', 'We need more toilet paper.', 16),
    ('toilet brush', 'toilet brush', 'noun', 'a brush for cleaning the toilet', 'szczotka do toalety', 'The toilet brush is in the corner.', 17),
    ('trash bin', 'trash bin', 'noun', 'a container for rubbish', 'kosz na śmieci', 'The trash bin is full.', 18),
    ('toilet bowl', 'toilet bowl', 'noun', 'the bowl part of a toilet', 'muszla klozetowa', 'The toilet bowl is clean.', 19),
    ('toilet paper holder', 'toilet paper holder', 'noun', 'a holder for toilet paper', 'uchwyt na papier', 'The toilet paper holder is broken.', 20),
    ('laundry basket', 'laundry basket', 'noun', 'a basket for dirty clothes', 'kosz na pranie', 'The laundry basket is full.', 21)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bathtub', 'bathtub', 'noun', 'a long container for taking a bath', 'wanna', 'The bathtub is full of water.', 1),
    ('shower', 'shower', 'noun', 'a place where you wash under running water', 'prysznic', 'I take a shower every morning.', 2),
    ('washbasin', 'washbasin', 'noun', 'a sink for washing hands and face', 'umywalka', 'The washbasin is clean.', 3),
    ('toilet', 'toilet', 'noun', 'a bowl used for human waste', 'toaleta', 'The toilet is next to the sink.', 4),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'The mirror is above the sink.', 5),
    ('bathroom cabinet', 'bathroom cabinet', 'noun', 'a cabinet for bathroom items', 'szafka łazienkowa', 'The towels are in the bathroom cabinet.', 6),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The soap is on the shelf.', 7),
    ('towel', 'towel', 'noun', 'a piece of cloth for drying', 'ręcznik', 'I need a clean towel.', 8),
    ('shower curtain', 'shower curtain', 'noun', 'a curtain that keeps water inside the shower', 'zasłona prysznicowa', 'The shower curtain is blue.', 9),
    ('soap dispenser', 'soap dispenser', 'noun', 'a container that gives soap', 'dozownik mydła', 'The soap dispenser is on the sink.', 10),
    ('soap dish', 'soap dish', 'noun', 'a small plate for a bar of soap', 'mydelniczka', 'The soap dish is empty.', 11),
    ('shower gel', 'shower gel', 'noun', 'liquid soap for the body', 'żel pod prysznic', 'The shower gel smells nice.', 12),
    ('shampoo', 'shampoo', 'noun', 'liquid soap for hair', 'szampon', 'The shampoo is on the shelf.', 13),
    ('conditioner', 'conditioner', 'noun', 'a hair product after shampoo', 'odżywka', 'She uses conditioner every day.', 14),
    ('towel rail', 'towel rail', 'noun', 'a bar for hanging towels', 'uchwyt na ręczniki', 'The towel rail is warm.', 15),
    ('toilet paper', 'toilet paper', 'noun', 'paper for cleaning after using the toilet', 'papier toaletowy', 'We need more toilet paper.', 16),
    ('toilet brush', 'toilet brush', 'noun', 'a brush for cleaning the toilet', 'szczotka do toalety', 'The toilet brush is in the corner.', 17),
    ('trash bin', 'trash bin', 'noun', 'a container for rubbish', 'kosz na śmieci', 'The trash bin is full.', 18),
    ('toilet bowl', 'toilet bowl', 'noun', 'the bowl part of a toilet', 'muszla klozetowa', 'The toilet bowl is clean.', 19),
    ('toilet paper holder', 'toilet paper holder', 'noun', 'a holder for toilet paper', 'uchwyt na papier', 'The toilet paper holder is broken.', 20),
    ('laundry basket', 'laundry basket', 'noun', 'a basket for dirty clothes', 'kosz na pranie', 'The laundry basket is full.', 21)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 7: Przedpokój / Hol
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('coat rack', 'coat rack', 'noun', 'a stand for hanging coats', 'wieszak', 'The coat rack is by the door.', 1),
    ('wardrobe', 'wardrobe', 'noun', 'a tall cabinet for clothes', 'szafa', 'The wardrobe is in the hall.', 2),
    ('shoe cabinet', 'shoe cabinet', 'noun', 'a cabinet for storing shoes', 'szafka na buty', 'The shoe cabinet is full.', 3),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'There is a mirror near the door.', 4),
    ('doormat', 'doormat', 'noun', 'a mat at the entrance of a house', 'wycieraczka', 'Wipe your shoes on the doormat.', 5),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The keys are on the shelf.', 6),
    ('bench', 'bench', 'noun', 'a long seat without a back', 'siedzisko', 'I sit on the bench to put on shoes.', 7)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('coat rack', 'coat rack', 'noun', 'a stand for hanging coats', 'wieszak', 'The coat rack is by the door.', 1),
    ('wardrobe', 'wardrobe', 'noun', 'a tall cabinet for clothes', 'szafa', 'The wardrobe is in the hall.', 2),
    ('shoe cabinet', 'shoe cabinet', 'noun', 'a cabinet for storing shoes', 'szafka na buty', 'The shoe cabinet is full.', 3),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'There is a mirror near the door.', 4),
    ('doormat', 'doormat', 'noun', 'a mat at the entrance of a house', 'wycieraczka', 'Wipe your shoes on the doormat.', 5),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The keys are on the shelf.', 6),
    ('bench', 'bench', 'noun', 'a long seat without a back', 'siedzisko', 'I sit on the bench to put on shoes.', 7)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('coat rack', 'coat rack', 'noun', 'a stand for hanging coats', 'wieszak', 'The coat rack is by the door.', 1),
    ('wardrobe', 'wardrobe', 'noun', 'a tall cabinet for clothes', 'szafa', 'The wardrobe is in the hall.', 2),
    ('shoe cabinet', 'shoe cabinet', 'noun', 'a cabinet for storing shoes', 'szafka na buty', 'The shoe cabinet is full.', 3),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'There is a mirror near the door.', 4),
    ('doormat', 'doormat', 'noun', 'a mat at the entrance of a house', 'wycieraczka', 'Wipe your shoes on the doormat.', 5),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The keys are on the shelf.', 6),
    ('bench', 'bench', 'noun', 'a long seat without a back', 'siedzisko', 'I sit on the bench to put on shoes.', 7)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('coat rack', 'coat rack', 'noun', 'a stand for hanging coats', 'wieszak', 'The coat rack is by the door.', 1),
    ('wardrobe', 'wardrobe', 'noun', 'a tall cabinet for clothes', 'szafa', 'The wardrobe is in the hall.', 2),
    ('shoe cabinet', 'shoe cabinet', 'noun', 'a cabinet for storing shoes', 'szafka na buty', 'The shoe cabinet is full.', 3),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'There is a mirror near the door.', 4),
    ('doormat', 'doormat', 'noun', 'a mat at the entrance of a house', 'wycieraczka', 'Wipe your shoes on the doormat.', 5),
    ('shelf', 'shelf', 'noun', 'a flat surface for storing things', 'półka', 'The keys are on the shelf.', 6),
    ('bench', 'bench', 'noun', 'a long seat without a back', 'siedzisko', 'I sit on the bench to put on shoes.', 7)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 8: Gabinet / Biuro
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('desk', 'desk', 'noun', 'a table for working or studying', 'biurko', 'The desk is next to the window.', 1),
    ('office chair', 'office chair', 'noun', 'a chair used at a desk', 'krzesło biurowe', 'The office chair is comfortable.', 2),
    ('computer', 'computer', 'noun', 'an electronic device for work', 'komputer', 'The computer is on the desk.', 3),
    ('monitor', 'monitor', 'noun', 'a screen for a computer', 'monitor', 'The monitor is large.', 4),
    ('keyboard', 'keyboard', 'noun', 'a set of keys for typing', 'klawiatura', 'The keyboard is on the desk.', 5),
    ('mouse', 'mouse', 'noun', 'a device used to control a computer', 'mysz', 'The mouse is wireless.', 6),
    ('desk lamp', 'desk lamp', 'noun', 'a lamp for a desk', 'lampka biurkowa', 'The desk lamp is bright.', 7),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase is full of files.', 8),
    ('folders', 'folders', 'noun', 'containers for documents', 'segregatory', 'The folders are on the shelf.', 9),
    ('printer', 'printer', 'noun', 'a machine that prints documents', 'drukarka', 'The printer is on the cabinet.', 10),
    ('drawers', 'drawers', 'noun', 'sliding boxes in a desk or cabinet', 'szuflady', 'The drawers are under the desk.', 11)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('desk', 'desk', 'noun', 'a table for working or studying', 'biurko', 'The desk is next to the window.', 1),
    ('office chair', 'office chair', 'noun', 'a chair used at a desk', 'krzesło biurowe', 'The office chair is comfortable.', 2),
    ('computer', 'computer', 'noun', 'an electronic device for work', 'komputer', 'The computer is on the desk.', 3),
    ('monitor', 'monitor', 'noun', 'a screen for a computer', 'monitor', 'The monitor is large.', 4),
    ('keyboard', 'keyboard', 'noun', 'a set of keys for typing', 'klawiatura', 'The keyboard is on the desk.', 5),
    ('mouse', 'mouse', 'noun', 'a device used to control a computer', 'mysz', 'The mouse is wireless.', 6),
    ('desk lamp', 'desk lamp', 'noun', 'a lamp for a desk', 'lampka biurkowa', 'The desk lamp is bright.', 7),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase is full of files.', 8),
    ('folders', 'folders', 'noun', 'containers for documents', 'segregatory', 'The folders are on the shelf.', 9),
    ('printer', 'printer', 'noun', 'a machine that prints documents', 'drukarka', 'The printer is on the cabinet.', 10),
    ('drawers', 'drawers', 'noun', 'sliding boxes in a desk or cabinet', 'szuflady', 'The drawers are under the desk.', 11)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('desk', 'desk', 'noun', 'a table for working or studying', 'biurko', 'The desk is next to the window.', 1),
    ('office chair', 'office chair', 'noun', 'a chair used at a desk', 'krzesło biurowe', 'The office chair is comfortable.', 2),
    ('computer', 'computer', 'noun', 'an electronic device for work', 'komputer', 'The computer is on the desk.', 3),
    ('monitor', 'monitor', 'noun', 'a screen for a computer', 'monitor', 'The monitor is large.', 4),
    ('keyboard', 'keyboard', 'noun', 'a set of keys for typing', 'klawiatura', 'The keyboard is on the desk.', 5),
    ('mouse', 'mouse', 'noun', 'a device used to control a computer', 'mysz', 'The mouse is wireless.', 6),
    ('desk lamp', 'desk lamp', 'noun', 'a lamp for a desk', 'lampka biurkowa', 'The desk lamp is bright.', 7),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase is full of files.', 8),
    ('folders', 'folders', 'noun', 'containers for documents', 'segregatory', 'The folders are on the shelf.', 9),
    ('printer', 'printer', 'noun', 'a machine that prints documents', 'drukarka', 'The printer is on the cabinet.', 10),
    ('drawers', 'drawers', 'noun', 'sliding boxes in a desk or cabinet', 'szuflady', 'The drawers are under the desk.', 11)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('desk', 'desk', 'noun', 'a table for working or studying', 'biurko', 'The desk is next to the window.', 1),
    ('office chair', 'office chair', 'noun', 'a chair used at a desk', 'krzesło biurowe', 'The office chair is comfortable.', 2),
    ('computer', 'computer', 'noun', 'an electronic device for work', 'komputer', 'The computer is on the desk.', 3),
    ('monitor', 'monitor', 'noun', 'a screen for a computer', 'monitor', 'The monitor is large.', 4),
    ('keyboard', 'keyboard', 'noun', 'a set of keys for typing', 'klawiatura', 'The keyboard is on the desk.', 5),
    ('mouse', 'mouse', 'noun', 'a device used to control a computer', 'mysz', 'The mouse is wireless.', 6),
    ('desk lamp', 'desk lamp', 'noun', 'a lamp for a desk', 'lampka biurkowa', 'The desk lamp is bright.', 7),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase is full of files.', 8),
    ('folders', 'folders', 'noun', 'containers for documents', 'segregatory', 'The folders are on the shelf.', 9),
    ('printer', 'printer', 'noun', 'a machine that prints documents', 'drukarka', 'The printer is on the cabinet.', 10),
    ('drawers', 'drawers', 'noun', 'sliding boxes in a desk or cabinet', 'szuflady', 'The drawers are under the desk.', 11)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 9: Pokój dziecięcy
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bed', 'bed', 'noun', 'a piece of furniture for sleeping', 'łóżko', 'The bed is near the window.', 1),
    ('desk', 'desk', 'noun', 'a table for work or study', 'biurko', 'The desk is small but tidy.', 2),
    ('chair', 'chair', 'noun', 'a seat with a back', 'krzesło', 'The chair is next to the desk.', 3),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase holds storybooks.', 4),
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves hold toys.', 5),
    ('toys', 'toys', 'noun', 'things children play with', 'zabawki', 'The toys are on the floor.', 6),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is soft for playing.', 7),
    ('lamp', 'lamp', 'noun', 'a light in the room', 'lampka', 'The lamp is on at night.', 8),
    ('toy box', 'toy box', 'noun', 'a box for storing toys', 'kosz na zabawki', 'The toy box is full of blocks.', 9)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bed', 'bed', 'noun', 'a piece of furniture for sleeping', 'łóżko', 'The bed is near the window.', 1),
    ('desk', 'desk', 'noun', 'a table for work or study', 'biurko', 'The desk is small but tidy.', 2),
    ('chair', 'chair', 'noun', 'a seat with a back', 'krzesło', 'The chair is next to the desk.', 3),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase holds storybooks.', 4),
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves hold toys.', 5),
    ('toys', 'toys', 'noun', 'things children play with', 'zabawki', 'The toys are on the floor.', 6),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is soft for playing.', 7),
    ('lamp', 'lamp', 'noun', 'a light in the room', 'lampka', 'The lamp is on at night.', 8),
    ('toy box', 'toy box', 'noun', 'a box for storing toys', 'kosz na zabawki', 'The toy box is full of blocks.', 9)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bed', 'bed', 'noun', 'a piece of furniture for sleeping', 'łóżko', 'The bed is near the window.', 1),
    ('desk', 'desk', 'noun', 'a table for work or study', 'biurko', 'The desk is small but tidy.', 2),
    ('chair', 'chair', 'noun', 'a seat with a back', 'krzesło', 'The chair is next to the desk.', 3),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase holds storybooks.', 4),
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves hold toys.', 5),
    ('toys', 'toys', 'noun', 'things children play with', 'zabawki', 'The toys are on the floor.', 6),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is soft for playing.', 7),
    ('lamp', 'lamp', 'noun', 'a light in the room', 'lampka', 'The lamp is on at night.', 8),
    ('toy box', 'toy box', 'noun', 'a box for storing toys', 'kosz na zabawki', 'The toy box is full of blocks.', 9)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bed', 'bed', 'noun', 'a piece of furniture for sleeping', 'łóżko', 'The bed is near the window.', 1),
    ('desk', 'desk', 'noun', 'a table for work or study', 'biurko', 'The desk is small but tidy.', 2),
    ('chair', 'chair', 'noun', 'a seat with a back', 'krzesło', 'The chair is next to the desk.', 3),
    ('bookcase', 'bookcase', 'noun', 'a piece of furniture for books', 'regał', 'The bookcase holds storybooks.', 4),
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves hold toys.', 5),
    ('toys', 'toys', 'noun', 'things children play with', 'zabawki', 'The toys are on the floor.', 6),
    ('carpet', 'carpet', 'noun', 'a large floor covering', 'dywan', 'The carpet is soft for playing.', 7),
    ('lamp', 'lamp', 'noun', 'a light in the room', 'lampka', 'The lamp is on at night.', 8),
    ('toy box', 'toy box', 'noun', 'a box for storing toys', 'kosz na zabawki', 'The toy box is full of blocks.', 9)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 10: Pralnia
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('washer', 'washer', 'noun', 'a machine for washing clothes', 'pralka', 'The washer is running.', 1),
    ('dryer', 'dryer', 'noun', 'a machine for drying clothes', 'suszarka', 'The dryer is loud.', 2),
    ('laundry basket', 'laundry basket', 'noun', 'a basket for dirty clothes', 'kosz na pranie', 'The laundry basket is full.', 3),
    ('detergents', 'detergents', 'noun', 'cleaning products for clothes', 'detergenty', 'The detergents are on the shelf.', 4),
    ('laundry powder', 'laundry powder', 'noun', 'powder used to wash clothes', 'proszek do prania', 'I use laundry powder for towels.', 5),
    ('fabric softener', 'fabric softener', 'noun', 'liquid that makes clothes soft', 'płyn do płukania', 'The fabric softener smells nice.', 6),
    ('ironing board', 'ironing board', 'noun', 'a board for ironing clothes', 'deska do prasowania', 'The ironing board is folded.', 7),
    ('iron', 'iron', 'noun', 'a device for pressing clothes', 'żelazko', 'The iron is hot.', 8),
    ('clothes rack', 'clothes rack', 'noun', 'a rack for drying clothes', 'suszarka na ubrania', 'The clothes rack is in the laundry room.', 9)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('washer', 'washer', 'noun', 'a machine for washing clothes', 'pralka', 'The washer is running.', 1),
    ('dryer', 'dryer', 'noun', 'a machine for drying clothes', 'suszarka', 'The dryer is loud.', 2),
    ('laundry basket', 'laundry basket', 'noun', 'a basket for dirty clothes', 'kosz na pranie', 'The laundry basket is full.', 3),
    ('detergents', 'detergents', 'noun', 'cleaning products for clothes', 'detergenty', 'The detergents are on the shelf.', 4),
    ('laundry powder', 'laundry powder', 'noun', 'powder used to wash clothes', 'proszek do prania', 'I use laundry powder for towels.', 5),
    ('fabric softener', 'fabric softener', 'noun', 'liquid that makes clothes soft', 'płyn do płukania', 'The fabric softener smells nice.', 6),
    ('ironing board', 'ironing board', 'noun', 'a board for ironing clothes', 'deska do prasowania', 'The ironing board is folded.', 7),
    ('iron', 'iron', 'noun', 'a device for pressing clothes', 'żelazko', 'The iron is hot.', 8),
    ('clothes rack', 'clothes rack', 'noun', 'a rack for drying clothes', 'suszarka na ubrania', 'The clothes rack is in the laundry room.', 9)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('washer', 'washer', 'noun', 'a machine for washing clothes', 'pralka', 'The washer is running.', 1),
    ('dryer', 'dryer', 'noun', 'a machine for drying clothes', 'suszarka', 'The dryer is loud.', 2),
    ('laundry basket', 'laundry basket', 'noun', 'a basket for dirty clothes', 'kosz na pranie', 'The laundry basket is full.', 3),
    ('detergents', 'detergents', 'noun', 'cleaning products for clothes', 'detergenty', 'The detergents are on the shelf.', 4),
    ('laundry powder', 'laundry powder', 'noun', 'powder used to wash clothes', 'proszek do prania', 'I use laundry powder for towels.', 5),
    ('fabric softener', 'fabric softener', 'noun', 'liquid that makes clothes soft', 'płyn do płukania', 'The fabric softener smells nice.', 6),
    ('ironing board', 'ironing board', 'noun', 'a board for ironing clothes', 'deska do prasowania', 'The ironing board is folded.', 7),
    ('iron', 'iron', 'noun', 'a device for pressing clothes', 'żelazko', 'The iron is hot.', 8),
    ('clothes rack', 'clothes rack', 'noun', 'a rack for drying clothes', 'suszarka na ubrania', 'The clothes rack is in the laundry room.', 9)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('washer', 'washer', 'noun', 'a machine for washing clothes', 'pralka', 'The washer is running.', 1),
    ('dryer', 'dryer', 'noun', 'a machine for drying clothes', 'suszarka', 'The dryer is loud.', 2),
    ('laundry basket', 'laundry basket', 'noun', 'a basket for dirty clothes', 'kosz na pranie', 'The laundry basket is full.', 3),
    ('detergents', 'detergents', 'noun', 'cleaning products for clothes', 'detergenty', 'The detergents are on the shelf.', 4),
    ('laundry powder', 'laundry powder', 'noun', 'powder used to wash clothes', 'proszek do prania', 'I use laundry powder for towels.', 5),
    ('fabric softener', 'fabric softener', 'noun', 'liquid that makes clothes soft', 'płyn do płukania', 'The fabric softener smells nice.', 6),
    ('ironing board', 'ironing board', 'noun', 'a board for ironing clothes', 'deska do prasowania', 'The ironing board is folded.', 7),
    ('iron', 'iron', 'noun', 'a device for pressing clothes', 'żelazko', 'The iron is hot.', 8),
    ('clothes rack', 'clothes rack', 'noun', 'a rack for drying clothes', 'suszarka na ubrania', 'The clothes rack is in the laundry room.', 9)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 11: Garderoba
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves are full of shoes.', 1),
    ('hangers', 'hangers', 'noun', 'hooks for hanging clothes', 'wieszaki', 'The hangers are in the closet.', 2),
    ('drawers', 'drawers', 'noun', 'sliding boxes in a cabinet', 'szuflady', 'The drawers hold socks.', 3),
    ('baskets', 'baskets', 'noun', 'containers for storing things', 'kosze', 'The baskets are under the shelf.', 4),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'The mirror is by the door.', 5)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves are full of shoes.', 1),
    ('hangers', 'hangers', 'noun', 'hooks for hanging clothes', 'wieszaki', 'The hangers are in the closet.', 2),
    ('drawers', 'drawers', 'noun', 'sliding boxes in a cabinet', 'szuflady', 'The drawers hold socks.', 3),
    ('baskets', 'baskets', 'noun', 'containers for storing things', 'kosze', 'The baskets are under the shelf.', 4),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'The mirror is by the door.', 5)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves are full of shoes.', 1),
    ('hangers', 'hangers', 'noun', 'hooks for hanging clothes', 'wieszaki', 'The hangers are in the closet.', 2),
    ('drawers', 'drawers', 'noun', 'sliding boxes in a cabinet', 'szuflady', 'The drawers hold socks.', 3),
    ('baskets', 'baskets', 'noun', 'containers for storing things', 'kosze', 'The baskets are under the shelf.', 4),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'The mirror is by the door.', 5)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves are full of shoes.', 1),
    ('hangers', 'hangers', 'noun', 'hooks for hanging clothes', 'wieszaki', 'The hangers are in the closet.', 2),
    ('drawers', 'drawers', 'noun', 'sliding boxes in a cabinet', 'szuflady', 'The drawers hold socks.', 3),
    ('baskets', 'baskets', 'noun', 'containers for storing things', 'kosze', 'The baskets are under the shelf.', 4),
    ('mirror', 'mirror', 'noun', 'a glass that shows your reflection', 'lustro', 'The mirror is by the door.', 5)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 12: Balkon / Taras
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('garden chairs', 'garden chairs', 'noun', 'chairs used outside', 'krzesła ogrodowe', 'The garden chairs are on the balcony.', 1),
    ('table', 'table', 'noun', 'a piece of furniture for eating or working', 'stół', 'The table is on the terrace.', 2),
    ('planters', 'planters', 'noun', 'containers for plants', 'donice', 'The planters are full of flowers.', 3),
    ('plants', 'plants', 'noun', 'living green things', 'rośliny', 'The plants need water.', 4),
    ('sun lounger', 'sun lounger', 'noun', 'a long chair for relaxing outside', 'leżak', 'I relax on the sun lounger.', 5),
    ('lighting', 'lighting', 'noun', 'lights in a place', 'oświetlenie', 'The lighting looks nice at night.', 6)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('garden chairs', 'garden chairs', 'noun', 'chairs used outside', 'krzesła ogrodowe', 'The garden chairs are on the balcony.', 1),
    ('table', 'table', 'noun', 'a piece of furniture for eating or working', 'stół', 'The table is on the terrace.', 2),
    ('planters', 'planters', 'noun', 'containers for plants', 'donice', 'The planters are full of flowers.', 3),
    ('plants', 'plants', 'noun', 'living green things', 'rośliny', 'The plants need water.', 4),
    ('sun lounger', 'sun lounger', 'noun', 'a long chair for relaxing outside', 'leżak', 'I relax on the sun lounger.', 5),
    ('lighting', 'lighting', 'noun', 'lights in a place', 'oświetlenie', 'The lighting looks nice at night.', 6)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('garden chairs', 'garden chairs', 'noun', 'chairs used outside', 'krzesła ogrodowe', 'The garden chairs are on the balcony.', 1),
    ('table', 'table', 'noun', 'a piece of furniture for eating or working', 'stół', 'The table is on the terrace.', 2),
    ('planters', 'planters', 'noun', 'containers for plants', 'donice', 'The planters are full of flowers.', 3),
    ('plants', 'plants', 'noun', 'living green things', 'rośliny', 'The plants need water.', 4),
    ('sun lounger', 'sun lounger', 'noun', 'a long chair for relaxing outside', 'leżak', 'I relax on the sun lounger.', 5),
    ('lighting', 'lighting', 'noun', 'lights in a place', 'oświetlenie', 'The lighting looks nice at night.', 6)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('garden chairs', 'garden chairs', 'noun', 'chairs used outside', 'krzesła ogrodowe', 'The garden chairs are on the balcony.', 1),
    ('table', 'table', 'noun', 'a piece of furniture for eating or working', 'stół', 'The table is on the terrace.', 2),
    ('planters', 'planters', 'noun', 'containers for plants', 'donice', 'The planters are full of flowers.', 3),
    ('plants', 'plants', 'noun', 'living green things', 'rośliny', 'The plants need water.', 4),
    ('sun lounger', 'sun lounger', 'noun', 'a long chair for relaxing outside', 'leżak', 'I relax on the sun lounger.', 5),
    ('lighting', 'lighting', 'noun', 'lights in a place', 'oświetlenie', 'The lighting looks nice at night.', 6)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack 13: Garaż / Piwnica
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves hold tools.', 1),
    ('tools', 'tools', 'noun', 'items used to fix or build things', 'narzędzia', 'The tools are in the garage.', 2),
    ('toolbox', 'toolbox', 'noun', 'a box for storing tools', 'skrzynka narzędziowa', 'The toolbox is heavy.', 3),
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels', 'rower', 'The bicycle is in the garage.', 4),
    ('tires', 'tires', 'noun', 'rubber wheels for a car', 'opony', 'The tires are stacked in the corner.', 5),
    ('cardboard boxes', 'cardboard boxes', 'noun', 'boxes made of cardboard', 'kartony', 'The cardboard boxes are in the basement.', 6),
    ('containers', 'containers', 'noun', 'boxes for storing items', 'pojemniki', 'The containers are labeled.', 7)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves hold tools.', 1),
    ('tools', 'tools', 'noun', 'items used to fix or build things', 'narzędzia', 'The tools are in the garage.', 2),
    ('toolbox', 'toolbox', 'noun', 'a box for storing tools', 'skrzynka narzędziowa', 'The toolbox is heavy.', 3),
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels', 'rower', 'The bicycle is in the garage.', 4),
    ('tires', 'tires', 'noun', 'rubber wheels for a car', 'opony', 'The tires are stacked in the corner.', 5),
    ('cardboard boxes', 'cardboard boxes', 'noun', 'boxes made of cardboard', 'kartony', 'The cardboard boxes are in the basement.', 6),
    ('containers', 'containers', 'noun', 'boxes for storing items', 'pojemniki', 'The containers are labeled.', 7)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'home', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves hold tools.', 1),
    ('tools', 'tools', 'noun', 'items used to fix or build things', 'narzędzia', 'The tools are in the garage.', 2),
    ('toolbox', 'toolbox', 'noun', 'a box for storing tools', 'skrzynka narzędziowa', 'The toolbox is heavy.', 3),
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels', 'rower', 'The bicycle is in the garage.', 4),
    ('tires', 'tires', 'noun', 'rubber wheels for a car', 'opony', 'The tires are stacked in the corner.', 5),
    ('cardboard boxes', 'cardboard boxes', 'noun', 'boxes made of cardboard', 'kartony', 'The cardboard boxes are in the basement.', 6),
    ('containers', 'containers', 'noun', 'boxes for storing items', 'pojemniki', 'The containers are labeled.', 7)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('shelves', 'shelves', 'noun', 'flat surfaces for storing things', 'półki', 'The shelves hold tools.', 1),
    ('tools', 'tools', 'noun', 'items used to fix or build things', 'narzędzia', 'The tools are in the garage.', 2),
    ('toolbox', 'toolbox', 'noun', 'a box for storing tools', 'skrzynka narzędziowa', 'The toolbox is heavy.', 3),
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels', 'rower', 'The bicycle is in the garage.', 4),
    ('tires', 'tires', 'noun', 'rubber wheels for a car', 'opony', 'The tires are stacked in the corner.', 5),
    ('cardboard boxes', 'cardboard boxes', 'noun', 'boxes made of cardboard', 'kartony', 'The cardboard boxes are in the basement.', 6),
    ('containers', 'containers', 'noun', 'boxes for storing items', 'pojemniki', 'The containers are labeled.', 7)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

commit;
