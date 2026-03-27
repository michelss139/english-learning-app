-- Distinguish teacher-led lessons from a student's own calendar slots.

alter table public.lessons
  add column lesson_type text not null default 'teacher'
    constraint lessons_lesson_type_check check (lesson_type in ('teacher', 'self'));

comment on column public.lessons.lesson_type is
  'teacher: author is teacher/admin slot for a student; self: student own practice slot (student_id = created_by).';

-- Backfill: osobisty wpis ucznia (ten sam user), ale nie slot nauczyciela z relacji.
update public.lessons l
set lesson_type = 'self'
where l.student_id = l.created_by
  and not exists (
    select 1
    from public.teacher_student_relations r
    where r.teacher_id = l.created_by
  );
