-- Flags lexicon verb entries that fail GPT quality checks (validate-verbs script)

alter table public.lexicon_entries
  add column if not exists flagged_for_review boolean not null default false;

comment on column public.lexicon_entries.flagged_for_review is 'True when validate-verbs marks the entry as weak or inappropriate for learners.';

create index if not exists idx_lexicon_entries_flagged_for_review
  on public.lexicon_entries (flagged_for_review)
  where flagged_for_review = true;
