-- Migration: User Vocab Tables (Vocabulary Rebuild - Step 2)
-- Creates user_vocab_items and lesson_vocab_items
-- Date: 2025-02-23
--
-- user_vocab_items = user's vocabulary pool (references lexicon senses or custom words)
-- lesson_vocab_items = pins words from pool to lessons (lessons don't create words)

-- ============================================
-- TABLE: user_vocab_items (user's vocabulary pool)
-- ============================================
create table if not exists user_vocab_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  
  -- Reference to lexicon sense (nullable for custom/unverified words)
  sense_id uuid references lexicon_senses(id) on delete set null,
  
  -- User notes (optional)
  notes text,
  
  -- Status (optional, e.g., 'learning', 'review', 'mastered')
  status text,
  
  -- Source: 'lexicon' (from AI enrichment) or 'custom' (user-created, unverified)
  source text not null default 'lexicon',
  
  -- Verified: true for lexicon words, false for custom words
  verified boolean not null default true,
  
  -- Custom fields (only used when source='custom' and sense_id is null)
  custom_lemma text, -- user-entered lemma (normalized)
  custom_translation_pl text, -- user-entered translation (optional)
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints
  constraint user_vocab_items_source_check check (source in ('lexicon', 'custom')),
  constraint user_vocab_items_custom_check check (
    (source = 'custom' and sense_id is null) or
    (source = 'lexicon' and sense_id is not null)
  )
);

create index if not exists idx_user_vocab_items_student_id on user_vocab_items(student_id);
create index if not exists idx_user_vocab_items_sense_id on user_vocab_items(sense_id);
create index if not exists idx_user_vocab_items_source on user_vocab_items(source);
create index if not exists idx_user_vocab_items_created_at on user_vocab_items(created_at);

-- ============================================
-- TABLE: lesson_vocab_items (pins words from pool to lessons)
-- ============================================
create table if not exists lesson_vocab_items (
  id uuid primary key default gen_random_uuid(),
  student_lesson_id uuid not null references student_lessons(id) on delete cascade,
  user_vocab_item_id uuid not null references user_vocab_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  
  -- Prevent duplicate pins (same word in same lesson)
  constraint lesson_vocab_items_unique unique (student_lesson_id, user_vocab_item_id)
);

create index if not exists idx_lesson_vocab_items_lesson_id on lesson_vocab_items(student_lesson_id);
create index if not exists idx_lesson_vocab_items_vocab_item_id on lesson_vocab_items(user_vocab_item_id);
create index if not exists idx_lesson_vocab_items_created_at on lesson_vocab_items(created_at);

-- ============================================
-- RLS POLICIES
-- ============================================

alter table user_vocab_items enable row level security;
alter table lesson_vocab_items enable row level security;

-- user_vocab_items: Student sees own, admin sees all
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_vocab_items' and policyname = 'User vocab items: student select own'
  ) then
    create policy "User vocab items: student select own"
      on user_vocab_items
      for select
      using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_vocab_items' and policyname = 'User vocab items: student insert own'
  ) then
    create policy "User vocab items: student insert own"
      on user_vocab_items
      for insert
      with check (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_vocab_items' and policyname = 'User vocab items: student update own'
  ) then
    create policy "User vocab items: student update own"
      on user_vocab_items
      for update
      using (auth.uid() = student_id)
      with check (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_vocab_items' and policyname = 'User vocab items: student delete own'
  ) then
    create policy "User vocab items: student delete own"
      on user_vocab_items
      for delete
      using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_vocab_items' and policyname = 'User vocab items: admin select all'
  ) then
    create policy "User vocab items: admin select all"
      on user_vocab_items
      for select
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_vocab_items' and policyname = 'User vocab items: admin manage all'
  ) then
    create policy "User vocab items: admin manage all"
      on user_vocab_items
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end
$$;

-- lesson_vocab_items: Student sees own (via lesson), admin sees all
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_vocab_items' and policyname = 'Lesson vocab items: student select own'
  ) then
    create policy "Lesson vocab items: student select own"
      on lesson_vocab_items
      for select
      using (
        exists (
          select 1 from student_lessons sl
          where sl.id = lesson_vocab_items.student_lesson_id
          and sl.student_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_vocab_items' and policyname = 'Lesson vocab items: student insert own'
  ) then
    create policy "Lesson vocab items: student insert own"
      on lesson_vocab_items
      for insert
      with check (
        exists (
          select 1 from student_lessons sl
          where sl.id = lesson_vocab_items.student_lesson_id
          and sl.student_id = auth.uid()
        )
        and
        exists (
          select 1 from user_vocab_items uvi
          where uvi.id = lesson_vocab_items.user_vocab_item_id
          and uvi.student_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_vocab_items' and policyname = 'Lesson vocab items: student delete own'
  ) then
    create policy "Lesson vocab items: student delete own"
      on lesson_vocab_items
      for delete
      using (
        exists (
          select 1 from student_lessons sl
          where sl.id = lesson_vocab_items.student_lesson_id
          and sl.student_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_vocab_items' and policyname = 'Lesson vocab items: admin select all'
  ) then
    create policy "Lesson vocab items: admin select all"
      on lesson_vocab_items
      for select
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lesson_vocab_items' and policyname = 'Lesson vocab items: admin manage all'
  ) then
    create policy "Lesson vocab items: admin manage all"
      on lesson_vocab_items
      using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end
$$;
