-- Add senses to vocab_pack_items for pack 'shop'
-- Order follows the provided list (1..19)

begin;

with words(lemma_norm, order_index) as (
  values
    ('store', 1),
    ('customer', 2),
    ('cashier', 3),
    ('checkout', 4),
    ('counter', 5),
    ('aisle', 6),
    ('shelf', 7),
    ('basket', 8),
    ('cart', 9),
    ('price', 10),
    ('discount', 11),
    ('receipt', 12),
    ('change', 13),
    ('payment', 14),
    ('cash', 15),
    ('card', 16),
    ('refund', 17),
    ('return', 18),
    ('bag', 19)
)
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, w.order_index
from words w
join vocab_packs p on p.slug = 'shop'
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lateral (
  select ls.id
  from lexicon_senses ls
  where ls.entry_id = e.id
  order by ls.sense_order asc, ls.created_at asc
  limit 1
) s on true
on conflict (pack_id, sense_id) do nothing;

commit;
