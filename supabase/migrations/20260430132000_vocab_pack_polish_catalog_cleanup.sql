-- Polish catalog names and sections for vocab packs.
-- This only changes presentation metadata; pack slugs, items, and progress remain unchanged.

begin;

with catalog(slug_key, display_title, display_section) as (
  values
    ('body-body-fluids', 'Płyny ustrojowe', 'Ciało i zdrowie'),
    ('body-body-parts', 'Części ciała', 'Ciało i zdrowie'),
    ('body-daily-head', 'Głowa i twarz', 'Ciało i zdrowie'),
    ('body-daily-legs', 'Nogi', 'Ciało i zdrowie'),
    ('body-daily-organs', 'Narządy', 'Ciało i zdrowie'),
    ('body-daily-skin', 'Skóra', 'Ciało i zdrowie'),
    ('body-daily-torso', 'Tułów', 'Ciało i zdrowie'),
    ('body-facial-features', 'Twarz i rysy', 'Ciało i zdrowie'),
    ('body-internal-organs', 'Narządy wewnętrzne', 'Ciało i zdrowie'),
    ('body-limbs-and-extremities', 'Kończyny', 'Ciało i zdrowie'),
    ('body-precise-head', 'Głowa i twarz', 'Ciało i zdrowie'),
    ('body-precise-legs', 'Nogi', 'Ciało i zdrowie'),
    ('body-precise-organs', 'Narządy', 'Ciało i zdrowie'),
    ('body-precise-skin', 'Skóra', 'Ciało i zdrowie'),
    ('body-precise-torso', 'Tułów', 'Ciało i zdrowie'),

    ('clothes-footwear', 'Obuwie', 'Ubrania'),
    ('clothes-formal-wear', 'Eleganckie ubrania', 'Ubrania'),
    ('clothes-outerwear', 'Odzież wierzchnia', 'Ubrania'),
    ('clothes-sportswear', 'Sportowe ubrania', 'Ubrania'),
    ('clothes-underwear', 'Bielizna', 'Ubrania'),

    ('communication-body-language', 'Mowa ciała', 'Ludzie i komunikacja'),
    ('communication-digital-communication', 'Telefon i wiadomości', 'Ludzie i komunikacja'),
    ('communication-public-speaking', 'Wystąpienia publiczne', 'Ludzie i komunikacja'),
    ('communication-telecommunications', 'Telekomunikacja', 'Ludzie i komunikacja'),
    ('communication-written-correspondence', 'Pisanie i maile', 'Ludzie i komunikacja'),

    ('contracts-confidentiality', 'Poufność i dane', 'Biznes i umowy'),
    ('contracts-disputes', 'Spory i zakończenie współpracy', 'Biznes i umowy'),
    ('contracts-formation', 'Zawarcie i obowiązywanie umowy', 'Biznes i umowy'),
    ('contracts-general', 'Pojęcia ogólne w umowach', 'Biznes i umowy'),
    ('contracts-leasing', 'Leasing', 'Biznes i umowy'),
    ('contracts-liability', 'Odpowiedzialność i zabezpieczenia', 'Biznes i umowy'),
    ('contracts-parties', 'Strony i role', 'Biznes i umowy'),
    ('contracts-payments', 'Wynagrodzenie i płatności', 'Biznes i umowy'),
    ('contracts-rental', 'Umowa najmu', 'Biznes i umowy'),
    ('contracts-services', 'Umowy usługowe', 'Biznes i umowy'),
    ('contracts-trade', 'Umowy handlowe i współpraca', 'Biznes i umowy'),

    ('business-agreement', 'Porozumienia biznesowe', 'Biznes i umowy'),
    ('business-retail', 'Handel detaliczny', 'Biznes i umowy'),
    ('business-wastemanagement', 'Gospodarka odpadami', 'Biznes i umowy'),

    ('education-academic-subjects', 'Przedmioty szkolne', 'Praca i nauka'),
    ('education-assessment-tools', 'Sprawdziany i oceny', 'Praca i nauka'),
    ('education-educational-institutions', 'Szkoły i uczelnie', 'Praca i nauka'),
    ('education-school-personnel', 'Pracownicy szkoły', 'Praca i nauka'),
    ('education-school-supplies', 'Przybory szkolne', 'Praca i nauka'),

    ('emotions-complex-emotions', 'Złożone emocje', 'Emocje'),
    ('emotions-emotions-in-social-context', 'Emocje społeczne', 'Emocje'),
    ('emotions-expressions-of-emotions', 'Wyrażanie emocji', 'Emocje'),
    ('emotions-negative-emotions', 'Negatywne emocje', 'Emocje'),
    ('emotions-positive-emotions', 'Pozytywne emocje', 'Emocje'),

    ('entertainment-board-and-card-games', 'Gry planszowe i karciane', 'Rozrywka'),
    ('entertainment-festivals-and-events', 'Festiwale i wydarzenia', 'Rozrywka'),
    ('entertainment-movies-and-cinema', 'Filmy i kino', 'Rozrywka'),
    ('entertainment-music-and-concerts', 'Muzyka i koncerty', 'Rozrywka'),
    ('entertainment-theater-and-stage', 'Teatr i scena', 'Rozrywka'),
    ('entertainment-video-games', 'Gry wideo', 'Rozrywka'),

    ('family-basic', 'Rodzina', 'Ludzie i komunikacja'),

    ('food-cooking', 'Gotowanie', 'Jedzenie i zakupy'),
    ('food-dairy-products', 'Nabiał', 'Jedzenie i zakupy'),
    ('food-drinks', 'Napoje', 'Jedzenie i zakupy'),
    ('food-fruits', 'Owoce', 'Jedzenie i zakupy'),
    ('food-grains-and-cereals', 'Zboża i produkty zbożowe', 'Jedzenie i zakupy'),
    ('food-herbs-and-spices', 'Zioła i przyprawy', 'Jedzenie i zakupy'),
    ('food-meat-and-poultry', 'Mięso i drób', 'Jedzenie i zakupy'),
    ('food-restaurant', 'W restauracji', 'Jedzenie i zakupy'),
    ('food-seafood', 'Owoce morza', 'Jedzenie i zakupy'),
    ('food-spices', 'Przyprawy', 'Jedzenie i zakupy'),
    ('food-vegetables', 'Warzywa', 'Jedzenie i zakupy'),

    ('garden-areas', 'Obszary ogrodu', 'Ogród'),
    ('garden-garden-containers', 'Donice i pojemniki', 'Ogród'),
    ('garden-garden-plants', 'Rośliny ogrodowe', 'Ogród'),
    ('garden-garden-structures', 'Konstrukcje ogrodowe', 'Ogród'),
    ('garden-garden-surfaces', 'Nawierzchnie ogrodowe', 'Ogród'),
    ('garden-garden-tools', 'Narzędzia ogrodowe', 'Ogród'),
    ('garden-garden-wildlife', 'Zwierzęta w ogrodzie', 'Ogród'),
    ('garden-plants', 'Rośliny', 'Ogród'),
    ('garden-tools', 'Narzędzia ogrodowe', 'Ogród'),

    ('health-body-parts', 'Części ciała', 'Ciało i zdrowie'),
    ('health-medical-conditions', 'Problemy zdrowotne', 'Ciało i zdrowie'),
    ('health-medical-equipment', 'Sprzęt medyczny', 'Ciało i zdrowie'),
    ('health-medicine-and-treatments', 'Leki i leczenie', 'Ciało i zdrowie'),

    ('home-appliances', 'Sprzęty domowe', 'Dom'),
    ('home-bathroom', 'Łazienka', 'Dom'),
    ('home-cleaning', 'Sprzątanie', 'Dom'),
    ('home-cleaning-supplies', 'Środki czystości', 'Dom'),
    ('home-decor', 'Dekoracje', 'Dom'),
    ('home-furniture', 'Meble', 'Dom'),
    ('home-kitchen', 'Kuchnia', 'Dom'),
    ('home-rooms', 'Pomieszczenia w domu', 'Dom'),
    ('home-tools', 'Narzędzia domowe', 'Dom'),
    ('rooms-in-the-house', 'Pomieszczenia w domu', 'Dom'),

    ('kitchen-appliances', 'Sprzęty kuchenne', 'Dom'),
    ('kitchen-cleaning-tools', 'Narzędzia do sprzątania', 'Dom'),
    ('kitchen-cooking-utensils', 'Przybory kuchenne', 'Dom'),
    ('kitchen-storage-containers', 'Pojemniki do przechowywania', 'Dom'),
    ('kitchen-tableware', 'Zastawa stołowa', 'Dom'),

    ('money-banking-tools', 'Bankowość', 'Pieniądze'),
    ('money-coins-and-notes', 'Monety i banknoty', 'Pieniądze'),
    ('money-currencies', 'Waluty', 'Pieniądze'),
    ('money-expenses', 'Wydatki', 'Pieniądze'),
    ('money-income-sources', 'Źródła dochodu', 'Pieniądze'),
    ('money-savings-and-investments', 'Oszczędności i inwestycje', 'Pieniądze'),

    ('office-meeting-spaces', 'Sale spotkań', 'Praca i nauka'),
    ('office-office-furniture', 'Meble biurowe', 'Praca i nauka'),
    ('office-office-technology', 'Technologia biurowa', 'Praca i nauka'),
    ('office-stationery-supplies', 'Artykuły biurowe', 'Praca i nauka'),
    ('office-workplace-people', 'Ludzie w pracy', 'Praca i nauka'),

    ('people-ages-and-stages', 'Wiek i etapy życia', 'Ludzie i komunikacja'),
    ('people-family-members', 'Rodzina', 'Ludzie i komunikacja'),
    ('people-nationalities', 'Narodowości', 'Ludzie i komunikacja'),
    ('people-personality-traits', 'Osobowość', 'Ludzie i komunikacja'),
    ('people-physical-appearance', 'Wygląd', 'Ludzie i komunikacja'),
    ('people-professions', 'Zawody', 'Ludzie i komunikacja'),

    ('shop', 'W sklepie', 'Jedzenie i zakupy'),
    ('shopping-clothing-and-accessories', 'Ciuchy', 'Ubrania'),
    ('shopping-electronics-and-gadgets', 'Elektronika', 'Technologia'),
    ('shopping-furniture-and-home-goods', 'Meble i wyposażenie domu', 'Dom'),
    ('shopping-groceries-and-food-items', 'Zakupy spożywcze', 'Jedzenie i zakupy'),
    ('shopping-shopping-locations', 'Sklepy i miejsca zakupów', 'Jedzenie i zakupy'),

    ('sports-basketball', 'Koszykówka', 'Sport'),
    ('sports-football', 'Piłka nożna', 'Sport'),
    ('sports-formula1', 'Formuła 1', 'Sport'),
    ('sports-skijumping', 'Skoki narciarskie', 'Sport'),
    ('sports-tennis', 'Tenis', 'Sport'),

    ('technology-computing-devices', 'Urządzenia komputerowe', 'Technologia'),
    ('technology-home-electronics', 'Elektronika domowa', 'Technologia'),
    ('technology-internet-infrastructure', 'Internet i sieć', 'Technologia'),
    ('technology-software-applications', 'Aplikacje i programy', 'Technologia'),
    ('technology-wearable-technology', 'Technologie ubieralne', 'Technologia'),

    ('time-days-and-dates', 'Dni i daty', 'Czas i pogoda'),
    ('time-events-and-occasions', 'Wydarzenia i okazje', 'Czas i pogoda'),
    ('time-periods-of-the-day', 'Pory dnia', 'Czas i pogoda'),
    ('time-time-measuring-devices', 'Urządzenia do mierzenia czasu', 'Czas i pogoda'),
    ('time-units-of-time', 'Jednostki czasu', 'Czas i pogoda'),

    ('transport-aircraft', 'Samoloty', 'Podróże i transport'),
    ('transport-bicycles-and-scooters', 'Rowery i hulajnogi', 'Podróże i transport'),
    ('transport-public-transport', 'Transport publiczny', 'Podróże i transport'),
    ('transport-rail-transport', 'Kolej', 'Podróże i transport'),
    ('transport-road-vehicles', 'Pojazdy drogowe', 'Podróże i transport'),
    ('transport-watercraft', 'Transport wodny', 'Podróże i transport'),

    ('travel-accommodation-types', 'Hotele i noclegi', 'Podróże i transport'),
    ('travel-airport-and-station', 'Lotnisko i dworzec', 'Podróże i transport'),
    ('travel-suitcase-and-luggage', 'Bagaż', 'Podróże i transport'),
    ('travel-transportation-modes', 'Środki transportu', 'Podróże i transport'),
    ('travel-travel-places', 'Miejsca w podróży', 'Podróże i transport'),

    ('weather-cloud-types', 'Chmury', 'Czas i pogoda'),
    ('weather-natural-weather-events', 'Zjawiska pogodowe', 'Czas i pogoda'),
    ('weather-precipitation', 'Deszcz, śnieg i opady', 'Czas i pogoda'),
    ('weather-temperature-conditions', 'Temperatura', 'Czas i pogoda'),
    ('weather-wind-related', 'Wiatr', 'Czas i pogoda')
)
update public.vocab_packs as v
set
  display_title = catalog.display_title,
  display_section = catalog.display_section
from catalog
where v.slug = catalog.slug_key
  or v.slug = concat(catalog.slug_key, '-', v.vocab_mode);

update public.vocab_packs
set is_published = false
where slug = 'shopping-groceries-and-food-items-daily';

commit;
