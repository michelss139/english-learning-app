# Vocab Packs (SQL guide)

Packs are sense-based (`lexicon_senses`) and live in:
- `vocab_packs`
- `vocab_pack_items`

## Schema (vocab_packs)

| Kolumna | Typ | Uwagi |
|---------|-----|-------|
| slug | text | unique |
| title | text | |
| description | text | nullable |
| is_published | boolean | default false |
| order_index | int | default 0 |
| vocab_mode | text | 'daily' \| 'mixed' \| 'precise', default 'mixed' |
| category | text | default 'general' |

## Sposoby tworzenia packów

### 1. Content pipeline (zalecane)

- `scripts/content-pipeline/build-pack.ts` – buduje pack z nouns (generate-nouns → import-nouns → vocab_packs/vocab_pack_items)
- Użycie: `npm run build:pack <category> <subcategory> <mode> [--publish]`
- Przykład: `npm run build:pack garden plants daily --publish`
- `scripts/content-pipeline/generate-nouns.ts`, `import-nouns.ts` – pipeline dla rzeczowników

### 2. Ręczne SQL (shop, home, transport, body, contracts)

Batch scripts w `scripts/`:
- `shop_pack_lexicon_import.sql`, `shop_pack_items.sql`
- `home_packs_lexicon_import.sql`, `home_pack_items.sql`
- `transport_packs_lexicon_import.sql`, `transport_pack_items.sql`
- `body_packs_lexicon_import.sql`, `body_pack_items.sql`
- `contracts_packs_lexicon_import.sql`, `contracts_pack_items.sql`
- `generate_shop_pack_sql.js` – regeneruje SQL dla shop pack

## Add a new pack

```sql
insert into vocab_packs (slug, title, description, is_published, order_index, vocab_mode, category)
values ('travel', 'W podróży', 'Słówka przydatne w podróży.', true, 2, 'mixed', 'general')
on conflict (slug) do nothing;
```

## Batch import new words (lexicon)

Use a batch import like `scripts/shop_pack_lexicon_import.sql`:
- Inserts `lexicon_entries` (lemma_norm, pos).
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
