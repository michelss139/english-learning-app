-- Create vocab packs for transport (idempotent)

begin;

-- Transport overview (placeholder)
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-overview', 'Transport — overview', 'Podstawowe tematy z transportu.', true, 30)
on conflict (slug) do nothing;

-- Pack A: Pojazdy
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-vehicles', 'Transport — Pojazdy', 'Podstawowe pojazdy i środki transportu.', true, 31)
on conflict (slug) do nothing;

-- Pack B: Samochody
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-cars', 'Transport — Samochody', 'Części i elementy samochodu.', true, 32)
on conflict (slug) do nothing;

-- Pack C: Motocykle i skutery
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-motorcycles', 'Transport — Motocykle i skutery', 'Elementy motocykla i skutera.', true, 33)
on conflict (slug) do nothing;

-- Pack D: Rowery
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-bicycles', 'Transport — Rowery', 'Rodzaje rowerów i ich części.', true, 34)
on conflict (slug) do nothing;

-- Pack E: Transport publiczny
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-public', 'Transport — Transport publiczny', 'Komunikacja miejska i kolej.', true, 35)
on conflict (slug) do nothing;

-- Pack F: Autobusy i autokary
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-buses', 'Transport — Autobusy i autokary', 'Autobusy, autokary i pasażerowie.', true, 36)
on conflict (slug) do nothing;

-- Pack G: Kolej
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-rail', 'Transport — Kolej', 'Słownictwo związane z koleją.', true, 37)
on conflict (slug) do nothing;

-- Pack H: Transport lotniczy
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-air', 'Transport — Transport lotniczy', 'Lotnisko, lot i samolot.', true, 38)
on conflict (slug) do nothing;

-- Pack I: Transport wodny
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-water', 'Transport — Transport wodny', 'Słownictwo związane z wodą.', true, 39)
on conflict (slug) do nothing;

-- Pack J: Transport towarowy
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-cargo', 'Transport — Transport towarowy', 'Towary, ładunek i dostawy.', true, 40)
on conflict (slug) do nothing;

-- Pack K: Droga i infrastruktura
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-road', 'Transport — Droga i infrastruktura', 'Drogi i elementy infrastruktury.', true, 41)
on conflict (slug) do nothing;

-- Pack L: Ruch drogowy i przepisy
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-rules', 'Transport — Ruch drogowy i przepisy', 'Znaki i zasady na drodze.', true, 42)
on conflict (slug) do nothing;

-- Pack M: Prowadzenie pojazdu
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-driving', 'Transport — Prowadzenie pojazdu', 'Czynności związane z jazdą.', true, 43)
on conflict (slug) do nothing;

-- Pack N: Awarie i serwis
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-repair', 'Transport — Awarie i serwis', 'Awarie, naprawy i serwis.', true, 44)
on conflict (slug) do nothing;

-- Pack O: Ekologia i nowoczesny transport
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('transport-eco', 'Transport — Ekologia i nowoczesny transport', 'Nowoczesne formy transportu.', true, 45)
on conflict (slug) do nothing;

commit;
