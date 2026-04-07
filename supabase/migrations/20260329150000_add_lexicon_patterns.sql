-- Usage / collocation patterns per lexicon sense (e.g. verb + common frames)

begin;

create table if not exists public.lexicon_patterns (
  id uuid primary key default gen_random_uuid(),
  sense_id uuid not null references public.lexicon_senses(id) on delete cascade,
  pattern text not null,
  created_at timestamptz not null default now(),
  constraint lexicon_patterns_sense_pattern_unique unique (sense_id, pattern)
);

create index if not exists idx_lexicon_patterns_sense_id on public.lexicon_patterns(sense_id);

alter table public.lexicon_patterns enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lexicon_patterns' and policyname = 'Lexicon patterns: authenticated select'
  ) then
    create policy "Lexicon patterns: authenticated select"
      on public.lexicon_patterns
      for select
      using (auth.uid() is not null);
  end if;
end
$$;

commit;
