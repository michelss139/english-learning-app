import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type UpdateAssignmentBody = {
  status?: "assigned" | "done" | "skipped";
  due_date?: string | null;
  params?: Record<string, any>;
};

async function getAuthContext(req: Request) {
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

async function ensureAssignmentAccess(
  supabase: any,
  assignmentId: string,
  userId: string,
  role: string
) {
  const { data: assignment, error: assignmentErr } = await supabase
    .from("lesson_assignments")
    .select("id, lesson_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentErr) {
    return { error: NextResponse.json({ error: assignmentErr.message }, { status: 500 }) };
  }

  if (!assignment) {
    return { error: NextResponse.json({ error: "Assignment not found" }, { status: 404 }) };
  }

  const { data: lesson, error: lessonErr } = await supabase
    .from("lessons")
    .select("id, student_id")
    .eq("id", assignment.lesson_id)
    .maybeSingle();

  if (lessonErr) {
    return { error: NextResponse.json({ error: lessonErr.message }, { status: 500 }) };
  }

  if (!lesson) {
    return { error: NextResponse.json({ error: "Lesson not found" }, { status: 404 }) };
  }

  if (role !== "admin" && lesson.student_id !== userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }

  return { lesson };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const { assignmentId } = await params;
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const access = await ensureAssignmentAccess(supabase, assignmentId, userId, role);
    if ("error" in access) return access.error;

    const body = (await req.json().catch(() => null)) as UpdateAssignmentBody | null;
    if (!body || (!body.status && body.due_date === undefined && body.params === undefined)) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (body.status) updates.status = body.status;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.params !== undefined) updates.params = body.params ?? {};

    const { data: assignment, error: updateErr } = await supabase
      .from("lesson_assignments")
      .update(updates)
      .eq("id", assignmentId)
      .select(
        "id, lesson_id, exercise_type, context_slug, params, due_date, status, completed_session_id, completed_at, created_at"
      )
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, assignment });
  } catch (e: any) {
    console.error("[lessons/assignments/:id] PATCH error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
