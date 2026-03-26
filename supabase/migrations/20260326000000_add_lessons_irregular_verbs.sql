-- Teacher-assigned irregular verb lemmas for post-lesson drill (comma-separated in app layer).
alter table public.lessons
  add column if not exists irregular_verbs text null;

comment on column public.lessons.irregular_verbs is
  'Comma-separated irregular verb base forms (normalized); empty/null means none.';
