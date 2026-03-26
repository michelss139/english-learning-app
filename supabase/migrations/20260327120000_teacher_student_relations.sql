-- Minimal teacher ↔ student roster (profiles.id aligns with auth.users.id)

create table if not exists public.teacher_student_relations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint teacher_student_relations_teacher_student_unique unique (teacher_id, student_id),
  constraint teacher_student_relations_no_self check (teacher_id <> student_id)
);

create index if not exists idx_teacher_student_relations_teacher
  on public.teacher_student_relations (teacher_id);

create index if not exists idx_teacher_student_relations_student
  on public.teacher_student_relations (student_id);

alter table public.teacher_student_relations enable row level security;

create policy "Teachers insert own teacher_student_relations"
  on public.teacher_student_relations
  for insert
  to authenticated
  with check (auth.uid() = teacher_id);

create policy "Teachers select own teacher_student_relations"
  on public.teacher_student_relations
  for select
  to authenticated
  using (auth.uid() = teacher_id);

create policy "Students select where they are student"
  on public.teacher_student_relations
  for select
  to authenticated
  using (auth.uid() = student_id);
