-- Batch import for transport packs lexicon data (nouns)
-- Idempotent inserts: lexicon_entries, lexicon_senses, lexicon_translations, lexicon_examples

begin;

-- ============================================
-- Pack A: TRANSPORT — Pojazdy
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('vehicle', 'vehicle', 'noun', 'a machine used for transport', 'pojazd', 'The vehicle is parked outside.', 1),
    ('means of transport', 'means of transport', 'noun', 'a way to travel from one place to another', 'środek transportu', 'A bicycle is a cheap means of transport.', 2),
    ('car', 'car', 'noun', 'a road vehicle with four wheels', 'samochód', 'The car is in the garage.', 3),
    ('motorcycle', 'motorcycle', 'noun', 'a two-wheeled motor vehicle', 'motocykl', 'The motorcycle is very fast.', 4),
    ('scooter', 'scooter', 'noun', 'a small motor vehicle with two wheels', 'skuter', 'He rides a scooter to work.', 5),
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels you pedal', 'rower', 'The bicycle is new.', 6),
    ('kick scooter', 'kick scooter', 'noun', 'a small scooter you push with your foot', 'hulajnoga', 'The kick scooter is in the hallway.', 7),
    ('bus', 'bus', 'noun', 'a large vehicle for many passengers', 'autobus', 'The bus is late today.', 8),
    ('tram', 'tram', 'noun', 'a city train that runs on tracks', 'tramwaj', 'The tram stops here.', 9),
    ('subway', 'subway', 'noun', 'an underground city train', 'metro', 'The subway is very busy.', 10),
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train leaves at noon.', 11),
    ('plane', 'plane', 'noun', 'a vehicle that flies', 'samolot', 'The plane is ready to board.', 12),
    ('helicopter', 'helicopter', 'noun', 'a flying vehicle with rotating blades', 'helikopter', 'The helicopter is loud.', 13),
    ('ship', 'ship', 'noun', 'a large boat that travels on water', 'statek', 'The ship is in the port.', 14),
    ('boat', 'boat', 'noun', 'a small vessel for water travel', 'łódź', 'The boat is on the lake.', 15),
    ('ferry', 'ferry', 'noun', 'a boat that carries people or cars', 'prom', 'The ferry crosses the river.', 16),
    ('truck', 'truck', 'noun', 'a large vehicle for carrying goods', 'ciężarówka', 'The truck delivers food.', 17),
    ('coach', 'coach', 'noun', 'a long-distance passenger bus', 'autokar', 'The coach goes to Kraków.', 18),
    ('taxi', 'taxi', 'noun', 'a car you pay to ride in', 'taksówka', 'We took a taxi home.', 19)
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
    ('vehicle', 'vehicle', 'noun', 'a machine used for transport', 'pojazd', 'The vehicle is parked outside.', 1),
    ('means of transport', 'means of transport', 'noun', 'a way to travel from one place to another', 'środek transportu', 'A bicycle is a cheap means of transport.', 2),
    ('car', 'car', 'noun', 'a road vehicle with four wheels', 'samochód', 'The car is in the garage.', 3),
    ('motorcycle', 'motorcycle', 'noun', 'a two-wheeled motor vehicle', 'motocykl', 'The motorcycle is very fast.', 4),
    ('scooter', 'scooter', 'noun', 'a small motor vehicle with two wheels', 'skuter', 'He rides a scooter to work.', 5),
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels you pedal', 'rower', 'The bicycle is new.', 6),
    ('kick scooter', 'kick scooter', 'noun', 'a small scooter you push with your foot', 'hulajnoga', 'The kick scooter is in the hallway.', 7),
    ('bus', 'bus', 'noun', 'a large vehicle for many passengers', 'autobus', 'The bus is late today.', 8),
    ('tram', 'tram', 'noun', 'a city train that runs on tracks', 'tramwaj', 'The tram stops here.', 9),
    ('subway', 'subway', 'noun', 'an underground city train', 'metro', 'The subway is very busy.', 10),
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train leaves at noon.', 11),
    ('plane', 'plane', 'noun', 'a vehicle that flies', 'samolot', 'The plane is ready to board.', 12),
    ('helicopter', 'helicopter', 'noun', 'a flying vehicle with rotating blades', 'helikopter', 'The helicopter is loud.', 13),
    ('ship', 'ship', 'noun', 'a large boat that travels on water', 'statek', 'The ship is in the port.', 14),
    ('boat', 'boat', 'noun', 'a small vessel for water travel', 'łódź', 'The boat is on the lake.', 15),
    ('ferry', 'ferry', 'noun', 'a boat that carries people or cars', 'prom', 'The ferry crosses the river.', 16),
    ('truck', 'truck', 'noun', 'a large vehicle for carrying goods', 'ciężarówka', 'The truck delivers food.', 17),
    ('coach', 'coach', 'noun', 'a long-distance passenger bus', 'autokar', 'The coach goes to Kraków.', 18),
    ('taxi', 'taxi', 'noun', 'a car you pay to ride in', 'taksówka', 'We took a taxi home.', 19)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('vehicle', 'vehicle', 'noun', 'a machine used for transport', 'pojazd', 'The vehicle is parked outside.', 1),
    ('means of transport', 'means of transport', 'noun', 'a way to travel from one place to another', 'środek transportu', 'A bicycle is a cheap means of transport.', 2),
    ('car', 'car', 'noun', 'a road vehicle with four wheels', 'samochód', 'The car is in the garage.', 3),
    ('motorcycle', 'motorcycle', 'noun', 'a two-wheeled motor vehicle', 'motocykl', 'The motorcycle is very fast.', 4),
    ('scooter', 'scooter', 'noun', 'a small motor vehicle with two wheels', 'skuter', 'He rides a scooter to work.', 5),
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels you pedal', 'rower', 'The bicycle is new.', 6),
    ('kick scooter', 'kick scooter', 'noun', 'a small scooter you push with your foot', 'hulajnoga', 'The kick scooter is in the hallway.', 7),
    ('bus', 'bus', 'noun', 'a large vehicle for many passengers', 'autobus', 'The bus is late today.', 8),
    ('tram', 'tram', 'noun', 'a city train that runs on tracks', 'tramwaj', 'The tram stops here.', 9),
    ('subway', 'subway', 'noun', 'an underground city train', 'metro', 'The subway is very busy.', 10),
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train leaves at noon.', 11),
    ('plane', 'plane', 'noun', 'a vehicle that flies', 'samolot', 'The plane is ready to board.', 12),
    ('helicopter', 'helicopter', 'noun', 'a flying vehicle with rotating blades', 'helikopter', 'The helicopter is loud.', 13),
    ('ship', 'ship', 'noun', 'a large boat that travels on water', 'statek', 'The ship is in the port.', 14),
    ('boat', 'boat', 'noun', 'a small vessel for water travel', 'łódź', 'The boat is on the lake.', 15),
    ('ferry', 'ferry', 'noun', 'a boat that carries people or cars', 'prom', 'The ferry crosses the river.', 16),
    ('truck', 'truck', 'noun', 'a large vehicle for carrying goods', 'ciężarówka', 'The truck delivers food.', 17),
    ('coach', 'coach', 'noun', 'a long-distance passenger bus', 'autokar', 'The coach goes to Kraków.', 18),
    ('taxi', 'taxi', 'noun', 'a car you pay to ride in', 'taksówka', 'We took a taxi home.', 19)
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
    ('vehicle', 'vehicle', 'noun', 'a machine used for transport', 'pojazd', 'The vehicle is parked outside.', 1),
    ('means of transport', 'means of transport', 'noun', 'a way to travel from one place to another', 'środek transportu', 'A bicycle is a cheap means of transport.', 2),
    ('car', 'car', 'noun', 'a road vehicle with four wheels', 'samochód', 'The car is in the garage.', 3),
    ('motorcycle', 'motorcycle', 'noun', 'a two-wheeled motor vehicle', 'motocykl', 'The motorcycle is very fast.', 4),
    ('scooter', 'scooter', 'noun', 'a small motor vehicle with two wheels', 'skuter', 'He rides a scooter to work.', 5),
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels you pedal', 'rower', 'The bicycle is new.', 6),
    ('kick scooter', 'kick scooter', 'noun', 'a small scooter you push with your foot', 'hulajnoga', 'The kick scooter is in the hallway.', 7),
    ('bus', 'bus', 'noun', 'a large vehicle for many passengers', 'autobus', 'The bus is late today.', 8),
    ('tram', 'tram', 'noun', 'a city train that runs on tracks', 'tramwaj', 'The tram stops here.', 9),
    ('subway', 'subway', 'noun', 'an underground city train', 'metro', 'The subway is very busy.', 10),
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train leaves at noon.', 11),
    ('plane', 'plane', 'noun', 'a vehicle that flies', 'samolot', 'The plane is ready to board.', 12),
    ('helicopter', 'helicopter', 'noun', 'a flying vehicle with rotating blades', 'helikopter', 'The helicopter is loud.', 13),
    ('ship', 'ship', 'noun', 'a large boat that travels on water', 'statek', 'The ship is in the port.', 14),
    ('boat', 'boat', 'noun', 'a small vessel for water travel', 'łódź', 'The boat is on the lake.', 15),
    ('ferry', 'ferry', 'noun', 'a boat that carries people or cars', 'prom', 'The ferry crosses the river.', 16),
    ('truck', 'truck', 'noun', 'a large vehicle for carrying goods', 'ciężarówka', 'The truck delivers food.', 17),
    ('coach', 'coach', 'noun', 'a long-distance passenger bus', 'autokar', 'The coach goes to Kraków.', 18),
    ('taxi', 'taxi', 'noun', 'a car you pay to ride in', 'taksówka', 'We took a taxi home.', 19)
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

-- Additional translation for "traffic police"
insert into lexicon_translations (sense_id, translation_pl)
select s.id, 'drogówka'
from lexicon_entries e
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where e.lemma_norm = 'traffic police'
  and not exists (
    select 1 from lexicon_translations lt
    where lt.sense_id = s.id and lt.translation_pl = 'drogówka'
  );

-- Additional translation for "traffic lights"
insert into lexicon_translations (sense_id, translation_pl)
select s.id, 'światła drogowe'
from lexicon_entries e
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where e.lemma_norm = 'traffic lights'
  and not exists (
    select 1 from lexicon_translations lt
    where lt.sense_id = s.id and lt.translation_pl = 'światła drogowe'
  );

