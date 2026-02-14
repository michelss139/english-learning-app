begin;

alter table if exists vocab_packs
  add column if not exists vocab_mode text not null default 'mixed',
  add column if not exists category text not null default 'general';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vocab_packs_vocab_mode_check'
  ) then
    alter table vocab_packs
      add constraint vocab_packs_vocab_mode_check
      check (vocab_mode in ('daily', 'mixed', 'precise'));
  end if;
end $$;

update vocab_packs
set vocab_mode = 'mixed'
where vocab_mode is null;

create index if not exists idx_vocab_packs_mode_published
  on vocab_packs(vocab_mode, is_published, order_index);

commit;
