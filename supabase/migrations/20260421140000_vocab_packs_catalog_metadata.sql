-- Presentation metadata for vocab pack catalog (non-destructive; idempotent updates by slug).

begin;

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.vocab_packs add column if not exists display_title text;
alter table public.vocab_packs add column if not exists display_section text;
alter table public.vocab_packs add column if not exists display_subsection text;
alter table public.vocab_packs add column if not exists is_archived boolean not null default false;
alter table public.vocab_packs add column if not exists featured_rank int;

create index if not exists idx_vocab_packs_published_mode_archived
  on public.vocab_packs (is_published, vocab_mode, is_archived);

-- ---------------------------------------------------------------------------
-- Daily catalog: display titles, sections, featured ranks (KEEP + RESECTION)
-- ---------------------------------------------------------------------------
update public.vocab_packs as v
set
  display_title = d.dt,
  display_section = d.ds,
  featured_rank = d.fr,
  is_archived = false
from (
  values
    ('shop', 'W sklepie', 'Start Here', 1),
    ('home-rooms-daily', 'Rooms in the House', 'Home & Life', 2),
    ('home-kitchen-daily', 'Kitchen Basics', 'Home & Life', null::int),
    ('home-bathroom-daily', 'Bathroom', 'Home & Life', null::int),
    ('home-furniture-daily', 'Furniture', 'Home & Life', null::int),
    ('home-cleaning-daily', 'Cleaning', 'Home & Life', null::int),
    ('food-restaurant-daily', 'Restaurant English', 'Food & Shopping', 3),
    ('food-fruits-daily', 'Fruits', 'Food & Shopping', null::int),
    ('food-vegetables-daily', 'Vegetables', 'Food & Shopping', null::int),
    ('food-drinks-daily', 'Drinks', 'Food & Shopping', null::int),
    ('shopping-clothing-and-accessories-daily', 'Clothes Shopping', 'Food & Shopping', null::int),
    ('shopping-electronics-and-gadgets-daily', 'Electronics Shopping', 'Food & Shopping', null::int),
    ('shopping-groceries-and-food-items-daily', 'Groceries', 'Food & Shopping', null::int),
    ('people-family-members-daily', 'Family', 'People & Communication', 4),
    ('people-physical-appearance-daily', 'Appearance', 'People & Communication', null::int),
    ('people-personality-traits-daily', 'Personality', 'People & Communication', null::int),
    ('people-professions-daily', 'Jobs & Professions', 'People & Communication', null::int),
    ('emotions-positive-emotions-daily', 'Positive Emotions', 'People & Communication', null::int),
    ('emotions-negative-emotions-daily', 'Negative Emotions', 'People & Communication', null::int),
    ('communication-digital-communication-daily', 'Phone & Messages', 'People & Communication', 6),
    ('communication-written-correspondence-daily', 'Emails & Writing', 'People & Communication', null::int),
    ('travel-airport-and-station-daily', 'Airport & Station', 'Travel & Transport', 5),
    ('travel-accommodation-types-daily', 'Hotels & Accommodation', 'Travel & Transport', null::int),
    ('travel-suitcase-and-luggage-daily', 'Luggage', 'Travel & Transport', null::int),
    ('transport-public-transport-daily', 'Public Transport', 'Travel & Transport', null::int),
    ('transport-road-vehicles-daily', 'Vehicles', 'Travel & Transport', null::int),
    ('education-academic-subjects-daily', 'School Subjects', 'Work & Study', null::int),
    ('education-school-supplies-daily', 'School Supplies', 'Work & Study', null::int),
    ('office-workplace-people-daily', 'Workplace People', 'Work & Study', null::int),
    ('office-office-technology-daily', 'Office Technology', 'Work & Study', null::int),
    ('health-medical-conditions-daily', 'Medical Problems', 'Health & Body', null::int),
    ('health-medicine-and-treatments-daily', 'Medicine & Treatment', 'Health & Body', null::int),
    ('body-body-parts-daily', 'Body Basics', 'Health & Body', null::int),
    ('body-facial-features-daily', 'Face & Features', 'Health & Body', null::int),
    ('technology-computing-devices-daily', 'Devices', 'Technology', null::int),
    ('technology-software-applications-daily', 'Apps & Software', 'Technology', null::int),
    ('technology-home-electronics-daily', 'Home Electronics', 'Technology', null::int),
    ('time-days-and-dates-daily', 'Days & Dates', 'Time & Weather', null::int),
    ('time-units-of-time-daily', 'Time Units', 'Time & Weather', null::int),
    ('weather-temperature-conditions-daily', 'Temperature', 'Time & Weather', null::int),
    ('weather-precipitation-daily', 'Rain / Snow / Weather', 'Time & Weather', null::int)
) as d(slug, dt, ds, fr)
where v.slug = d.slug;

-- ---------------------------------------------------------------------------
-- Precise: contracts → Business & Contracts
-- ---------------------------------------------------------------------------
update public.vocab_packs
set
  vocab_mode = 'precise',
  display_section = 'Business & Contracts',
  is_archived = false
where slug in (
  'contracts-general',
  'contracts-formation',
  'contracts-parties',
  'contracts-rental',
  'contracts-leasing',
  'contracts-services',
  'contracts-trade',
  'contracts-payments',
  'contracts-liability',
  'contracts-confidentiality',
  'contracts-disputes'
);

-- ---------------------------------------------------------------------------
-- Precise body packs (anatomy)
-- ---------------------------------------------------------------------------
update public.vocab_packs
set
  display_section = 'Body & Health',
  is_archived = false
where slug like 'body-precise-%';

-- ---------------------------------------------------------------------------
-- Daily body packs (scripted slugs) → Health & Body
-- ---------------------------------------------------------------------------
update public.vocab_packs
set
  display_section = 'Health & Body',
  is_archived = false
where vocab_mode = 'daily'
  and slug like 'body-daily-%';

-- ---------------------------------------------------------------------------
-- Archive legacy / duplicate packs (no row deletes)
-- ---------------------------------------------------------------------------
update public.vocab_packs
set is_archived = true
where slug in (
  'living-room',
  'kitchen',
  'dining-room',
  'bedroom',
  'bathroom',
  'hallway',
  'home-office',
  'kids-room',
  'laundry-room',
  'walk-in-closet',
  'balcony-terrace',
  'garage-basement',
  'transport-vehicles',
  'transport-cars',
  'transport-motorcycles',
  'transport-bicycles',
  'transport-public',
  'transport-buses',
  'transport-rail',
  'transport-air',
  'transport-water',
  'transport-cargo',
  'transport-road',
  'transport-rules',
  'transport-driving',
  'transport-repair',
  'transport-eco',
  'garden-plants-daily',
  'garden-tools-daily',
  'food-spices-daily'
);

commit;