-- ============================================
-- Pack B: TRANSPORT — Samochody
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('car', 'car', 'noun', 'a road vehicle with four wheels', 'samochód', 'The car is clean today.', 1),
    ('passenger car', 'passenger car', 'noun', 'a car for carrying people', 'auto osobowe', 'A passenger car is parked outside.', 2),
    ('convertible', 'convertible', 'noun', 'a car with a roof that can fold down', 'kabriolet', 'The convertible is red.', 3),
    ('trunk', 'trunk', 'noun', 'the space for luggage in a car', 'bagażnik', 'The trunk is full.', 4),
    ('hood', 'hood', 'noun', 'the cover over the engine of a car', 'maska', 'The hood is open.', 5),
    ('doors', 'doors', 'noun', 'parts that open to enter a car', 'drzwi', 'The doors are locked.', 6),
    ('mirror', 'mirror', 'noun', 'a mirror on a car for seeing behind', 'lusterko', 'The mirror is small.', 7),
    ('windshield', 'windshield', 'noun', 'the front glass of a car', 'szyba', 'The windshield is wet.', 8),
    ('seat belts', 'seat belts', 'noun', 'belts that keep you safe in a car', 'pasy bezpieczeństwa', 'Always wear seat belts.', 9),
    ('seat', 'seat', 'noun', 'a place to sit in a car', 'fotel', 'The seat is comfortable.', 10),
    ('dashboard', 'dashboard', 'noun', 'the panel with instruments in a car', 'deska rozdzielcza', 'The dashboard is clean.', 11),
    ('engine', 'engine', 'noun', 'the machine that makes a car move', 'silnik', 'The engine is running.', 12),
    ('gearbox', 'gearbox', 'noun', 'the system for changing gears', 'skrzynia biegów', 'The gearbox works well.', 13),
    ('clutch', 'clutch', 'noun', 'a part used to change gears', 'sprzęgło', 'The clutch is smooth.', 14),
    ('brakes', 'brakes', 'noun', 'parts that stop a car', 'hamulce', 'The brakes are strong.', 15),
    ('handbrake', 'handbrake', 'noun', 'a brake used when parking', 'hamulec ręczny', 'Use the handbrake on a hill.', 16),
    ('gas pedal', 'gas pedal', 'noun', 'the pedal you press to speed up', 'pedał gazu', 'Press the gas pedal gently.', 17),
    ('turn signals', 'turn signals', 'noun', 'lights that show a turn', 'kierunkowskazy', 'Use the turn signals.', 18),
    ('windshield wipers', 'windshield wipers', 'noun', 'blades that clean the windshield', 'wycieraczki', 'The windshield wipers are on.', 19),
    ('battery', 'battery', 'noun', 'a power source for a car', 'akumulator', 'The battery is new.', 20),
    ('radiator', 'radiator', 'noun', 'a part that cools the engine', 'chłodnica', 'The radiator is hot.', 21),
    ('muffler', 'muffler', 'noun', 'a part that reduces engine noise', 'tłumik', 'The muffler is damaged.', 22),
    ('drive system', 'drive system', 'noun', 'the system that moves the car', 'napęd', 'The drive system is strong.', 23),
    ('fuel', 'fuel', 'noun', 'the energy a car uses to run', 'paliwo', 'We need fuel.', 24),
    ('speed', 'speed', 'noun', 'how fast a car is moving', 'prędkość', 'The speed is high.', 25),
    ('steering wheel', 'steering wheel', 'noun', 'the wheel used to steer a car', 'kierownica', 'Hold the steering wheel.', 26),
    ('wheel', 'wheel', 'noun', 'a round part that rolls', 'koło', 'One wheel is flat.', 27),
    ('tire', 'tire', 'noun', 'rubber on a wheel', 'opona', 'The tire is new.', 28)
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
    ('car', 'car', 'noun', 'a road vehicle with four wheels', 'samochód', 'The car is clean today.', 1),
    ('passenger car', 'passenger car', 'noun', 'a car for carrying people', 'auto osobowe', 'A passenger car is parked outside.', 2),
    ('convertible', 'convertible', 'noun', 'a car with a roof that can fold down', 'kabriolet', 'The convertible is red.', 3),
    ('trunk', 'trunk', 'noun', 'the space for luggage in a car', 'bagażnik', 'The trunk is full.', 4),
    ('hood', 'hood', 'noun', 'the cover over the engine of a car', 'maska', 'The hood is open.', 5),
    ('doors', 'doors', 'noun', 'parts that open to enter a car', 'drzwi', 'The doors are locked.', 6),
    ('mirror', 'mirror', 'noun', 'a mirror on a car for seeing behind', 'lusterko', 'The mirror is small.', 7),
    ('windshield', 'windshield', 'noun', 'the front glass of a car', 'szyba', 'The windshield is wet.', 8),
    ('seat belts', 'seat belts', 'noun', 'belts that keep you safe in a car', 'pasy bezpieczeństwa', 'Always wear seat belts.', 9),
    ('seat', 'seat', 'noun', 'a place to sit in a car', 'fotel', 'The seat is comfortable.', 10),
    ('dashboard', 'dashboard', 'noun', 'the panel with instruments in a car', 'deska rozdzielcza', 'The dashboard is clean.', 11),
    ('engine', 'engine', 'noun', 'the machine that makes a car move', 'silnik', 'The engine is running.', 12),
    ('gearbox', 'gearbox', 'noun', 'the system for changing gears', 'skrzynia biegów', 'The gearbox works well.', 13),
    ('clutch', 'clutch', 'noun', 'a part used to change gears', 'sprzęgło', 'The clutch is smooth.', 14),
    ('brakes', 'brakes', 'noun', 'parts that stop a car', 'hamulce', 'The brakes are strong.', 15),
    ('handbrake', 'handbrake', 'noun', 'a brake used when parking', 'hamulec ręczny', 'Use the handbrake on a hill.', 16),
    ('gas pedal', 'gas pedal', 'noun', 'the pedal you press to speed up', 'pedał gazu', 'Press the gas pedal gently.', 17),
    ('turn signals', 'turn signals', 'noun', 'lights that show a turn', 'kierunkowskazy', 'Use the turn signals.', 18),
    ('windshield wipers', 'windshield wipers', 'noun', 'blades that clean the windshield', 'wycieraczki', 'The windshield wipers are on.', 19),
    ('battery', 'battery', 'noun', 'a power source for a car', 'akumulator', 'The battery is new.', 20),
    ('radiator', 'radiator', 'noun', 'a part that cools the engine', 'chłodnica', 'The radiator is hot.', 21),
    ('muffler', 'muffler', 'noun', 'a part that reduces engine noise', 'tłumik', 'The muffler is damaged.', 22),
    ('drive system', 'drive system', 'noun', 'the system that moves the car', 'napęd', 'The drive system is strong.', 23),
    ('fuel', 'fuel', 'noun', 'the energy a car uses to run', 'paliwo', 'We need fuel.', 24),
    ('speed', 'speed', 'noun', 'how fast a car is moving', 'prędkość', 'The speed is high.', 25),
    ('steering wheel', 'steering wheel', 'noun', 'the wheel used to steer a car', 'kierownica', 'Hold the steering wheel.', 26),
    ('wheel', 'wheel', 'noun', 'a round part that rolls', 'koło', 'One wheel is flat.', 27),
    ('tire', 'tire', 'noun', 'rubber on a wheel', 'opona', 'The tire is new.', 28)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('car', 'car', 'noun', 'a road vehicle with four wheels', 'samochód', 'The car is clean today.', 1),
    ('passenger car', 'passenger car', 'noun', 'a car for carrying people', 'auto osobowe', 'A passenger car is parked outside.', 2),
    ('convertible', 'convertible', 'noun', 'a car with a roof that can fold down', 'kabriolet', 'The convertible is red.', 3),
    ('trunk', 'trunk', 'noun', 'the space for luggage in a car', 'bagażnik', 'The trunk is full.', 4),
    ('hood', 'hood', 'noun', 'the cover over the engine of a car', 'maska', 'The hood is open.', 5),
    ('doors', 'doors', 'noun', 'parts that open to enter a car', 'drzwi', 'The doors are locked.', 6),
    ('mirror', 'mirror', 'noun', 'a mirror on a car for seeing behind', 'lusterko', 'The mirror is small.', 7),
    ('windshield', 'windshield', 'noun', 'the front glass of a car', 'szyba', 'The windshield is wet.', 8),
    ('seat belts', 'seat belts', 'noun', 'belts that keep you safe in a car', 'pasy bezpieczeństwa', 'Always wear seat belts.', 9),
    ('seat', 'seat', 'noun', 'a place to sit in a car', 'fotel', 'The seat is comfortable.', 10),
    ('dashboard', 'dashboard', 'noun', 'the panel with instruments in a car', 'deska rozdzielcza', 'The dashboard is clean.', 11),
    ('engine', 'engine', 'noun', 'the machine that makes a car move', 'silnik', 'The engine is running.', 12),
    ('gearbox', 'gearbox', 'noun', 'the system for changing gears', 'skrzynia biegów', 'The gearbox works well.', 13),
    ('clutch', 'clutch', 'noun', 'a part used to change gears', 'sprzęgło', 'The clutch is smooth.', 14),
    ('brakes', 'brakes', 'noun', 'parts that stop a car', 'hamulce', 'The brakes are strong.', 15),
    ('handbrake', 'handbrake', 'noun', 'a brake used when parking', 'hamulec ręczny', 'Use the handbrake on a hill.', 16),
    ('gas pedal', 'gas pedal', 'noun', 'the pedal you press to speed up', 'pedał gazu', 'Press the gas pedal gently.', 17),
    ('turn signals', 'turn signals', 'noun', 'lights that show a turn', 'kierunkowskazy', 'Use the turn signals.', 18),
    ('windshield wipers', 'windshield wipers', 'noun', 'blades that clean the windshield', 'wycieraczki', 'The windshield wipers are on.', 19),
    ('battery', 'battery', 'noun', 'a power source for a car', 'akumulator', 'The battery is new.', 20),
    ('radiator', 'radiator', 'noun', 'a part that cools the engine', 'chłodnica', 'The radiator is hot.', 21),
    ('muffler', 'muffler', 'noun', 'a part that reduces engine noise', 'tłumik', 'The muffler is damaged.', 22),
    ('drive system', 'drive system', 'noun', 'the system that moves the car', 'napęd', 'The drive system is strong.', 23),
    ('fuel', 'fuel', 'noun', 'the energy a car uses to run', 'paliwo', 'We need fuel.', 24),
    ('speed', 'speed', 'noun', 'how fast a car is moving', 'prędkość', 'The speed is high.', 25),
    ('steering wheel', 'steering wheel', 'noun', 'the wheel used to steer a car', 'kierownica', 'Hold the steering wheel.', 26),
    ('wheel', 'wheel', 'noun', 'a round part that rolls', 'koło', 'One wheel is flat.', 27),
    ('tire', 'tire', 'noun', 'rubber on a wheel', 'opona', 'The tire is new.', 28)
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
    ('car', 'car', 'noun', 'a road vehicle with four wheels', 'samochód', 'The car is clean today.', 1),
    ('passenger car', 'passenger car', 'noun', 'a car for carrying people', 'auto osobowe', 'A passenger car is parked outside.', 2),
    ('convertible', 'convertible', 'noun', 'a car with a roof that can fold down', 'kabriolet', 'The convertible is red.', 3),
    ('trunk', 'trunk', 'noun', 'the space for luggage in a car', 'bagażnik', 'The trunk is full.', 4),
    ('hood', 'hood', 'noun', 'the cover over the engine of a car', 'maska', 'The hood is open.', 5),
    ('doors', 'doors', 'noun', 'parts that open to enter a car', 'drzwi', 'The doors are locked.', 6),
    ('mirror', 'mirror', 'noun', 'a mirror on a car for seeing behind', 'lusterko', 'The mirror is small.', 7),
    ('windshield', 'windshield', 'noun', 'the front glass of a car', 'szyba', 'The windshield is wet.', 8),
    ('seat belts', 'seat belts', 'noun', 'belts that keep you safe in a car', 'pasy bezpieczeństwa', 'Always wear seat belts.', 9),
    ('seat', 'seat', 'noun', 'a place to sit in a car', 'fotel', 'The seat is comfortable.', 10),
    ('dashboard', 'dashboard', 'noun', 'the panel with instruments in a car', 'deska rozdzielcza', 'The dashboard is clean.', 11),
    ('engine', 'engine', 'noun', 'the machine that makes a car move', 'silnik', 'The engine is running.', 12),
    ('gearbox', 'gearbox', 'noun', 'the system for changing gears', 'skrzynia biegów', 'The gearbox works well.', 13),
    ('clutch', 'clutch', 'noun', 'a part used to change gears', 'sprzęgło', 'The clutch is smooth.', 14),
    ('brakes', 'brakes', 'noun', 'parts that stop a car', 'hamulce', 'The brakes are strong.', 15),
    ('handbrake', 'handbrake', 'noun', 'a brake used when parking', 'hamulec ręczny', 'Use the handbrake on a hill.', 16),
    ('gas pedal', 'gas pedal', 'noun', 'the pedal you press to speed up', 'pedał gazu', 'Press the gas pedal gently.', 17),
    ('turn signals', 'turn signals', 'noun', 'lights that show a turn', 'kierunkowskazy', 'Use the turn signals.', 18),
    ('windshield wipers', 'windshield wipers', 'noun', 'blades that clean the windshield', 'wycieraczki', 'The windshield wipers are on.', 19),
    ('battery', 'battery', 'noun', 'a power source for a car', 'akumulator', 'The battery is new.', 20),
    ('radiator', 'radiator', 'noun', 'a part that cools the engine', 'chłodnica', 'The radiator is hot.', 21),
    ('muffler', 'muffler', 'noun', 'a part that reduces engine noise', 'tłumik', 'The muffler is damaged.', 22),
    ('drive system', 'drive system', 'noun', 'the system that moves the car', 'napęd', 'The drive system is strong.', 23),
    ('fuel', 'fuel', 'noun', 'the energy a car uses to run', 'paliwo', 'We need fuel.', 24),
    ('speed', 'speed', 'noun', 'how fast a car is moving', 'prędkość', 'The speed is high.', 25),
    ('steering wheel', 'steering wheel', 'noun', 'the wheel used to steer a car', 'kierownica', 'Hold the steering wheel.', 26),
    ('wheel', 'wheel', 'noun', 'a round part that rolls', 'koło', 'One wheel is flat.', 27),
    ('tire', 'tire', 'noun', 'rubber on a wheel', 'opona', 'The tire is new.', 28)
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
-- Pack C: TRANSPORT — Motocykle i skutery
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('motorcycle', 'motorcycle', 'noun', 'a two-wheeled motor vehicle', 'motocykl', 'The motorcycle is fast.', 1),
    ('scooter', 'scooter', 'noun', 'a small motor vehicle with two wheels', 'skuter', 'The scooter is easy to ride.', 2),
    ('moped', 'moped', 'noun', 'a small motorbike with pedals', 'motorower', 'The moped is small.', 3),
    ('helmet', 'helmet', 'noun', 'a hard hat for safety', 'kask', 'Wear a helmet every time.', 4),
    ('throttle', 'throttle', 'noun', 'a handle for controlling speed', 'manetka', 'Turn the throttle slowly.', 5),
    ('mirrors', 'mirrors', 'noun', 'mirrors for seeing behind', 'lusterka', 'Adjust the mirrors.', 6),
    ('seat', 'seat', 'noun', 'a place to sit', 'siedzenie', 'The seat is low.', 7),
    ('fuel tank', 'fuel tank', 'noun', 'a container for fuel', 'zbiornik paliwa', 'The fuel tank is full.', 8),
    ('chain', 'chain', 'noun', 'a linked metal part for driving a bike', 'łańcuch', 'The chain is clean.', 9),
    ('kickstand', 'kickstand', 'noun', 'a stand that holds the bike up', 'stopka', 'The kickstand is down.', 10)
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
    ('motorcycle', 'motorcycle', 'noun', 'a two-wheeled motor vehicle', 'motocykl', 'The motorcycle is fast.', 1),
    ('scooter', 'scooter', 'noun', 'a small motor vehicle with two wheels', 'skuter', 'The scooter is easy to ride.', 2),
    ('moped', 'moped', 'noun', 'a small motorbike with pedals', 'motorower', 'The moped is small.', 3),
    ('helmet', 'helmet', 'noun', 'a hard hat for safety', 'kask', 'Wear a helmet every time.', 4),
    ('throttle', 'throttle', 'noun', 'a handle for controlling speed', 'manetka', 'Turn the throttle slowly.', 5),
    ('mirrors', 'mirrors', 'noun', 'mirrors for seeing behind', 'lusterka', 'Adjust the mirrors.', 6),
    ('seat', 'seat', 'noun', 'a place to sit', 'siedzenie', 'The seat is low.', 7),
    ('fuel tank', 'fuel tank', 'noun', 'a container for fuel', 'zbiornik paliwa', 'The fuel tank is full.', 8),
    ('chain', 'chain', 'noun', 'a linked metal part for driving a bike', 'łańcuch', 'The chain is clean.', 9),
    ('kickstand', 'kickstand', 'noun', 'a stand that holds the bike up', 'stopka', 'The kickstand is down.', 10)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('motorcycle', 'motorcycle', 'noun', 'a two-wheeled motor vehicle', 'motocykl', 'The motorcycle is fast.', 1),
    ('scooter', 'scooter', 'noun', 'a small motor vehicle with two wheels', 'skuter', 'The scooter is easy to ride.', 2),
    ('moped', 'moped', 'noun', 'a small motorbike with pedals', 'motorower', 'The moped is small.', 3),
    ('helmet', 'helmet', 'noun', 'a hard hat for safety', 'kask', 'Wear a helmet every time.', 4),
    ('throttle', 'throttle', 'noun', 'a handle for controlling speed', 'manetka', 'Turn the throttle slowly.', 5),
    ('mirrors', 'mirrors', 'noun', 'mirrors for seeing behind', 'lusterka', 'Adjust the mirrors.', 6),
    ('seat', 'seat', 'noun', 'a place to sit', 'siedzenie', 'The seat is low.', 7),
    ('fuel tank', 'fuel tank', 'noun', 'a container for fuel', 'zbiornik paliwa', 'The fuel tank is full.', 8),
    ('chain', 'chain', 'noun', 'a linked metal part for driving a bike', 'łańcuch', 'The chain is clean.', 9),
    ('kickstand', 'kickstand', 'noun', 'a stand that holds the bike up', 'stopka', 'The kickstand is down.', 10)
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
    ('motorcycle', 'motorcycle', 'noun', 'a two-wheeled motor vehicle', 'motocykl', 'The motorcycle is fast.', 1),
    ('scooter', 'scooter', 'noun', 'a small motor vehicle with two wheels', 'skuter', 'The scooter is easy to ride.', 2),
    ('moped', 'moped', 'noun', 'a small motorbike with pedals', 'motorower', 'The moped is small.', 3),
    ('helmet', 'helmet', 'noun', 'a hard hat for safety', 'kask', 'Wear a helmet every time.', 4),
    ('throttle', 'throttle', 'noun', 'a handle for controlling speed', 'manetka', 'Turn the throttle slowly.', 5),
    ('mirrors', 'mirrors', 'noun', 'mirrors for seeing behind', 'lusterka', 'Adjust the mirrors.', 6),
    ('seat', 'seat', 'noun', 'a place to sit', 'siedzenie', 'The seat is low.', 7),
    ('fuel tank', 'fuel tank', 'noun', 'a container for fuel', 'zbiornik paliwa', 'The fuel tank is full.', 8),
    ('chain', 'chain', 'noun', 'a linked metal part for driving a bike', 'łańcuch', 'The chain is clean.', 9),
    ('kickstand', 'kickstand', 'noun', 'a stand that holds the bike up', 'stopka', 'The kickstand is down.', 10)
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
-- Pack D: TRANSPORT — Rowery
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels you pedal', 'rower', 'The bicycle is in the yard.', 1),
    ('mountain bike', 'mountain bike', 'noun', 'a bicycle for rough terrain', 'rower górski', 'The mountain bike has thick tires.', 2),
    ('road bike', 'road bike', 'noun', 'a bicycle for fast roads', 'rower szosowy', 'A road bike is very light.', 3),
    ('city bike', 'city bike', 'noun', 'a bicycle for city riding', 'rower miejski', 'The city bike has a basket.', 4),
    ('electric bike', 'electric bike', 'noun', 'a bicycle with electric support', 'rower elektryczny', 'The electric bike helps on hills.', 5),
    ('frame', 'frame', 'noun', 'the main structure of a bicycle', 'rama', 'The frame is made of aluminum.', 6),
    ('handlebar', 'handlebar', 'noun', 'the bar you hold to steer', 'kierownica', 'Hold the handlebar firmly.', 7),
    ('saddle', 'saddle', 'noun', 'the seat of a bicycle', 'siodełko', 'The saddle is soft.', 8),
    ('pedals', 'pedals', 'noun', 'parts you push with your feet', 'pedały', 'The pedals are slippery.', 9),
    ('gears', 'gears', 'noun', 'parts that change speed', 'przerzutki', 'The gears are easy to change.', 10),
    ('brake', 'brake', 'noun', 'a part that stops a bike', 'hamulec', 'The brake works well.', 11),
    ('bell', 'bell', 'noun', 'a small bell on a bike', 'dzwonek', 'The bell is loud.', 12),
    ('basket', 'basket', 'noun', 'a container on a bike', 'koszyk', 'The basket is on the front.', 13),
    ('rack', 'rack', 'noun', 'a frame for carrying items', 'bagażnik', 'The rack holds a bag.', 14)
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
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels you pedal', 'rower', 'The bicycle is in the yard.', 1),
    ('mountain bike', 'mountain bike', 'noun', 'a bicycle for rough terrain', 'rower górski', 'The mountain bike has thick tires.', 2),
    ('road bike', 'road bike', 'noun', 'a bicycle for fast roads', 'rower szosowy', 'A road bike is very light.', 3),
    ('city bike', 'city bike', 'noun', 'a bicycle for city riding', 'rower miejski', 'The city bike has a basket.', 4),
    ('electric bike', 'electric bike', 'noun', 'a bicycle with electric support', 'rower elektryczny', 'The electric bike helps on hills.', 5),
    ('frame', 'frame', 'noun', 'the main structure of a bicycle', 'rama', 'The frame is made of aluminum.', 6),
    ('handlebar', 'handlebar', 'noun', 'the bar you hold to steer', 'kierownica', 'Hold the handlebar firmly.', 7),
    ('saddle', 'saddle', 'noun', 'the seat of a bicycle', 'siodełko', 'The saddle is soft.', 8),
    ('pedals', 'pedals', 'noun', 'parts you push with your feet', 'pedały', 'The pedals are slippery.', 9),
    ('gears', 'gears', 'noun', 'parts that change speed', 'przerzutki', 'The gears are easy to change.', 10),
    ('brake', 'brake', 'noun', 'a part that stops a bike', 'hamulec', 'The brake works well.', 11),
    ('bell', 'bell', 'noun', 'a small bell on a bike', 'dzwonek', 'The bell is loud.', 12),
    ('basket', 'basket', 'noun', 'a container on a bike', 'koszyk', 'The basket is on the front.', 13),
    ('rack', 'rack', 'noun', 'a frame for carrying items', 'bagażnik', 'The rack holds a bag.', 14)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels you pedal', 'rower', 'The bicycle is in the yard.', 1),
    ('mountain bike', 'mountain bike', 'noun', 'a bicycle for rough terrain', 'rower górski', 'The mountain bike has thick tires.', 2),
    ('road bike', 'road bike', 'noun', 'a bicycle for fast roads', 'rower szosowy', 'A road bike is very light.', 3),
    ('city bike', 'city bike', 'noun', 'a bicycle for city riding', 'rower miejski', 'The city bike has a basket.', 4),
    ('electric bike', 'electric bike', 'noun', 'a bicycle with electric support', 'rower elektryczny', 'The electric bike helps on hills.', 5),
    ('frame', 'frame', 'noun', 'the main structure of a bicycle', 'rama', 'The frame is made of aluminum.', 6),
    ('handlebar', 'handlebar', 'noun', 'the bar you hold to steer', 'kierownica', 'Hold the handlebar firmly.', 7),
    ('saddle', 'saddle', 'noun', 'the seat of a bicycle', 'siodełko', 'The saddle is soft.', 8),
    ('pedals', 'pedals', 'noun', 'parts you push with your feet', 'pedały', 'The pedals are slippery.', 9),
    ('gears', 'gears', 'noun', 'parts that change speed', 'przerzutki', 'The gears are easy to change.', 10),
    ('brake', 'brake', 'noun', 'a part that stops a bike', 'hamulec', 'The brake works well.', 11),
    ('bell', 'bell', 'noun', 'a small bell on a bike', 'dzwonek', 'The bell is loud.', 12),
    ('basket', 'basket', 'noun', 'a container on a bike', 'koszyk', 'The basket is on the front.', 13),
    ('rack', 'rack', 'noun', 'a frame for carrying items', 'bagażnik', 'The rack holds a bag.', 14)
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
    ('bicycle', 'bicycle', 'noun', 'a vehicle with two wheels you pedal', 'rower', 'The bicycle is in the yard.', 1),
    ('mountain bike', 'mountain bike', 'noun', 'a bicycle for rough terrain', 'rower górski', 'The mountain bike has thick tires.', 2),
    ('road bike', 'road bike', 'noun', 'a bicycle for fast roads', 'rower szosowy', 'A road bike is very light.', 3),
    ('city bike', 'city bike', 'noun', 'a bicycle for city riding', 'rower miejski', 'The city bike has a basket.', 4),
    ('electric bike', 'electric bike', 'noun', 'a bicycle with electric support', 'rower elektryczny', 'The electric bike helps on hills.', 5),
    ('frame', 'frame', 'noun', 'the main structure of a bicycle', 'rama', 'The frame is made of aluminum.', 6),
    ('handlebar', 'handlebar', 'noun', 'the bar you hold to steer', 'kierownica', 'Hold the handlebar firmly.', 7),
    ('saddle', 'saddle', 'noun', 'the seat of a bicycle', 'siodełko', 'The saddle is soft.', 8),
    ('pedals', 'pedals', 'noun', 'parts you push with your feet', 'pedały', 'The pedals are slippery.', 9),
    ('gears', 'gears', 'noun', 'parts that change speed', 'przerzutki', 'The gears are easy to change.', 10),
    ('brake', 'brake', 'noun', 'a part that stops a bike', 'hamulec', 'The brake works well.', 11),
    ('bell', 'bell', 'noun', 'a small bell on a bike', 'dzwonek', 'The bell is loud.', 12),
    ('basket', 'basket', 'noun', 'a container on a bike', 'koszyk', 'The basket is on the front.', 13),
    ('rack', 'rack', 'noun', 'a frame for carrying items', 'bagażnik', 'The rack holds a bag.', 14)
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
-- Pack E: TRANSPORT — Transport publiczny
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('public transit', 'public transit', 'noun', 'city transport for many people', 'komunikacja miejska', 'Public transit is cheap.', 1),
    ('bus', 'bus', 'noun', 'a large vehicle for many passengers', 'autobus', 'The bus is crowded.', 2),
    ('tram', 'tram', 'noun', 'a city train that runs on tracks', 'tramwaj', 'The tram is fast today.', 3),
    ('subway', 'subway', 'noun', 'an underground city train', 'metro', 'The subway is clean.', 4),
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train is late.', 5),
    ('railway', 'railway', 'noun', 'the system of trains and tracks', 'kolej', 'The railway connects cities.', 6),
    ('carriage', 'carriage', 'noun', 'a train car for passengers', 'wagon', 'The carriage is full.', 7),
    ('locomotive', 'locomotive', 'noun', 'the engine part of a train', 'lokomotywa', 'The locomotive is at the front.', 8),
    ('stop', 'stop', 'noun', 'a place where a vehicle stops', 'przystanek', 'The stop is nearby.', 9),
    ('station', 'station', 'noun', 'a place where trains or metro stop', 'stacja', 'We meet at the station.', 10),
    ('timetable', 'timetable', 'noun', 'a schedule of departures and arrivals', 'rozkład jazdy', 'Check the timetable.', 11),
    ('ticket', 'ticket', 'noun', 'a paper or digital pass for travel', 'bilet', 'I bought a ticket.', 12),
    ('ticket validator', 'ticket validator', 'noun', 'a machine that validates tickets', 'kasownik', 'Use the ticket validator.', 13)
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
    ('public transit', 'public transit', 'noun', 'city transport for many people', 'komunikacja miejska', 'Public transit is cheap.', 1),
    ('bus', 'bus', 'noun', 'a large vehicle for many passengers', 'autobus', 'The bus is crowded.', 2),
    ('tram', 'tram', 'noun', 'a city train that runs on tracks', 'tramwaj', 'The tram is fast today.', 3),
    ('subway', 'subway', 'noun', 'an underground city train', 'metro', 'The subway is clean.', 4),
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train is late.', 5),
    ('railway', 'railway', 'noun', 'the system of trains and tracks', 'kolej', 'The railway connects cities.', 6),
    ('carriage', 'carriage', 'noun', 'a train car for passengers', 'wagon', 'The carriage is full.', 7),
    ('locomotive', 'locomotive', 'noun', 'the engine part of a train', 'lokomotywa', 'The locomotive is at the front.', 8),
    ('stop', 'stop', 'noun', 'a place where a vehicle stops', 'przystanek', 'The stop is nearby.', 9),
    ('station', 'station', 'noun', 'a place where trains or metro stop', 'stacja', 'We meet at the station.', 10),
    ('timetable', 'timetable', 'noun', 'a schedule of departures and arrivals', 'rozkład jazdy', 'Check the timetable.', 11),
    ('ticket', 'ticket', 'noun', 'a paper or digital pass for travel', 'bilet', 'I bought a ticket.', 12),
    ('ticket validator', 'ticket validator', 'noun', 'a machine that validates tickets', 'kasownik', 'Use the ticket validator.', 13)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('public transit', 'public transit', 'noun', 'city transport for many people', 'komunikacja miejska', 'Public transit is cheap.', 1),
    ('bus', 'bus', 'noun', 'a large vehicle for many passengers', 'autobus', 'The bus is crowded.', 2),
    ('tram', 'tram', 'noun', 'a city train that runs on tracks', 'tramwaj', 'The tram is fast today.', 3),
    ('subway', 'subway', 'noun', 'an underground city train', 'metro', 'The subway is clean.', 4),
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train is late.', 5),
    ('railway', 'railway', 'noun', 'the system of trains and tracks', 'kolej', 'The railway connects cities.', 6),
    ('carriage', 'carriage', 'noun', 'a train car for passengers', 'wagon', 'The carriage is full.', 7),
    ('locomotive', 'locomotive', 'noun', 'the engine part of a train', 'lokomotywa', 'The locomotive is at the front.', 8),
    ('stop', 'stop', 'noun', 'a place where a vehicle stops', 'przystanek', 'The stop is nearby.', 9),
    ('station', 'station', 'noun', 'a place where trains or metro stop', 'stacja', 'We meet at the station.', 10),
    ('timetable', 'timetable', 'noun', 'a schedule of departures and arrivals', 'rozkład jazdy', 'Check the timetable.', 11),
    ('ticket', 'ticket', 'noun', 'a paper or digital pass for travel', 'bilet', 'I bought a ticket.', 12),
    ('ticket validator', 'ticket validator', 'noun', 'a machine that validates tickets', 'kasownik', 'Use the ticket validator.', 13)
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
    ('public transit', 'public transit', 'noun', 'city transport for many people', 'komunikacja miejska', 'Public transit is cheap.', 1),
    ('bus', 'bus', 'noun', 'a large vehicle for many passengers', 'autobus', 'The bus is crowded.', 2),
    ('tram', 'tram', 'noun', 'a city train that runs on tracks', 'tramwaj', 'The tram is fast today.', 3),
    ('subway', 'subway', 'noun', 'an underground city train', 'metro', 'The subway is clean.', 4),
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train is late.', 5),
    ('railway', 'railway', 'noun', 'the system of trains and tracks', 'kolej', 'The railway connects cities.', 6),
    ('carriage', 'carriage', 'noun', 'a train car for passengers', 'wagon', 'The carriage is full.', 7),
    ('locomotive', 'locomotive', 'noun', 'the engine part of a train', 'lokomotywa', 'The locomotive is at the front.', 8),
    ('stop', 'stop', 'noun', 'a place where a vehicle stops', 'przystanek', 'The stop is nearby.', 9),
    ('station', 'station', 'noun', 'a place where trains or metro stop', 'stacja', 'We meet at the station.', 10),
    ('timetable', 'timetable', 'noun', 'a schedule of departures and arrivals', 'rozkład jazdy', 'Check the timetable.', 11),
    ('ticket', 'ticket', 'noun', 'a paper or digital pass for travel', 'bilet', 'I bought a ticket.', 12),
    ('ticket validator', 'ticket validator', 'noun', 'a machine that validates tickets', 'kasownik', 'Use the ticket validator.', 13)
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
-- Pack F: TRANSPORT — Autobusy i autokary
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('city bus', 'city bus', 'noun', 'a bus that runs in a city', 'autobus miejski', 'The city bus is full.', 1),
    ('suburban bus', 'suburban bus', 'noun', 'a bus that goes to the suburbs', 'autobus podmiejski', 'The suburban bus goes to the village.', 2),
    ('coach', 'coach', 'noun', 'a long-distance passenger bus', 'autokar', 'The coach is comfortable.', 3),
    ('driver', 'driver', 'noun', 'a person who drives a vehicle', 'kierowca', 'The driver is friendly.', 4),
    ('passenger', 'passenger', 'noun', 'a person traveling in a vehicle', 'pasażer', 'The passenger has a ticket.', 5),
    ('seat', 'seat', 'noun', 'a place to sit', 'siedzenie', 'The seat is near the window.', 6),
    ('handrail', 'handrail', 'noun', 'a bar you hold for support', 'poręcz', 'Hold the handrail.', 7),
    ('doors', 'doors', 'noun', 'parts that open to enter', 'drzwi', 'The doors are open.', 8),
    ('ticket machine', 'ticket machine', 'noun', 'a machine for buying tickets', 'biletomat', 'The ticket machine is broken.', 9)
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
    ('city bus', 'city bus', 'noun', 'a bus that runs in a city', 'autobus miejski', 'The city bus is full.', 1),
    ('suburban bus', 'suburban bus', 'noun', 'a bus that goes to the suburbs', 'autobus podmiejski', 'The suburban bus goes to the village.', 2),
    ('coach', 'coach', 'noun', 'a long-distance passenger bus', 'autokar', 'The coach is comfortable.', 3),
    ('driver', 'driver', 'noun', 'a person who drives a vehicle', 'kierowca', 'The driver is friendly.', 4),
    ('passenger', 'passenger', 'noun', 'a person traveling in a vehicle', 'pasażer', 'The passenger has a ticket.', 5),
    ('seat', 'seat', 'noun', 'a place to sit', 'siedzenie', 'The seat is near the window.', 6),
    ('handrail', 'handrail', 'noun', 'a bar you hold for support', 'poręcz', 'Hold the handrail.', 7),
    ('doors', 'doors', 'noun', 'parts that open to enter', 'drzwi', 'The doors are open.', 8),
    ('ticket machine', 'ticket machine', 'noun', 'a machine for buying tickets', 'biletomat', 'The ticket machine is broken.', 9)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('city bus', 'city bus', 'noun', 'a bus that runs in a city', 'autobus miejski', 'The city bus is full.', 1),
    ('suburban bus', 'suburban bus', 'noun', 'a bus that goes to the suburbs', 'autobus podmiejski', 'The suburban bus goes to the village.', 2),
    ('coach', 'coach', 'noun', 'a long-distance passenger bus', 'autokar', 'The coach is comfortable.', 3),
    ('driver', 'driver', 'noun', 'a person who drives a vehicle', 'kierowca', 'The driver is friendly.', 4),
    ('passenger', 'passenger', 'noun', 'a person traveling in a vehicle', 'pasażer', 'The passenger has a ticket.', 5),
    ('seat', 'seat', 'noun', 'a place to sit', 'siedzenie', 'The seat is near the window.', 6),
    ('handrail', 'handrail', 'noun', 'a bar you hold for support', 'poręcz', 'Hold the handrail.', 7),
    ('doors', 'doors', 'noun', 'parts that open to enter', 'drzwi', 'The doors are open.', 8),
    ('ticket machine', 'ticket machine', 'noun', 'a machine for buying tickets', 'biletomat', 'The ticket machine is broken.', 9)
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
    ('city bus', 'city bus', 'noun', 'a bus that runs in a city', 'autobus miejski', 'The city bus is full.', 1),
    ('suburban bus', 'suburban bus', 'noun', 'a bus that goes to the suburbs', 'autobus podmiejski', 'The suburban bus goes to the village.', 2),
    ('coach', 'coach', 'noun', 'a long-distance passenger bus', 'autokar', 'The coach is comfortable.', 3),
    ('driver', 'driver', 'noun', 'a person who drives a vehicle', 'kierowca', 'The driver is friendly.', 4),
    ('passenger', 'passenger', 'noun', 'a person traveling in a vehicle', 'pasażer', 'The passenger has a ticket.', 5),
    ('seat', 'seat', 'noun', 'a place to sit', 'siedzenie', 'The seat is near the window.', 6),
    ('handrail', 'handrail', 'noun', 'a bar you hold for support', 'poręcz', 'Hold the handrail.', 7),
    ('doors', 'doors', 'noun', 'parts that open to enter', 'drzwi', 'The doors are open.', 8),
    ('ticket machine', 'ticket machine', 'noun', 'a machine for buying tickets', 'biletomat', 'The ticket machine is broken.', 9)
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
-- Pack G: TRANSPORT — Kolej
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train is on time.', 1),
    ('platform', 'platform', 'noun', 'the area where you wait for a train', 'peron', 'We wait on the platform.', 2),
    ('track', 'track', 'noun', 'the rails a train runs on', 'tor', 'The track is clear.', 3),
    ('compartment', 'compartment', 'noun', 'a small room in a train', 'przedział', 'We sit in a compartment.', 4),
    ('dining car', 'dining car', 'noun', 'a train car with food', 'wagon restauracyjny', 'The dining car is open.', 5),
    ('conductor', 'conductor', 'noun', 'a person who checks tickets on a train', 'konduktor', 'The conductor checks tickets.', 6),
    ('delay', 'delay', 'noun', 'a late departure or arrival', 'opóźnienie', 'There is a delay today.', 7),
    ('departure', 'departure', 'noun', 'the time a train leaves', 'odjazd', 'The departure is at 9.', 8),
    ('arrival', 'arrival', 'noun', 'the time a train comes in', 'przyjazd', 'The arrival is at 10.', 9)
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
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train is on time.', 1),
    ('platform', 'platform', 'noun', 'the area where you wait for a train', 'peron', 'We wait on the platform.', 2),
    ('track', 'track', 'noun', 'the rails a train runs on', 'tor', 'The track is clear.', 3),
    ('compartment', 'compartment', 'noun', 'a small room in a train', 'przedział', 'We sit in a compartment.', 4),
    ('dining car', 'dining car', 'noun', 'a train car with food', 'wagon restauracyjny', 'The dining car is open.', 5),
    ('conductor', 'conductor', 'noun', 'a person who checks tickets on a train', 'konduktor', 'The conductor checks tickets.', 6),
    ('delay', 'delay', 'noun', 'a late departure or arrival', 'opóźnienie', 'There is a delay today.', 7),
    ('departure', 'departure', 'noun', 'the time a train leaves', 'odjazd', 'The departure is at 9.', 8),
    ('arrival', 'arrival', 'noun', 'the time a train comes in', 'przyjazd', 'The arrival is at 10.', 9)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train is on time.', 1),
    ('platform', 'platform', 'noun', 'the area where you wait for a train', 'peron', 'We wait on the platform.', 2),
    ('track', 'track', 'noun', 'the rails a train runs on', 'tor', 'The track is clear.', 3),
    ('compartment', 'compartment', 'noun', 'a small room in a train', 'przedział', 'We sit in a compartment.', 4),
    ('dining car', 'dining car', 'noun', 'a train car with food', 'wagon restauracyjny', 'The dining car is open.', 5),
    ('conductor', 'conductor', 'noun', 'a person who checks tickets on a train', 'konduktor', 'The conductor checks tickets.', 6),
    ('delay', 'delay', 'noun', 'a late departure or arrival', 'opóźnienie', 'There is a delay today.', 7),
    ('departure', 'departure', 'noun', 'the time a train leaves', 'odjazd', 'The departure is at 9.', 8),
    ('arrival', 'arrival', 'noun', 'the time a train comes in', 'przyjazd', 'The arrival is at 10.', 9)
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
    ('train', 'train', 'noun', 'a series of connected cars on rails', 'pociąg', 'The train is on time.', 1),
    ('platform', 'platform', 'noun', 'the area where you wait for a train', 'peron', 'We wait on the platform.', 2),
    ('track', 'track', 'noun', 'the rails a train runs on', 'tor', 'The track is clear.', 3),
    ('compartment', 'compartment', 'noun', 'a small room in a train', 'przedział', 'We sit in a compartment.', 4),
    ('dining car', 'dining car', 'noun', 'a train car with food', 'wagon restauracyjny', 'The dining car is open.', 5),
    ('conductor', 'conductor', 'noun', 'a person who checks tickets on a train', 'konduktor', 'The conductor checks tickets.', 6),
    ('delay', 'delay', 'noun', 'a late departure or arrival', 'opóźnienie', 'There is a delay today.', 7),
    ('departure', 'departure', 'noun', 'the time a train leaves', 'odjazd', 'The departure is at 9.', 8),
    ('arrival', 'arrival', 'noun', 'the time a train comes in', 'przyjazd', 'The arrival is at 10.', 9)
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
-- Pack H: TRANSPORT — Transport lotniczy
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('plane', 'plane', 'noun', 'a vehicle that flies', 'samolot', 'The plane is boarding.', 1),
    ('flight', 'flight', 'noun', 'a trip by plane', 'lot', 'My flight is early.', 2),
    ('airport', 'airport', 'noun', 'a place where planes take off and land', 'lotnisko', 'The airport is busy.', 3),
    ('terminal', 'terminal', 'noun', 'a building at an airport', 'terminal', 'The terminal is large.', 4),
    ('gate', 'gate', 'noun', 'a place to board a plane', 'bramka', 'Go to gate 12.', 5),
    ('check-in', 'check-in', 'noun', 'the process of registering for a flight', 'odprawa', 'Check-in starts at 8.', 6),
    ('security check', 'security check', 'noun', 'control of passengers at the airport', 'kontrola bezpieczeństwa', 'The security check is strict.', 7),
    ('carry-on luggage', 'carry-on luggage', 'noun', 'small bag you take on board', 'bagaż podręczny', 'My carry-on luggage is light.', 8),
    ('checked luggage', 'checked luggage', 'noun', 'luggage you give at the desk', 'bagaż rejestrowany', 'My checked luggage is heavy.', 9),
    ('pilot', 'pilot', 'noun', 'a person who flies a plane', 'pilot', 'The pilot speaks to passengers.', 10),
    ('flight attendant', 'flight attendant', 'noun', 'a person who cares for passengers on a plane', 'stewardessa', 'The flight attendant is helpful.', 11),
    ('runway', 'runway', 'noun', 'a strip where planes take off and land', 'pas startowy', 'The runway is clear.', 12)
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
    ('plane', 'plane', 'noun', 'a vehicle that flies', 'samolot', 'The plane is boarding.', 1),
    ('flight', 'flight', 'noun', 'a trip by plane', 'lot', 'My flight is early.', 2),
    ('airport', 'airport', 'noun', 'a place where planes take off and land', 'lotnisko', 'The airport is busy.', 3),
    ('terminal', 'terminal', 'noun', 'a building at an airport', 'terminal', 'The terminal is large.', 4),
    ('gate', 'gate', 'noun', 'a place to board a plane', 'bramka', 'Go to gate 12.', 5),
    ('check-in', 'check-in', 'noun', 'the process of registering for a flight', 'odprawa', 'Check-in starts at 8.', 6),
    ('security check', 'security check', 'noun', 'control of passengers at the airport', 'kontrola bezpieczeństwa', 'The security check is strict.', 7),
    ('carry-on luggage', 'carry-on luggage', 'noun', 'small bag you take on board', 'bagaż podręczny', 'My carry-on luggage is light.', 8),
    ('checked luggage', 'checked luggage', 'noun', 'luggage you give at the desk', 'bagaż rejestrowany', 'My checked luggage is heavy.', 9),
    ('pilot', 'pilot', 'noun', 'a person who flies a plane', 'pilot', 'The pilot speaks to passengers.', 10),
    ('flight attendant', 'flight attendant', 'noun', 'a person who cares for passengers on a plane', 'stewardessa', 'The flight attendant is helpful.', 11),
    ('runway', 'runway', 'noun', 'a strip where planes take off and land', 'pas startowy', 'The runway is clear.', 12)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('plane', 'plane', 'noun', 'a vehicle that flies', 'samolot', 'The plane is boarding.', 1),
    ('flight', 'flight', 'noun', 'a trip by plane', 'lot', 'My flight is early.', 2),
    ('airport', 'airport', 'noun', 'a place where planes take off and land', 'lotnisko', 'The airport is busy.', 3),
    ('terminal', 'terminal', 'noun', 'a building at an airport', 'terminal', 'The terminal is large.', 4),
    ('gate', 'gate', 'noun', 'a place to board a plane', 'bramka', 'Go to gate 12.', 5),
    ('check-in', 'check-in', 'noun', 'the process of registering for a flight', 'odprawa', 'Check-in starts at 8.', 6),
    ('security check', 'security check', 'noun', 'control of passengers at the airport', 'kontrola bezpieczeństwa', 'The security check is strict.', 7),
    ('carry-on luggage', 'carry-on luggage', 'noun', 'small bag you take on board', 'bagaż podręczny', 'My carry-on luggage is light.', 8),
    ('checked luggage', 'checked luggage', 'noun', 'luggage you give at the desk', 'bagaż rejestrowany', 'My checked luggage is heavy.', 9),
    ('pilot', 'pilot', 'noun', 'a person who flies a plane', 'pilot', 'The pilot speaks to passengers.', 10),
    ('flight attendant', 'flight attendant', 'noun', 'a person who cares for passengers on a plane', 'stewardessa', 'The flight attendant is helpful.', 11),
    ('runway', 'runway', 'noun', 'a strip where planes take off and land', 'pas startowy', 'The runway is clear.', 12)
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
    ('plane', 'plane', 'noun', 'a vehicle that flies', 'samolot', 'The plane is boarding.', 1),
    ('flight', 'flight', 'noun', 'a trip by plane', 'lot', 'My flight is early.', 2),
    ('airport', 'airport', 'noun', 'a place where planes take off and land', 'lotnisko', 'The airport is busy.', 3),
    ('terminal', 'terminal', 'noun', 'a building at an airport', 'terminal', 'The terminal is large.', 4),
    ('gate', 'gate', 'noun', 'a place to board a plane', 'bramka', 'Go to gate 12.', 5),
    ('check-in', 'check-in', 'noun', 'the process of registering for a flight', 'odprawa', 'Check-in starts at 8.', 6),
    ('security check', 'security check', 'noun', 'control of passengers at the airport', 'kontrola bezpieczeństwa', 'The security check is strict.', 7),
    ('carry-on luggage', 'carry-on luggage', 'noun', 'small bag you take on board', 'bagaż podręczny', 'My carry-on luggage is light.', 8),
    ('checked luggage', 'checked luggage', 'noun', 'luggage you give at the desk', 'bagaż rejestrowany', 'My checked luggage is heavy.', 9),
    ('pilot', 'pilot', 'noun', 'a person who flies a plane', 'pilot', 'The pilot speaks to passengers.', 10),
    ('flight attendant', 'flight attendant', 'noun', 'a person who cares for passengers on a plane', 'stewardessa', 'The flight attendant is helpful.', 11),
    ('runway', 'runway', 'noun', 'a strip where planes take off and land', 'pas startowy', 'The runway is clear.', 12)
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
-- Pack I: TRANSPORT — Transport wodny
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('ship', 'ship', 'noun', 'a large boat that travels on water', 'statek', 'The ship is in the port.', 1),
    ('boat', 'boat', 'noun', 'a small vessel for water travel', 'łódź', 'The boat is on the lake.', 2),
    ('ferry', 'ferry', 'noun', 'a boat that carries people or cars', 'prom', 'The ferry is full.', 3),
    ('yacht', 'yacht', 'noun', 'a large boat for pleasure', 'jacht', 'The yacht is expensive.', 4),
    ('kayak', 'kayak', 'noun', 'a small narrow boat', 'kajak', 'The kayak is light.', 5),
    ('port', 'port', 'noun', 'a place where ships dock', 'port', 'The port is busy.', 6),
    ('marina', 'marina', 'noun', 'a place for small boats', 'przystań', 'The marina is quiet.', 7),
    ('captain', 'captain', 'noun', 'the leader of a ship', 'kapitan', 'The captain gives orders.', 8),
    ('crew', 'crew', 'noun', 'people who work on a ship', 'załoga', 'The crew is ready.', 9),
    ('life jacket', 'life jacket', 'noun', 'a jacket that keeps you afloat', 'kamizelka ratunkowa', 'Wear a life jacket.', 10)
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
    ('ship', 'ship', 'noun', 'a large boat that travels on water', 'statek', 'The ship is in the port.', 1),
    ('boat', 'boat', 'noun', 'a small vessel for water travel', 'łódź', 'The boat is on the lake.', 2),
    ('ferry', 'ferry', 'noun', 'a boat that carries people or cars', 'prom', 'The ferry is full.', 3),
    ('yacht', 'yacht', 'noun', 'a large boat for pleasure', 'jacht', 'The yacht is expensive.', 4),
    ('kayak', 'kayak', 'noun', 'a small narrow boat', 'kajak', 'The kayak is light.', 5),
    ('port', 'port', 'noun', 'a place where ships dock', 'port', 'The port is busy.', 6),
    ('marina', 'marina', 'noun', 'a place for small boats', 'przystań', 'The marina is quiet.', 7),
    ('captain', 'captain', 'noun', 'the leader of a ship', 'kapitan', 'The captain gives orders.', 8),
    ('crew', 'crew', 'noun', 'people who work on a ship', 'załoga', 'The crew is ready.', 9),
    ('life jacket', 'life jacket', 'noun', 'a jacket that keeps you afloat', 'kamizelka ratunkowa', 'Wear a life jacket.', 10)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('ship', 'ship', 'noun', 'a large boat that travels on water', 'statek', 'The ship is in the port.', 1),
    ('boat', 'boat', 'noun', 'a small vessel for water travel', 'łódź', 'The boat is on the lake.', 2),
    ('ferry', 'ferry', 'noun', 'a boat that carries people or cars', 'prom', 'The ferry is full.', 3),
    ('yacht', 'yacht', 'noun', 'a large boat for pleasure', 'jacht', 'The yacht is expensive.', 4),
    ('kayak', 'kayak', 'noun', 'a small narrow boat', 'kajak', 'The kayak is light.', 5),
    ('port', 'port', 'noun', 'a place where ships dock', 'port', 'The port is busy.', 6),
    ('marina', 'marina', 'noun', 'a place for small boats', 'przystań', 'The marina is quiet.', 7),
    ('captain', 'captain', 'noun', 'the leader of a ship', 'kapitan', 'The captain gives orders.', 8),
    ('crew', 'crew', 'noun', 'people who work on a ship', 'załoga', 'The crew is ready.', 9),
    ('life jacket', 'life jacket', 'noun', 'a jacket that keeps you afloat', 'kamizelka ratunkowa', 'Wear a life jacket.', 10)
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
    ('ship', 'ship', 'noun', 'a large boat that travels on water', 'statek', 'The ship is in the port.', 1),
    ('boat', 'boat', 'noun', 'a small vessel for water travel', 'łódź', 'The boat is on the lake.', 2),
    ('ferry', 'ferry', 'noun', 'a boat that carries people or cars', 'prom', 'The ferry is full.', 3),
    ('yacht', 'yacht', 'noun', 'a large boat for pleasure', 'jacht', 'The yacht is expensive.', 4),
    ('kayak', 'kayak', 'noun', 'a small narrow boat', 'kajak', 'The kayak is light.', 5),
    ('port', 'port', 'noun', 'a place where ships dock', 'port', 'The port is busy.', 6),
    ('marina', 'marina', 'noun', 'a place for small boats', 'przystań', 'The marina is quiet.', 7),
    ('captain', 'captain', 'noun', 'the leader of a ship', 'kapitan', 'The captain gives orders.', 8),
    ('crew', 'crew', 'noun', 'people who work on a ship', 'załoga', 'The crew is ready.', 9),
    ('life jacket', 'life jacket', 'noun', 'a jacket that keeps you afloat', 'kamizelka ratunkowa', 'Wear a life jacket.', 10)
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
-- Pack J: TRANSPORT — Transport towarowy
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('truck', 'truck', 'noun', 'a large vehicle for carrying goods', 'ciężarówka', 'The truck carries boxes.', 1),
    ('lorry', 'lorry', 'noun', 'a large goods vehicle', 'tir', 'The lorry is on the highway.', 2),
    ('trailer', 'trailer', 'noun', 'a towed vehicle for cargo', 'naczepa', 'The trailer is heavy.', 3),
    ('delivery van', 'delivery van', 'noun', 'a small vehicle for deliveries', 'dostawczak', 'The delivery van is fast.', 4),
    ('cargo', 'cargo', 'noun', 'goods carried by a vehicle', 'ładunek', 'The cargo is ready.', 5),
    ('pallet', 'pallet', 'noun', 'a flat base for goods', 'paleta', 'The pallet is wooden.', 6),
    ('container', 'container', 'noun', 'a large box for transport', 'kontener', 'The container is sealed.', 7),
    ('warehouse', 'warehouse', 'noun', 'a place for storing goods', 'magazyn', 'The warehouse is large.', 8),
    ('loading', 'loading', 'noun', 'putting goods onto a vehicle', 'załadunek', 'Loading takes time.', 9),
    ('unloading', 'unloading', 'noun', 'taking goods off a vehicle', 'rozładunek', 'Unloading is quick.', 10)
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
    ('truck', 'truck', 'noun', 'a large vehicle for carrying goods', 'ciężarówka', 'The truck carries boxes.', 1),
    ('lorry', 'lorry', 'noun', 'a large goods vehicle', 'tir', 'The lorry is on the highway.', 2),
    ('trailer', 'trailer', 'noun', 'a towed vehicle for cargo', 'naczepa', 'The trailer is heavy.', 3),
    ('delivery van', 'delivery van', 'noun', 'a small vehicle for deliveries', 'dostawczak', 'The delivery van is fast.', 4),
    ('cargo', 'cargo', 'noun', 'goods carried by a vehicle', 'ładunek', 'The cargo is ready.', 5),
    ('pallet', 'pallet', 'noun', 'a flat base for goods', 'paleta', 'The pallet is wooden.', 6),
    ('container', 'container', 'noun', 'a large box for transport', 'kontener', 'The container is sealed.', 7),
    ('warehouse', 'warehouse', 'noun', 'a place for storing goods', 'magazyn', 'The warehouse is large.', 8),
    ('loading', 'loading', 'noun', 'putting goods onto a vehicle', 'załadunek', 'Loading takes time.', 9),
    ('unloading', 'unloading', 'noun', 'taking goods off a vehicle', 'rozładunek', 'Unloading is quick.', 10)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('truck', 'truck', 'noun', 'a large vehicle for carrying goods', 'ciężarówka', 'The truck carries boxes.', 1),
    ('lorry', 'lorry', 'noun', 'a large goods vehicle', 'tir', 'The lorry is on the highway.', 2),
    ('trailer', 'trailer', 'noun', 'a towed vehicle for cargo', 'naczepa', 'The trailer is heavy.', 3),
    ('delivery van', 'delivery van', 'noun', 'a small vehicle for deliveries', 'dostawczak', 'The delivery van is fast.', 4),
    ('cargo', 'cargo', 'noun', 'goods carried by a vehicle', 'ładunek', 'The cargo is ready.', 5),
    ('pallet', 'pallet', 'noun', 'a flat base for goods', 'paleta', 'The pallet is wooden.', 6),
    ('container', 'container', 'noun', 'a large box for transport', 'kontener', 'The container is sealed.', 7),
    ('warehouse', 'warehouse', 'noun', 'a place for storing goods', 'magazyn', 'The warehouse is large.', 8),
    ('loading', 'loading', 'noun', 'putting goods onto a vehicle', 'załadunek', 'Loading takes time.', 9),
    ('unloading', 'unloading', 'noun', 'taking goods off a vehicle', 'rozładunek', 'Unloading is quick.', 10)
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
    ('truck', 'truck', 'noun', 'a large vehicle for carrying goods', 'ciężarówka', 'The truck carries boxes.', 1),
    ('lorry', 'lorry', 'noun', 'a large goods vehicle', 'tir', 'The lorry is on the highway.', 2),
    ('trailer', 'trailer', 'noun', 'a towed vehicle for cargo', 'naczepa', 'The trailer is heavy.', 3),
    ('delivery van', 'delivery van', 'noun', 'a small vehicle for deliveries', 'dostawczak', 'The delivery van is fast.', 4),
    ('cargo', 'cargo', 'noun', 'goods carried by a vehicle', 'ładunek', 'The cargo is ready.', 5),
    ('pallet', 'pallet', 'noun', 'a flat base for goods', 'paleta', 'The pallet is wooden.', 6),
    ('container', 'container', 'noun', 'a large box for transport', 'kontener', 'The container is sealed.', 7),
    ('warehouse', 'warehouse', 'noun', 'a place for storing goods', 'magazyn', 'The warehouse is large.', 8),
    ('loading', 'loading', 'noun', 'putting goods onto a vehicle', 'załadunek', 'Loading takes time.', 9),
    ('unloading', 'unloading', 'noun', 'taking goods off a vehicle', 'rozładunek', 'Unloading is quick.', 10)
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
-- Pack K: TRANSPORT — Droga i infrastruktura
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('road', 'road', 'noun', 'a way for vehicles to travel', 'droga', 'The road is wet.', 1),
    ('highway', 'highway', 'noun', 'a fast road for cars', 'autostrada', 'The highway is busy.', 2),
    ('street', 'street', 'noun', 'a road in a town or city', 'ulica', 'The street is quiet.', 3),
    ('intersection', 'intersection', 'noun', 'a place where roads cross', 'skrzyżowanie', 'The intersection is near the school.', 4),
    ('roundabout', 'roundabout', 'noun', 'a circular junction', 'rondo', 'Take the second exit at the roundabout.', 5),
    ('lane', 'lane', 'noun', 'one line of traffic on a road', 'pas ruchu', 'Stay in your lane.', 6),
    ('sidewalk', 'sidewalk', 'noun', 'a path for people beside a road', 'chodnik', 'Walk on the sidewalk.', 7),
    ('bike path', 'bike path', 'noun', 'a path for bicycles', 'ścieżka rowerowa', 'The bike path is safe.', 8),
    ('bridge', 'bridge', 'noun', 'a structure over water or a road', 'most', 'The bridge is long.', 9),
    ('tunnel', 'tunnel', 'noun', 'a passage under ground or a hill', 'tunel', 'The tunnel is dark.', 10),
    ('parking lot', 'parking lot', 'noun', 'a place to park cars', 'parking', 'The parking lot is full.', 11)
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
    ('road', 'road', 'noun', 'a way for vehicles to travel', 'droga', 'The road is wet.', 1),
    ('highway', 'highway', 'noun', 'a fast road for cars', 'autostrada', 'The highway is busy.', 2),
    ('street', 'street', 'noun', 'a road in a town or city', 'ulica', 'The street is quiet.', 3),
    ('intersection', 'intersection', 'noun', 'a place where roads cross', 'skrzyżowanie', 'The intersection is near the school.', 4),
    ('roundabout', 'roundabout', 'noun', 'a circular junction', 'rondo', 'Take the second exit at the roundabout.', 5),
    ('lane', 'lane', 'noun', 'one line of traffic on a road', 'pas ruchu', 'Stay in your lane.', 6),
    ('sidewalk', 'sidewalk', 'noun', 'a path for people beside a road', 'chodnik', 'Walk on the sidewalk.', 7),
    ('bike path', 'bike path', 'noun', 'a path for bicycles', 'ścieżka rowerowa', 'The bike path is safe.', 8),
    ('bridge', 'bridge', 'noun', 'a structure over water or a road', 'most', 'The bridge is long.', 9),
    ('tunnel', 'tunnel', 'noun', 'a passage under ground or a hill', 'tunel', 'The tunnel is dark.', 10),
    ('parking lot', 'parking lot', 'noun', 'a place to park cars', 'parking', 'The parking lot is full.', 11)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('road', 'road', 'noun', 'a way for vehicles to travel', 'droga', 'The road is wet.', 1),
    ('highway', 'highway', 'noun', 'a fast road for cars', 'autostrada', 'The highway is busy.', 2),
    ('street', 'street', 'noun', 'a road in a town or city', 'ulica', 'The street is quiet.', 3),
    ('intersection', 'intersection', 'noun', 'a place where roads cross', 'skrzyżowanie', 'The intersection is near the school.', 4),
    ('roundabout', 'roundabout', 'noun', 'a circular junction', 'rondo', 'Take the second exit at the roundabout.', 5),
    ('lane', 'lane', 'noun', 'one line of traffic on a road', 'pas ruchu', 'Stay in your lane.', 6),
    ('sidewalk', 'sidewalk', 'noun', 'a path for people beside a road', 'chodnik', 'Walk on the sidewalk.', 7),
    ('bike path', 'bike path', 'noun', 'a path for bicycles', 'ścieżka rowerowa', 'The bike path is safe.', 8),
    ('bridge', 'bridge', 'noun', 'a structure over water or a road', 'most', 'The bridge is long.', 9),
    ('tunnel', 'tunnel', 'noun', 'a passage under ground or a hill', 'tunel', 'The tunnel is dark.', 10),
    ('parking lot', 'parking lot', 'noun', 'a place to park cars', 'parking', 'The parking lot is full.', 11)
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
    ('road', 'road', 'noun', 'a way for vehicles to travel', 'droga', 'The road is wet.', 1),
    ('highway', 'highway', 'noun', 'a fast road for cars', 'autostrada', 'The highway is busy.', 2),
    ('street', 'street', 'noun', 'a road in a town or city', 'ulica', 'The street is quiet.', 3),
    ('intersection', 'intersection', 'noun', 'a place where roads cross', 'skrzyżowanie', 'The intersection is near the school.', 4),
    ('roundabout', 'roundabout', 'noun', 'a circular junction', 'rondo', 'Take the second exit at the roundabout.', 5),
    ('lane', 'lane', 'noun', 'one line of traffic on a road', 'pas ruchu', 'Stay in your lane.', 6),
    ('sidewalk', 'sidewalk', 'noun', 'a path for people beside a road', 'chodnik', 'Walk on the sidewalk.', 7),
    ('bike path', 'bike path', 'noun', 'a path for bicycles', 'ścieżka rowerowa', 'The bike path is safe.', 8),
    ('bridge', 'bridge', 'noun', 'a structure over water or a road', 'most', 'The bridge is long.', 9),
    ('tunnel', 'tunnel', 'noun', 'a passage under ground or a hill', 'tunel', 'The tunnel is dark.', 10),
    ('parking lot', 'parking lot', 'noun', 'a place to park cars', 'parking', 'The parking lot is full.', 11)
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
-- Pack L: TRANSPORT — Ruch drogowy i przepisy
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('road traffic', 'road traffic', 'noun', 'movement of vehicles on roads', 'ruch drogowy', 'Road traffic is heavy today.', 1),
    ('road sign', 'road sign', 'noun', 'a sign that gives traffic information', 'znak drogowy', 'The road sign is clear.', 2),
    ('traffic lights', 'traffic lights', 'noun', 'lights that control traffic', 'sygnalizacja świetlna', 'The traffic lights are red.', 3),
    ('red light', 'red light', 'noun', 'a stop signal at traffic lights', 'czerwone światło', 'Stop at the red light.', 4),
    ('green light', 'green light', 'noun', 'a go signal at traffic lights', 'zielone światło', 'Go on the green light.', 5),
    ('speed limit', 'speed limit', 'noun', 'the maximum allowed speed', 'ograniczenie prędkości', 'The speed limit is 50.', 6),
    ('right of way', 'right of way', 'noun', 'the right to go first in traffic', 'pierwszeństwo', 'Give right of way.', 7),
    ('traffic ticket', 'traffic ticket', 'noun', 'a penalty notice for breaking traffic rules', 'mandat', 'He got a traffic ticket.', 8),
    ('traffic police', 'traffic police', 'noun', 'police who control road traffic', 'policja drogowa', 'Traffic police are here.', 9)
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
    ('road traffic', 'road traffic', 'noun', 'movement of vehicles on roads', 'ruch drogowy', 'Road traffic is heavy today.', 1),
    ('road sign', 'road sign', 'noun', 'a sign that gives traffic information', 'znak drogowy', 'The road sign is clear.', 2),
    ('traffic lights', 'traffic lights', 'noun', 'lights that control traffic', 'sygnalizacja świetlna', 'The traffic lights are red.', 3),
    ('red light', 'red light', 'noun', 'a stop signal at traffic lights', 'czerwone światło', 'Stop at the red light.', 4),
    ('green light', 'green light', 'noun', 'a go signal at traffic lights', 'zielone światło', 'Go on the green light.', 5),
    ('speed limit', 'speed limit', 'noun', 'the maximum allowed speed', 'ograniczenie prędkości', 'The speed limit is 50.', 6),
    ('right of way', 'right of way', 'noun', 'the right to go first in traffic', 'pierwszeństwo', 'Give right of way.', 7),
    ('traffic ticket', 'traffic ticket', 'noun', 'a penalty notice for breaking traffic rules', 'mandat', 'He got a traffic ticket.', 8),
    ('traffic police', 'traffic police', 'noun', 'police who control road traffic', 'policja drogowa', 'Traffic police are here.', 9)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('road traffic', 'road traffic', 'noun', 'movement of vehicles on roads', 'ruch drogowy', 'Road traffic is heavy today.', 1),
    ('road sign', 'road sign', 'noun', 'a sign that gives traffic information', 'znak drogowy', 'The road sign is clear.', 2),
    ('traffic lights', 'traffic lights', 'noun', 'lights that control traffic', 'sygnalizacja świetlna', 'The traffic lights are red.', 3),
    ('red light', 'red light', 'noun', 'a stop signal at traffic lights', 'czerwone światło', 'Stop at the red light.', 4),
    ('green light', 'green light', 'noun', 'a go signal at traffic lights', 'zielone światło', 'Go on the green light.', 5),
    ('speed limit', 'speed limit', 'noun', 'the maximum allowed speed', 'ograniczenie prędkości', 'The speed limit is 50.', 6),
    ('right of way', 'right of way', 'noun', 'the right to go first in traffic', 'pierwszeństwo', 'Give right of way.', 7),
    ('traffic ticket', 'traffic ticket', 'noun', 'a penalty notice for breaking traffic rules', 'mandat', 'He got a traffic ticket.', 8),
    ('traffic police', 'traffic police', 'noun', 'police who control road traffic', 'policja drogowa', 'Traffic police are here.', 9)
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
    ('road traffic', 'road traffic', 'noun', 'movement of vehicles on roads', 'ruch drogowy', 'Road traffic is heavy today.', 1),
    ('road sign', 'road sign', 'noun', 'a sign that gives traffic information', 'znak drogowy', 'The road sign is clear.', 2),
    ('traffic lights', 'traffic lights', 'noun', 'lights that control traffic', 'sygnalizacja świetlna', 'The traffic lights are red.', 3),
    ('red light', 'red light', 'noun', 'a stop signal at traffic lights', 'czerwone światło', 'Stop at the red light.', 4),
    ('green light', 'green light', 'noun', 'a go signal at traffic lights', 'zielone światło', 'Go on the green light.', 5),
    ('speed limit', 'speed limit', 'noun', 'the maximum allowed speed', 'ograniczenie prędkości', 'The speed limit is 50.', 6),
    ('right of way', 'right of way', 'noun', 'the right to go first in traffic', 'pierwszeństwo', 'Give right of way.', 7),
    ('traffic ticket', 'traffic ticket', 'noun', 'a penalty notice for breaking traffic rules', 'mandat', 'He got a traffic ticket.', 8),
    ('traffic police', 'traffic police', 'noun', 'police who control road traffic', 'policja drogowa', 'Traffic police are here.', 9)
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
-- Pack M: TRANSPORT — Prowadzenie pojazdu
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('driver', 'driver', 'noun', 'a person who drives a vehicle', 'kierowca', 'The driver is careful.', 1),
    ('driving', 'driving', 'noun', 'the action of operating a vehicle', 'jazda', 'Driving in rain is hard.', 2),
    ('starting', 'starting', 'noun', 'the moment you begin to move', 'ruszanie', 'Starting is smooth.', 3),
    ('braking', 'braking', 'noun', 'the act of slowing or stopping', 'hamowanie', 'Braking is quick.', 4),
    ('turning', 'turning', 'noun', 'changing direction with a vehicle', 'skręcanie', 'Turning left is easy.', 5),
    ('parking', 'parking', 'noun', 'leaving a vehicle in a place', 'parkowanie', 'Parking is free here.', 6),
    ('reversing', 'reversing', 'noun', 'moving a vehicle backwards', 'cofanie', 'Reversing is careful.', 7),
    ('gear shifting', 'gear shifting', 'noun', 'changing gears while driving', 'zmiana biegów', 'Gear shifting is smooth.', 8),
    ('refueling', 'refueling', 'noun', 'putting fuel into a vehicle', 'tankowanie', 'Refueling takes a few minutes.', 9)
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
    ('driver', 'driver', 'noun', 'a person who drives a vehicle', 'kierowca', 'The driver is careful.', 1),
    ('driving', 'driving', 'noun', 'the action of operating a vehicle', 'jazda', 'Driving in rain is hard.', 2),
    ('starting', 'starting', 'noun', 'the moment you begin to move', 'ruszanie', 'Starting is smooth.', 3),
    ('braking', 'braking', 'noun', 'the act of slowing or stopping', 'hamowanie', 'Braking is quick.', 4),
    ('turning', 'turning', 'noun', 'changing direction with a vehicle', 'skręcanie', 'Turning left is easy.', 5),
    ('parking', 'parking', 'noun', 'leaving a vehicle in a place', 'parkowanie', 'Parking is free here.', 6),
    ('reversing', 'reversing', 'noun', 'moving a vehicle backwards', 'cofanie', 'Reversing is careful.', 7),
    ('gear shifting', 'gear shifting', 'noun', 'changing gears while driving', 'zmiana biegów', 'Gear shifting is smooth.', 8),
    ('refueling', 'refueling', 'noun', 'putting fuel into a vehicle', 'tankowanie', 'Refueling takes a few minutes.', 9)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('driver', 'driver', 'noun', 'a person who drives a vehicle', 'kierowca', 'The driver is careful.', 1),
    ('driving', 'driving', 'noun', 'the action of operating a vehicle', 'jazda', 'Driving in rain is hard.', 2),
    ('starting', 'starting', 'noun', 'the moment you begin to move', 'ruszanie', 'Starting is smooth.', 3),
    ('braking', 'braking', 'noun', 'the act of slowing or stopping', 'hamowanie', 'Braking is quick.', 4),
    ('turning', 'turning', 'noun', 'changing direction with a vehicle', 'skręcanie', 'Turning left is easy.', 5),
    ('parking', 'parking', 'noun', 'leaving a vehicle in a place', 'parkowanie', 'Parking is free here.', 6),
    ('reversing', 'reversing', 'noun', 'moving a vehicle backwards', 'cofanie', 'Reversing is careful.', 7),
    ('gear shifting', 'gear shifting', 'noun', 'changing gears while driving', 'zmiana biegów', 'Gear shifting is smooth.', 8),
    ('refueling', 'refueling', 'noun', 'putting fuel into a vehicle', 'tankowanie', 'Refueling takes a few minutes.', 9)
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
    ('driver', 'driver', 'noun', 'a person who drives a vehicle', 'kierowca', 'The driver is careful.', 1),
    ('driving', 'driving', 'noun', 'the action of operating a vehicle', 'jazda', 'Driving in rain is hard.', 2),
    ('starting', 'starting', 'noun', 'the moment you begin to move', 'ruszanie', 'Starting is smooth.', 3),
    ('braking', 'braking', 'noun', 'the act of slowing or stopping', 'hamowanie', 'Braking is quick.', 4),
    ('turning', 'turning', 'noun', 'changing direction with a vehicle', 'skręcanie', 'Turning left is easy.', 5),
    ('parking', 'parking', 'noun', 'leaving a vehicle in a place', 'parkowanie', 'Parking is free here.', 6),
    ('reversing', 'reversing', 'noun', 'moving a vehicle backwards', 'cofanie', 'Reversing is careful.', 7),
    ('gear shifting', 'gear shifting', 'noun', 'changing gears while driving', 'zmiana biegów', 'Gear shifting is smooth.', 8),
    ('refueling', 'refueling', 'noun', 'putting fuel into a vehicle', 'tankowanie', 'Refueling takes a few minutes.', 9)
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
-- Pack N: TRANSPORT — Awarie i serwis
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('breakdown', 'breakdown', 'noun', 'a sudden failure of a vehicle', 'awaria', 'The breakdown stopped the car.', 1),
    ('fault', 'fault', 'noun', 'a small problem or defect', 'usterka', 'The fault is easy to fix.', 2),
    ('accident', 'accident', 'noun', 'a crash on the road', 'wypadek', 'There was an accident.', 3),
    ('minor collision', 'minor collision', 'noun', 'a small crash', 'stłuczka', 'It was a minor collision.', 4),
    ('mechanic', 'mechanic', 'noun', 'a person who repairs vehicles', 'mechanik', 'The mechanic is busy.', 5),
    ('workshop', 'workshop', 'noun', 'a place where vehicles are repaired', 'warsztat', 'The workshop is nearby.', 6),
    ('inspection', 'inspection', 'noun', 'a regular check of a vehicle', 'przegląd', 'The inspection is due.', 7),
    ('repair', 'repair', 'noun', 'the act of fixing something', 'naprawa', 'The repair takes one day.', 8),
    ('oil change', 'oil change', 'noun', 'replacing old oil with new oil', 'wymiana oleju', 'An oil change is important.', 9),
    ('tow truck', 'tow truck', 'noun', 'a truck that pulls broken vehicles', 'laweta', 'The tow truck arrived quickly.', 10)
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
    ('breakdown', 'breakdown', 'noun', 'a sudden failure of a vehicle', 'awaria', 'The breakdown stopped the car.', 1),
    ('fault', 'fault', 'noun', 'a small problem or defect', 'usterka', 'The fault is easy to fix.', 2),
    ('accident', 'accident', 'noun', 'a crash on the road', 'wypadek', 'There was an accident.', 3),
    ('minor collision', 'minor collision', 'noun', 'a small crash', 'stłuczka', 'It was a minor collision.', 4),
    ('mechanic', 'mechanic', 'noun', 'a person who repairs vehicles', 'mechanik', 'The mechanic is busy.', 5),
    ('workshop', 'workshop', 'noun', 'a place where vehicles are repaired', 'warsztat', 'The workshop is nearby.', 6),
    ('inspection', 'inspection', 'noun', 'a regular check of a vehicle', 'przegląd', 'The inspection is due.', 7),
    ('repair', 'repair', 'noun', 'the act of fixing something', 'naprawa', 'The repair takes one day.', 8),
    ('oil change', 'oil change', 'noun', 'replacing old oil with new oil', 'wymiana oleju', 'An oil change is important.', 9),
    ('tow truck', 'tow truck', 'noun', 'a truck that pulls broken vehicles', 'laweta', 'The tow truck arrived quickly.', 10)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('breakdown', 'breakdown', 'noun', 'a sudden failure of a vehicle', 'awaria', 'The breakdown stopped the car.', 1),
    ('fault', 'fault', 'noun', 'a small problem or defect', 'usterka', 'The fault is easy to fix.', 2),
    ('accident', 'accident', 'noun', 'a crash on the road', 'wypadek', 'There was an accident.', 3),
    ('minor collision', 'minor collision', 'noun', 'a small crash', 'stłuczka', 'It was a minor collision.', 4),
    ('mechanic', 'mechanic', 'noun', 'a person who repairs vehicles', 'mechanik', 'The mechanic is busy.', 5),
    ('workshop', 'workshop', 'noun', 'a place where vehicles are repaired', 'warsztat', 'The workshop is nearby.', 6),
    ('inspection', 'inspection', 'noun', 'a regular check of a vehicle', 'przegląd', 'The inspection is due.', 7),
    ('repair', 'repair', 'noun', 'the act of fixing something', 'naprawa', 'The repair takes one day.', 8),
    ('oil change', 'oil change', 'noun', 'replacing old oil with new oil', 'wymiana oleju', 'An oil change is important.', 9),
    ('tow truck', 'tow truck', 'noun', 'a truck that pulls broken vehicles', 'laweta', 'The tow truck arrived quickly.', 10)
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
    ('breakdown', 'breakdown', 'noun', 'a sudden failure of a vehicle', 'awaria', 'The breakdown stopped the car.', 1),
    ('fault', 'fault', 'noun', 'a small problem or defect', 'usterka', 'The fault is easy to fix.', 2),
    ('accident', 'accident', 'noun', 'a crash on the road', 'wypadek', 'There was an accident.', 3),
    ('minor collision', 'minor collision', 'noun', 'a small crash', 'stłuczka', 'It was a minor collision.', 4),
    ('mechanic', 'mechanic', 'noun', 'a person who repairs vehicles', 'mechanik', 'The mechanic is busy.', 5),
    ('workshop', 'workshop', 'noun', 'a place where vehicles are repaired', 'warsztat', 'The workshop is nearby.', 6),
    ('inspection', 'inspection', 'noun', 'a regular check of a vehicle', 'przegląd', 'The inspection is due.', 7),
    ('repair', 'repair', 'noun', 'the act of fixing something', 'naprawa', 'The repair takes one day.', 8),
    ('oil change', 'oil change', 'noun', 'replacing old oil with new oil', 'wymiana oleju', 'An oil change is important.', 9),
    ('tow truck', 'tow truck', 'noun', 'a truck that pulls broken vehicles', 'laweta', 'The tow truck arrived quickly.', 10)
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
-- Pack O: TRANSPORT — Ekologia i nowoczesny transport
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('electric car', 'electric car', 'noun', 'a car powered by electricity', 'samochód elektryczny', 'The electric car is quiet.', 1),
    ('hybrid car', 'hybrid car', 'noun', 'a car with two power sources', 'hybryda', 'A hybrid car saves fuel.', 2),
    ('charging station', 'charging station', 'noun', 'a place to charge electric vehicles', 'stacja ładowania', 'The charging station is nearby.', 3),
    ('exhaust emissions', 'exhaust emissions', 'noun', 'gases from a vehicle engine', 'emisja spalin', 'Exhaust emissions are harmful.', 4),
    ('public transport', 'public transport', 'noun', 'transport for many people', 'transport publiczny', 'Public transport is cheap.', 5),
    ('car sharing', 'car sharing', 'noun', 'using shared cars for short trips', 'car-sharing', 'Car sharing is popular.', 6),
    ('electric scooter', 'electric scooter', 'noun', 'a scooter with electric power', 'hulajnoga elektryczna', 'The electric scooter is fast.', 7)
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
    ('electric car', 'electric car', 'noun', 'a car powered by electricity', 'samochód elektryczny', 'The electric car is quiet.', 1),
    ('hybrid car', 'hybrid car', 'noun', 'a car with two power sources', 'hybryda', 'A hybrid car saves fuel.', 2),
    ('charging station', 'charging station', 'noun', 'a place to charge electric vehicles', 'stacja ładowania', 'The charging station is nearby.', 3),
    ('exhaust emissions', 'exhaust emissions', 'noun', 'gases from a vehicle engine', 'emisja spalin', 'Exhaust emissions are harmful.', 4),
    ('public transport', 'public transport', 'noun', 'transport for many people', 'transport publiczny', 'Public transport is cheap.', 5),
    ('car sharing', 'car sharing', 'noun', 'using shared cars for short trips', 'car-sharing', 'Car sharing is popular.', 6),
    ('electric scooter', 'electric scooter', 'noun', 'a scooter with electric power', 'hulajnoga elektryczna', 'The electric scooter is fast.', 7)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'transport', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('electric car', 'electric car', 'noun', 'a car powered by electricity', 'samochód elektryczny', 'The electric car is quiet.', 1),
    ('hybrid car', 'hybrid car', 'noun', 'a car with two power sources', 'hybryda', 'A hybrid car saves fuel.', 2),
    ('charging station', 'charging station', 'noun', 'a place to charge electric vehicles', 'stacja ładowania', 'The charging station is nearby.', 3),
    ('exhaust emissions', 'exhaust emissions', 'noun', 'gases from a vehicle engine', 'emisja spalin', 'Exhaust emissions are harmful.', 4),
    ('public transport', 'public transport', 'noun', 'transport for many people', 'transport publiczny', 'Public transport is cheap.', 5),
    ('car sharing', 'car sharing', 'noun', 'using shared cars for short trips', 'car-sharing', 'Car sharing is popular.', 6),
    ('electric scooter', 'electric scooter', 'noun', 'a scooter with electric power', 'hulajnoga elektryczna', 'The electric scooter is fast.', 7)
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
    ('electric car', 'electric car', 'noun', 'a car powered by electricity', 'samochód elektryczny', 'The electric car is quiet.', 1),
    ('hybrid car', 'hybrid car', 'noun', 'a car with two power sources', 'hybryda', 'A hybrid car saves fuel.', 2),
    ('charging station', 'charging station', 'noun', 'a place to charge electric vehicles', 'stacja ładowania', 'The charging station is nearby.', 3),
    ('exhaust emissions', 'exhaust emissions', 'noun', 'gases from a vehicle engine', 'emisja spalin', 'Exhaust emissions are harmful.', 4),
    ('public transport', 'public transport', 'noun', 'transport for many people', 'transport publiczny', 'Public transport is cheap.', 5),
    ('car sharing', 'car sharing', 'noun', 'using shared cars for short trips', 'car-sharing', 'Car sharing is popular.', 6),
    ('electric scooter', 'electric scooter', 'noun', 'a scooter with electric power', 'hulajnoga elektryczna', 'The electric scooter is fast.', 7)
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
