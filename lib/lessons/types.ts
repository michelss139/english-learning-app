/**
 * Row shape for `public.lessons` in the tutoring / private-lessons feature
 * (student_id, lesson_date, topic, …). Not the video-course lesson entity.
 */
export type Lesson = {
  id: string;
  student_id: string;
  created_by: string;
  lesson_date: string;
  topic: string;
  summary: string | null;
  teacher_note: string | null;
  student_note: string | null;
  /** Comma-separated irregular verb base forms (DB-known only, normalized on save). */
  irregular_verbs?: string | null;
  created_at: string;
  updated_at: string;
};
