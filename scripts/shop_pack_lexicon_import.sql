-- Batch import for "shop" pack lexicon data (19 nouns)
-- Idempotent inserts: lexicon_entries, lexicon_senses, lexicon_translations, lexicon_examples

begin;

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('store', 'store', 'noun', 'a place where you buy things', 'sklep', 'I went to the store to buy milk.', 1),
    ('customer', 'customer', 'noun', 'a person who buys something', 'klient', 'The customer asked for help.', 2),
    ('cashier', 'cashier', 'noun', 'a person who takes your money in a store', 'kasjer', 'The cashier smiled and said hello.', 3),
    ('checkout', 'checkout', 'noun', 'the place where you pay in a store', 'kasa', 'Please go to the checkout.', 4),
    ('counter', 'counter', 'noun', 'a long table where you pay or get service', 'lada', 'The bread is behind the counter.', 5),
    ('aisle', 'aisle', 'noun', 'a passage between shelves in a store', 'alejka', 'The cereal is in aisle five.', 6),
    ('shelf', 'shelf', 'noun', 'a flat place where goods are stored', 'półka', 'The shampoo is on the top shelf.', 7),
    ('basket', 'basket', 'noun', 'a small container for shopping', 'koszyk', 'She put the apples in the basket.', 8),
    ('cart', 'cart', 'noun', 'a wheeled container for shopping', 'wózek', 'He pushed the cart to the checkout.', 9),
    ('price', 'price', 'noun', 'the amount of money something costs', 'cena', 'The price is too high.', 10),
    ('discount', 'discount', 'noun', 'a lower price for something', 'zniżka', 'There is a discount on shoes.', 11),
    ('receipt', 'receipt', 'noun', 'a paper that shows you paid', 'paragon', 'Keep the receipt, please.', 12),
    ('change', 'change', 'noun', 'the money you get back after paying', 'reszta', 'Here is your change.', 13),
    ('payment', 'payment', 'noun', 'the act of paying money', 'płatność', 'Card payment is accepted.', 14),
    ('cash', 'cash', 'noun', 'money in coins or notes', 'gotówka', 'I paid in cash.', 15),
    ('card', 'card', 'noun', 'a bank card used to pay', 'karta', 'Do you want to pay by card?', 16),
    ('refund', 'refund', 'noun', 'money returned after you give something back', 'zwrot pieniędzy', 'You can ask for a refund.', 17),
    ('return', 'return', 'noun', 'the act of giving something back to a store', 'zwrot', 'You can return the item within 14 days.', 18),
    ('bag', 'bag', 'noun', 'a container for carrying shopping', 'torba', 'Do you need a bag?', 19)
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
    ('store', 'store', 'noun', 'a place where you buy things', 'sklep', 'I went to the store to buy milk.', 1),
    ('customer', 'customer', 'noun', 'a person who buys something', 'klient', 'The customer asked for help.', 2),
    ('cashier', 'cashier', 'noun', 'a person who takes your money in a store', 'kasjer', 'The cashier smiled and said hello.', 3),
    ('checkout', 'checkout', 'noun', 'the place where you pay in a store', 'kasa', 'Please go to the checkout.', 4),
    ('counter', 'counter', 'noun', 'a long table where you pay or get service', 'lada', 'The bread is behind the counter.', 5),
    ('aisle', 'aisle', 'noun', 'a passage between shelves in a store', 'alejka', 'The cereal is in aisle five.', 6),
    ('shelf', 'shelf', 'noun', 'a flat place where goods are stored', 'półka', 'The shampoo is on the top shelf.', 7),
    ('basket', 'basket', 'noun', 'a small container for shopping', 'koszyk', 'She put the apples in the basket.', 8),
    ('cart', 'cart', 'noun', 'a wheeled container for shopping', 'wózek', 'He pushed the cart to the checkout.', 9),
    ('price', 'price', 'noun', 'the amount of money something costs', 'cena', 'The price is too high.', 10),
    ('discount', 'discount', 'noun', 'a lower price for something', 'zniżka', 'There is a discount on shoes.', 11),
    ('receipt', 'receipt', 'noun', 'a paper that shows you paid', 'paragon', 'Keep the receipt, please.', 12),
    ('change', 'change', 'noun', 'the money you get back after paying', 'reszta', 'Here is your change.', 13),
    ('payment', 'payment', 'noun', 'the act of paying money', 'płatność', 'Card payment is accepted.', 14),
    ('cash', 'cash', 'noun', 'money in coins or notes', 'gotówka', 'I paid in cash.', 15),
    ('card', 'card', 'noun', 'a bank card used to pay', 'karta', 'Do you want to pay by card?', 16),
    ('refund', 'refund', 'noun', 'money returned after you give something back', 'zwrot pieniędzy', 'You can ask for a refund.', 17),
    ('return', 'return', 'noun', 'the act of giving something back to a store', 'zwrot', 'You can return the item within 14 days.', 18),
    ('bag', 'bag', 'noun', 'a container for carrying shopping', 'torba', 'Do you need a bag?', 19)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'shopping', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('store', 'store', 'noun', 'a place where you buy things', 'sklep', 'I went to the store to buy milk.', 1),
    ('customer', 'customer', 'noun', 'a person who buys something', 'klient', 'The customer asked for help.', 2),
    ('cashier', 'cashier', 'noun', 'a person who takes your money in a store', 'kasjer', 'The cashier smiled and said hello.', 3),
    ('checkout', 'checkout', 'noun', 'the place where you pay in a store', 'kasa', 'Please go to the checkout.', 4),
    ('counter', 'counter', 'noun', 'a long table where you pay or get service', 'lada', 'The bread is behind the counter.', 5),
    ('aisle', 'aisle', 'noun', 'a passage between shelves in a store', 'alejka', 'The cereal is in aisle five.', 6),
    ('shelf', 'shelf', 'noun', 'a flat place where goods are stored', 'półka', 'The shampoo is on the top shelf.', 7),
    ('basket', 'basket', 'noun', 'a small container for shopping', 'koszyk', 'She put the apples in the basket.', 8),
    ('cart', 'cart', 'noun', 'a wheeled container for shopping', 'wózek', 'He pushed the cart to the checkout.', 9),
    ('price', 'price', 'noun', 'the amount of money something costs', 'cena', 'The price is too high.', 10),
    ('discount', 'discount', 'noun', 'a lower price for something', 'zniżka', 'There is a discount on shoes.', 11),
    ('receipt', 'receipt', 'noun', 'a paper that shows you paid', 'paragon', 'Keep the receipt, please.', 12),
    ('change', 'change', 'noun', 'the money you get back after paying', 'reszta', 'Here is your change.', 13),
    ('payment', 'payment', 'noun', 'the act of paying money', 'płatność', 'Card payment is accepted.', 14),
    ('cash', 'cash', 'noun', 'money in coins or notes', 'gotówka', 'I paid in cash.', 15),
    ('card', 'card', 'noun', 'a bank card used to pay', 'karta', 'Do you want to pay by card?', 16),
    ('refund', 'refund', 'noun', 'money returned after you give something back', 'zwrot pieniędzy', 'You can ask for a refund.', 17),
    ('return', 'return', 'noun', 'the act of giving something back to a store', 'zwrot', 'You can return the item within 14 days.', 18),
    ('bag', 'bag', 'noun', 'a container for carrying shopping', 'torba', 'Do you need a bag?', 19)
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
    ('store', 'store', 'noun', 'a place where you buy things', 'sklep', 'I went to the store to buy milk.', 1),
    ('customer', 'customer', 'noun', 'a person who buys something', 'klient', 'The customer asked for help.', 2),
    ('cashier', 'cashier', 'noun', 'a person who takes your money in a store', 'kasjer', 'The cashier smiled and said hello.', 3),
    ('checkout', 'checkout', 'noun', 'the place where you pay in a store', 'kasa', 'Please go to the checkout.', 4),
    ('counter', 'counter', 'noun', 'a long table where you pay or get service', 'lada', 'The bread is behind the counter.', 5),
    ('aisle', 'aisle', 'noun', 'a passage between shelves in a store', 'alejka', 'The cereal is in aisle five.', 6),
    ('shelf', 'shelf', 'noun', 'a flat place where goods are stored', 'półka', 'The shampoo is on the top shelf.', 7),
    ('basket', 'basket', 'noun', 'a small container for shopping', 'koszyk', 'She put the apples in the basket.', 8),
    ('cart', 'cart', 'noun', 'a wheeled container for shopping', 'wózek', 'He pushed the cart to the checkout.', 9),
    ('price', 'price', 'noun', 'the amount of money something costs', 'cena', 'The price is too high.', 10),
    ('discount', 'discount', 'noun', 'a lower price for something', 'zniżka', 'There is a discount on shoes.', 11),
    ('receipt', 'receipt', 'noun', 'a paper that shows you paid', 'paragon', 'Keep the receipt, please.', 12),
    ('change', 'change', 'noun', 'the money you get back after paying', 'reszta', 'Here is your change.', 13),
    ('payment', 'payment', 'noun', 'the act of paying money', 'płatność', 'Card payment is accepted.', 14),
    ('cash', 'cash', 'noun', 'money in coins or notes', 'gotówka', 'I paid in cash.', 15),
    ('card', 'card', 'noun', 'a bank card used to pay', 'karta', 'Do you want to pay by card?', 16),
    ('refund', 'refund', 'noun', 'money returned after you give something back', 'zwrot pieniędzy', 'You can ask for a refund.', 17),
    ('return', 'return', 'noun', 'the act of giving something back to a store', 'zwrot', 'You can return the item within 14 days.', 18),
    ('bag', 'bag', 'noun', 'a container for carrying shopping', 'torba', 'Do you need a bag?', 19)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id and le.example_en = w.example_en
);

commit;
