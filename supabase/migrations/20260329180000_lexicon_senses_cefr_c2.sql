-- Allow C2 in cefr_level (noun enrichment and future pipelines)

alter table public.lexicon_senses drop constraint if exists lexicon_senses_cefr_level_check;

alter table public.lexicon_senses
  add constraint lexicon_senses_cefr_level_check
  check (cefr_level is null or cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

comment on column public.lexicon_senses.cefr_level is 'CEFR difficulty for this sense: A1–C2';
