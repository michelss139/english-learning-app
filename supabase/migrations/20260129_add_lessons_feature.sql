-- Lessons feature
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  lesson_date date not null,
  topic text not null,
  summary text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safety: if lessons table existed without expected columns
alter table if exists lessons
  add column if not exists student_id uuid,
  add column if not exists created_by uuid,
  add column if not exists lesson_date date,
  add column if not exists topic text,
  add column if not exists summary text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table if exists lessons
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lessons_student_id_fkey'
  ) then
    alter table lessons
      add constraint lessons_student_id_fkey
      foreign key (student_id) references profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'lessons_created_by_fkey'
  ) then
    alter table lessons
      add constraint lessons_created_by_fkey
      foreign key (created_by) references profiles(id) on delete cascade;
  end if;
end
$$;

create index if not exists idx_lessons_student_date on lessons(student_id, lesson_date desc);

create table if not exists lesson_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  author_role text not null check (author_role in ('student', 'admin')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lesson_notes_lesson_created on lesson_notes(lesson_id, created_at desc);

create table if not exists lesson_assignments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  exercise_type text not null check (exercise_type in ('pack', 'cluster', 'irregular')),
  context_slug text not null,
  params jsonb not null default '{}'::jsonb,
  due_date date null,
  status text not null default 'assigned' check (status in ('assigned', 'done', 'skipped')),
  completed_session_id text null,
  completed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lesson_assignments_lesson_status on lesson_assignments(lesson_id, status);

alter table lessons enable row level security;
alter table lesson_notes enable row level security;
alter table lesson_assignments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lessons' and policyname = 'Lessons select own or admin'
  ) then
    create policy "Lessons select own or admin"
      on lessons
      for select
      using (auth.uid() = student_id or exists (
        select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
      ));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lessons' and policyname = 'Lessons insert own or admin'
  ) then
    create policy "Lessons insert own or admin"
      on lessons
      for insert
      with check (auth.uid() = student_id or exists (
        select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
      ));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lessons' and policyname = 'Lessons update own or admin'
  ) then
    create policy "Lessons update own or admin"
      on lessons
      for update
      using (auth.uid() = student_id or exists (
        select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
      ))
      with check (auth.uid() = student_id or exists (
        select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
      ));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lessons' and policyname = 'Lessons delete own or admin'
  ) then
    create policy "Lessons delete own or admin"
      on lessons
      for delete
      using (auth.uid() = student_id or exists (
        select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
      ));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_notes' and policyname = 'Lesson notes select own or admin'
  ) then
    create policy "Lesson notes select own or admin"
      on lesson_notes
      for select
      using (
        exists (
          select 1 from lessons l
          where l.id = lesson_notes.lesson_id
            and (l.student_id = auth.uid()
              or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_notes' and policyname = 'Lesson notes insert own or admin'
  ) then
    create policy "Lesson notes insert own or admin"
      on lesson_notes
      for insert
      with check (
        exists (
          select 1 from lessons l
          where l.id = lesson_notes.lesson_id
            and (l.student_id = auth.uid()
              or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_notes' and policyname = 'Lesson notes update own or admin'
  ) then
    create policy "Lesson notes update own or admin"
      on lesson_notes
      for update
      using (
        exists (
          select 1 from lessons l
          where l.id = lesson_notes.lesson_id
            and (l.student_id = auth.uid()
              or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
        )
      )
      with check (
        exists (
          select 1 from lessons l
          where l.id = lesson_notes.lesson_id
            and (l.student_id = auth.uid()
              or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_notes' and policyname = 'Lesson notes delete own or admin'
  ) then
    create policy "Lesson notes delete own or admin"
      on lesson_notes
      for delete
      using (
        exists (
          select 1 from lessons l
          where l.id = lesson_notes.lesson_id
            and (l.student_id = auth.uid()
              or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_assignments' and policyname = 'Lesson assignments select own or admin'
  ) then
    create policy "Lesson assignments select own or admin"
      on lesson_assignments
      for select
      using (
        exists (
          select 1 from lessons l
          where l.id = lesson_assignments.lesson_id
            and (l.student_id = auth.uid()
              or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_assignments' and policyname = 'Lesson assignments insert own or admin'
  ) then
    create policy "Lesson assignments insert own or admin"
      on lesson_assignments
      for insert
      with check (
        exists (
          select 1 from lessons l
          where l.id = lesson_assignments.lesson_id
            and (l.student_id = auth.uid()
              or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_assignments' and policyname = 'Lesson assignments update own or admin'
  ) then
    create policy "Lesson assignments update own or admin"
      on lesson_assignments
      for update
      using (
        exists (
          select 1 from lessons l
          where l.id = lesson_assignments.lesson_id
            and (l.student_id = auth.uid()
              or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
        )
      )
      with check (
        exists (
          select 1 from lessons l
          where l.id = lesson_assignments.lesson_id
            and (l.student_id = auth.uid()
              or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_assignments' and policyname = 'Lesson assignments delete own or admin'
  ) then
    create policy "Lesson assignments delete own or admin"
      on lesson_assignments
      for delete
      using (
        exists (
          select 1 from lessons l
          where l.id = lesson_assignments.lesson_id
            and (l.student_id = auth.uid()
              or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
        )
      );
  end if;
end
$$;
