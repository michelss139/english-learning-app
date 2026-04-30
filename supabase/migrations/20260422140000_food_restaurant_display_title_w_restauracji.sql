-- Catalog title: "Restaurant English" → "W restauracji"

update public.vocab_packs
set display_title = 'W restauracji'
where slug = 'food-restaurant-daily';
