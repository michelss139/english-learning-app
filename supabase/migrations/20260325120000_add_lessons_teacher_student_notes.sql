-- Tutoring `lessons` table: optional inline notes (separate from lesson_notes thread)
begin;

alter table public.lessons
  add column if not exists teacher_note text null,
  add column if not exists student_note text null;

commit;
