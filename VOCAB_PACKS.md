# Vocab Packs (SQL guide)

Packs are sense-based (`lexicon_senses`) and live in:
- `vocab_packs`
- `vocab_pack_items`

Batch scripts for the "shop" pack:
- `scripts/shop_pack_lexicon_import.sql`
- `scripts/shop_pack_items.sql`
- `scripts/generate_shop_pack_sql.js` (regenerates both SQL batches)

## Add a new pack

```sql
insert into vocab_packs (slug, title, description, is_published, order_index)
values ('travel', 'W podróży', 'Słówka przydatne w podróży.', true, 2)
on conflict (slug) do nothing;
```

## Batch import new words (lexicon)

Use a batch import like `scripts/shop_pack_lexicon_import.sql`:
- Inserts `lexicon_entries` (lemma_norm).
- Creates one `lexicon_senses` row (sense_order=0).
- Adds exactly one `lexicon_translations` row (PL).
- Optionally inserts one short `lexicon_examples` sentence.

## Add items to a pack (by lemma)

Use `lexicon_entries` → `lexicon_senses` to pick a sense.

```sql
-- Example: add "ticket" (first sense) as item 1
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, 1
from vocab_packs p
join lexicon_entries e on e.lemma_norm = 'ticket'
join lexicon_senses s on s.entry_id = e.id
where p.slug = 'travel'
order by s.sense_order asc
limit 1
on conflict (pack_id, sense_id) do nothing;

-- Example: add "passport" as item 2
insert into vocab_pack_items (pack_id, sense_id, order_index)
select p.id, s.id, 2
from vocab_packs p
join lexicon_entries e on e.lemma_norm = 'passport'
join lexicon_senses s on s.entry_id = e.id
where p.slug = 'travel'
order by s.sense_order asc
limit 1
on conflict (pack_id, sense_id) do nothing;
```

## Publish/unpublish

```sql
update vocab_packs
set is_published = true
where slug = 'travel';
```
