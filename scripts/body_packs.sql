-- Body packs (daily/precise) - creation
-- New packs are created as not published; publish after full import.

begin;

insert into vocab_packs (slug, title, description, is_published, order_index, vocab_mode, category)
select *
from (
  values
    ('body-daily-head', 'Ciało — Głowa i twarz', 'Codzienne słownictwo: głowa i twarz.', false, 500, 'daily', 'body'),
    ('body-daily-torso', 'Ciało — Tułów', 'Codzienne słownictwo: tułów.', false, 501, 'daily', 'body'),
    ('body-daily-legs', 'Ciało — Nogi', 'Codzienne słownictwo: nogi.', false, 502, 'daily', 'body'),
    ('body-daily-skin', 'Ciało — Skóra', 'Codzienne słownictwo: skóra i urazy.', false, 503, 'daily', 'body'),
    ('body-daily-organs', 'Ciało — Narządy', 'Codzienne słownictwo: narządy wewnętrzne.', false, 504, 'daily', 'body'),
    ('body-precise-head', 'Ciało — Głowa i twarz', 'Precyzyjne nazwy części głowy i twarzy.', false, 510, 'precise', 'body'),
    ('body-precise-torso', 'Ciało — Tułów', 'Precyzyjne nazwy części tułowia.', false, 511, 'precise', 'body'),
    ('body-precise-legs', 'Ciało — Nogi', 'Precyzyjne nazwy części nóg i stóp.', false, 512, 'precise', 'body'),
    ('body-precise-skin', 'Ciało — Skóra', 'Precyzyjne określenia zmian skórnych.', false, 513, 'precise', 'body'),
    ('body-precise-organs', 'Ciało — Narządy', 'Precyzyjne nazwy narządów i układów.', false, 514, 'precise', 'body')
) as v(slug, title, description, is_published, order_index, vocab_mode, category)
where not exists (
  select 1 from vocab_packs p where p.slug = v.slug
);

commit;
