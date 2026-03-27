-- Micro training: teacher-entered EN|PL lines per lesson (isolated from vocab pool / knowledge).
alter table public.lessons
  add column if not exists vocab_pairs text;

comment on column public.lessons.vocab_pairs is 'Optional newline-separated pairs: english - polish (space-hyphen-space)';
