import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type AuthContext =
  | {
      supabase: ReturnType<typeof createSupabaseAdmin>;
      userId: string;
      role: string;
    }
  | { error: NextResponse };

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
    .select("id, student_id")
    .eq("id", lessonId)
    .not("student_id", "is", null)
    .maybeSingle();

  if (lessonErr) {
    return { error: NextResponse.json({ error: lessonErr.message }, { status: 500 }) };
  }

  if (!lesson) {
    return { error: NextResponse.json({ error: "Tutoring lesson not found" }, { status: 404 }) };
  }

  if (role !== "admin" && lesson.student_id !== userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }

  return { lesson };
}
