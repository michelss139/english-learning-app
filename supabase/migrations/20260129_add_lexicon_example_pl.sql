begin;

alter table if exists lexicon_examples
  add column if not exists example_pl text;

commit;
