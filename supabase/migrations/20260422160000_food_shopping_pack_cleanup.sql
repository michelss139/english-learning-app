-- Catalog cleanup for Food & Shopping packs.

begin;

update public.vocab_packs as v
set display_title = d.display_title
from (
  values
    ('shopping-clothing-and-accessories-daily', 'Ciuchy'),
    ('food-drinks-daily', 'Napoje'),
    ('shopping-electronics-and-gadgets-daily', 'elektronika'),
    ('food-fruits-daily', 'owoce'),
    ('food-vegetables-daily', 'warzywa')
) as d(slug, display_title)
where v.slug = d.slug;

update public.vocab_packs
set is_published = false
where slug = 'shopping-groceries-and-food-items-daily';

commit;
