-- Create vocab packs for home & rooms (idempotent)

begin;

-- Pack 1: Rooms in the house
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('rooms-in-the-house', 'Pomieszczenia w domu', 'Nazwy pomieszczeń w domu i wokół domu.', true, 10)
on conflict (slug) do nothing;

-- Pack 2: Salon / Pokój dzienny
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('living-room', 'Salon / pokój dzienny', 'Meble i wyposażenie salonu.', true, 11)
on conflict (slug) do nothing;

-- Pack 3: Kuchnia
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('kitchen', 'Kuchnia', 'Sprzęty i akcesoria kuchenne.', true, 12)
on conflict (slug) do nothing;

-- Pack 4: Jadalnia
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('dining-room', 'Jadalnia', 'Wyposażenie jadalni i nakrycie stołu.', true, 13)
on conflict (slug) do nothing;

-- Pack 5: Sypialnia
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('bedroom', 'Sypialnia', 'Meble i rzeczy w sypialni.', true, 14)
on conflict (slug) do nothing;

-- Pack 6: Łazienka
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('bathroom', 'Łazienka', 'Wyposażenie i akcesoria łazienkowe.', true, 15)
on conflict (slug) do nothing;

-- Pack 7: Przedpokój / Hol
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('hallway', 'Przedpokój / hol', 'Wyposażenie przedpokoju i holu.', true, 16)
on conflict (slug) do nothing;

-- Pack 8: Gabinet / Biuro
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('home-office', 'Gabinet / biuro', 'Słownictwo do pracy w domu.', true, 17)
on conflict (slug) do nothing;

-- Pack 9: Pokój dziecięcy
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('kids-room', 'Pokój dziecięcy', 'Meble i rzeczy w pokoju dziecięcym.', true, 18)
on conflict (slug) do nothing;

-- Pack 10: Pralnia
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('laundry-room', 'Pralnia', 'Sprzęty i akcesoria w pralni.', true, 19)
on conflict (slug) do nothing;

-- Pack 11: Garderoba
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('walk-in-closet', 'Garderoba', 'Przechowywanie ubrań i akcesoriów.', true, 20)
on conflict (slug) do nothing;

-- Pack 12: Balkon / Taras
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('balcony-terrace', 'Balkon / taras', 'Wyposażenie balkonu i tarasu.', true, 21)
on conflict (slug) do nothing;

-- Pack 13: Garaż / Piwnica
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('garage-basement', 'Garaż / piwnica', 'Przedmioty z garażu i piwnicy.', true, 22)
on conflict (slug) do nothing;

commit;
