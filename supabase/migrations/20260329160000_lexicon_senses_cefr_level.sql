-- CEFR band per sense (e.g. from AI enrichment pipelines)

alter table public.lexicon_senses
  add column if not exists cefr_level text;

comment on column public.lexicon_senses.cefr_level is 'CEFR difficulty for this sense: A1–C1';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lexicon_senses_cefr_level_check'
  ) then
    alter table public.lexicon_senses
      add constraint lexicon_senses_cefr_level_check
      check (cefr_level is null or cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1'));
  end if;
end$$;
