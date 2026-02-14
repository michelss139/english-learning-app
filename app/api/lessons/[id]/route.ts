import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type UpdateLessonBody = {
  lesson_date?: string;
  topic?: string;
  summary?: string | null;
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

async function ensureLessonAccess(
  supabase: any,
  lessonId: string,
  userId: string,
  role: string
) {
  const { data: lesson, error: lessonErr } = await supabase
    .from("lessons")
    .select("id, student_id, created_by, lesson_date, topic, summary, created_at, updated_at")
    .eq("id", lessonId)
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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const access = await ensureLessonAccess(supabase, id, userId, role);
    if ("error" in access) return access.error;

    const { data: notes, error: notesErr } = await supabase
      .from("lesson_notes")
      .select("id, lesson_id, author_id, author_role, content, created_at")
      .eq("lesson_id", id)
      .order("created_at", { ascending: true });

    if (notesErr) {
      return NextResponse.json({ error: notesErr.message }, { status: 500 });
    }

    const { data: assignments, error: assignmentsErr } = await supabase
      .from("lesson_assignments")
      .select(
        "id, lesson_id, exercise_type, context_slug, params, due_date, status, completed_session_id, completed_at, created_at"
      )
      .eq("lesson_id", id)
      .order("created_at", { ascending: true });

    if (assignmentsErr) {
      return NextResponse.json({ error: assignmentsErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      lesson: access.lesson,
      notes: notes ?? [],
      assignments: assignments ?? [],
    });
  } catch (e: any) {
    console.error("[lessons/:id] GET error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const access = await ensureLessonAccess(supabase, id, userId, role);
    if ("error" in access) return access.error;

    const body = (await req.json().catch(() => null)) as UpdateLessonBody | null;
    if (!body || (!body.lesson_date && !body.topic && body.summary === undefined)) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (body.lesson_date) updates.lesson_date = body.lesson_date;
    if (body.topic !== undefined) updates.topic = body.topic.trim();
    if (body.summary !== undefined) updates.summary = body.summary?.trim() || null;
    updates.updated_at = new Date().toISOString();

    const { data: lesson, error: updateErr } = await supabase
      .from("lessons")
      .update(updates)
      .eq("id", id)
      .select("id, student_id, created_by, lesson_date, topic, summary, created_at, updated_at")
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, lesson });
  } catch (e: any) {
    console.error("[lessons/:id] PATCH error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
