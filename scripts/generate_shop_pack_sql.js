const words = [
  { en: "store", pl: "sklep", def: "a place where you buy things", ex: "I went to the store to buy milk." },
  { en: "customer", pl: "klient", def: "a person who buys something", ex: "The customer asked for help." },
  { en: "cashier", pl: "kasjer", def: "a person who takes your money in a store", ex: "The cashier smiled and said hello." },
  { en: "checkout", pl: "kasa", def: "the place where you pay in a store", ex: "Please go to the checkout." },
  { en: "counter", pl: "lada", def: "a long table where you pay or get service", ex: "The bread is behind the counter." },
  { en: "aisle", pl: "alejka", def: "a passage between shelves in a store", ex: "The cereal is in aisle five." },
  { en: "shelf", pl: "półka", def: "a flat place where goods are stored", ex: "The shampoo is on the top shelf." },
  { en: "basket", pl: "koszyk", def: "a small container for shopping", ex: "She put the apples in the basket." },
  { en: "cart", pl: "wózek", def: "a wheeled container for shopping", ex: "He pushed the cart to the checkout." },
  { en: "price", pl: "cena", def: "the amount of money something costs", ex: "The price is too high." },
  { en: "discount", pl: "zniżka", def: "a lower price for something", ex: "There is a discount on shoes." },
  { en: "receipt", pl: "paragon", def: "a paper that shows you paid", ex: "Keep the receipt, please." },
  { en: "change", pl: "reszta", def: "the money you get back after paying", ex: "Here is your change." },
  { en: "payment", pl: "płatność", def: "the act of paying money", ex: "Card payment is accepted." },
  { en: "cash", pl: "gotówka", def: "money in coins or notes", ex: "I paid in cash." },
  { en: "card", pl: "karta", def: "a bank card used to pay", ex: "Do you want to pay by card?" },
  { en: "refund", pl: "zwrot pieniędzy", def: "money returned after you give something back", ex: "You can ask for a refund." },
  { en: "return", pl: "zwrot", def: "the act of giving something back to a store", ex: "You can return the item within 14 days." },
  { en: "bag", pl: "torba", def: "a container for carrying shopping", ex: "Do you need a bag?" },
];

const escapeSql = (value) => value.replace(/'/g, "''");

const wordValues = words
  .map((w, idx) => {
    const lemma = escapeSql(w.en.toLowerCase());
    const def = escapeSql(w.def);
    const pl = escapeSql(w.pl);
    const ex = escapeSql(w.ex);
    return `('${lemma}', '${lemma}', 'noun', '${def}', '${pl}', '${ex}', ${idx + 1})`;
  })
  .join(",\n    ");

const lexiconSql = `-- Batch import for "shop" pack lexicon data (19 nouns)
begin;

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ${wordValues}
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
    ${wordValues}
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
    ${wordValues}
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
    ${wordValues}
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
`;

const packItemsSql = `-- Add senses to vocab_pack_items for pack 'shop'
begin;

with words(lemma_norm, order_index) as (
  values
    ${words.map((w, idx) => `('${escapeSql(w.en.toLowerCase())}', ${idx + 1})`).join(",\n    ")}
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
`;

console.log("-- === LEXICON IMPORT ===");
console.log(lexiconSql);
console.log("-- === PACK ITEMS ===");
console.log(packItemsSql);
