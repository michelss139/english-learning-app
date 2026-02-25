-- Migration: Link irregular_verbs to lexicon_entries via entry_id
-- Date: 2026-02-20
-- Notes:
-- - Backfill is based on irregular_verbs.base_norm = lexicon_entries.lemma_norm
-- - If unmatched rows remain after backfill, entry_id stays nullable
-- - No data is deleted

begin;

-- 1) Add new nullable column
alter table public.irregular_verbs
  add column if not exists entry_id uuid;

-- 2) Add FK (idempotent guard)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'irregular_verbs_entry_id_fkey'
      and conrelid = 'public.irregular_verbs'::regclass
  ) then
    alter table public.irregular_verbs
      add constraint irregular_verbs_entry_id_fkey
      foreign key (entry_id)
      references public.lexicon_entries(id)
      on delete cascade;
  end if;
end
$$;

-- 3) Index on entry_id
create index if not exists idx_irregular_verbs_entry_id
  on public.irregular_verbs(entry_id);

-- 4) Backfill entry_id using base_norm -> lemma_norm match
--    If multiple lexicon_entries rows share the same lemma_norm,
--    choose a deterministic one (smallest UUID) to avoid nondeterministic updates.
with candidate_map as (
  select
    iv.id as irregular_id,
    (
      select le.id
      from public.lexicon_entries le
      where coalesce(le.lemma_norm, '') = coalesce(iv.base_norm, '')
      order by le.id asc
      limit 1
    ) as matched_entry_id
  from public.irregular_verbs iv
)
update public.irregular_verbs iv
set entry_id = cm.matched_entry_id
from candidate_map cm
where iv.id = cm.irregular_id
  and iv.entry_id is null
  and cm.matched_entry_id is not null;

-- 5) Conditionally enforce NOT NULL only if fully backfilled
do $$
begin
  if not exists (
    select 1
    from public.irregular_verbs iv
    where iv.entry_id is null
  ) then
    alter table public.irregular_verbs
      alter column entry_id set not null;
  else
    raise notice 'irregular_verbs.entry_id remains nullable: unmatched rows still exist after backfill.';
  end if;
end
$$;

commit;
