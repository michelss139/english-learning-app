import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const LESSON_API_ROW_SELECT =
  "id, student_id, created_by, lesson_type, lesson_date, topic, summary, teacher_note, student_note, irregular_verbs, vocab_pairs, created_at, updated_at";

export type LessonAccessRow = {
  student_id: string;
  created_by: string;
};

export type AuthContext =
  | {
      supabase: ReturnType<typeof createSupabaseAdmin>;
      userId: string;
      role: string;
    }
  | { error: NextResponse };

export async function teacherStudentRelationExists(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  teacherId: string,
  studentId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("teacher_student_relations")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data != null;
}

/** Lesson visibility: admin, student on lesson, author, or teacher linked to that student. */
export async function userHasLessonAccess(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lesson: LessonAccessRow,
  userId: string,
  role: string
): Promise<boolean> {
  if (role === "admin") return true;
  if (lesson.student_id === userId) return true;
  if (lesson.created_by === userId) return true;
  return teacherStudentRelationExists(supabase, userId, lesson.student_id);
}

function lessonRowToAccessFields(lesson: Record<string, unknown>): LessonAccessRow | null {
  const student_id = lesson.student_id;
  const created_by = lesson.created_by;
  if (typeof student_id !== "string" || typeof created_by !== "string") return null;
  return { student_id, created_by };
}

export async function ensureLessonAccess(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lessonId: string,
  userId: string,
  role: string,
  select: string = LESSON_API_ROW_SELECT
): Promise<{ lesson: Record<string, unknown> } | { error: NextResponse }> {
  const { data: lesson, error: lessonErr } = await supabase
    .from("lessons")
    .select(select)
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonErr) {
    return { error: NextResponse.json({ error: lessonErr.message }, { status: 500 }) };
  }

  if (!lesson) {
    return { error: NextResponse.json({ error: "Lesson not found" }, { status: 404 }) };
  }

  const lessonRecord = lesson as unknown as Record<string, unknown>;
  const row = lessonRowToAccessFields(lessonRecord);
  if (!row) {
    return { error: NextResponse.json({ error: "Lesson record incomplete" }, { status: 500 }) };
  }
  if (!(await userHasLessonAccess(supabase, row, userId, role))) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }

  return { lesson: lessonRecord };
}

export async function assertCanCreateLessonForStudent(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  createdBy: string,
  studentId: string,
  isAdmin: boolean
): Promise<{ ok: true } | { error: NextResponse }> {
  if (isAdmin) return { ok: true };
  if (createdBy === studentId) return { ok: true };
  const linked = await teacherStudentRelationExists(supabase, createdBy, studentId);
  if (!linked) {
    return {
      error: NextResponse.json(
        { error: "No teacher–student relation for this student. Assign the student first." },
        { status: 403 }
      ),
    };
  }
  return { ok: true };
}

/** PostgREST `.or()` filter for listing lessons/calendar as non-admin. */
export function lessonsListVisibilityOrFilter(userId: string, rosterStudentIds: string[]): string {
  const parts = [`student_id.eq.${userId}`, `created_by.eq.${userId}`];
  const ids = [...new Set(rosterStudentIds)].filter((id) => id.length > 0);
  if (ids.length > 0) {
    parts.push(`student_id.in.(${ids.join(",")})`);
  }
  return parts.join(",");
}

export async function getAuthContext(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) {
    return { error: NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 }) };
  }

  const supabase = createSupabaseAdmin();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const userId = userData.user.id;
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr || !profile) {
    return { error: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
  }

  return { supabase, userId, role: profile.role };
}

export async function ensureTutoringLessonAccess(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lessonId: string,
  userId: string,
  role: string
) {
  const { data: lesson, error: lessonErr } = await supabase
    .from("lessons")
    .select("id, student_id, created_by")
    .eq("id", lessonId)
    .not("student_id", "is", null)
    .maybeSingle();

  if (lessonErr) {
    return { error: NextResponse.json({ error: lessonErr.message }, { status: 500 }) };
  }

  if (!lesson) {
    return { error: NextResponse.json({ error: "Tutoring lesson not found" }, { status: 404 }) };
  }

  const lessonRecord = lesson as unknown as Record<string, unknown>;
  const row = lessonRowToAccessFields(lessonRecord);
  if (!row) {
    return { error: NextResponse.json({ error: "Lesson record incomplete" }, { status: 500 }) };
  }
  if (!(await userHasLessonAccess(supabase, row, userId, role))) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }

  return { lesson: lessonRecord };
}
