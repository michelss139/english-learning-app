import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type CompleteAssignmentBody = {
  session_id: string;
  exercise_type: "pack" | "cluster" | "irregular";
  context_slug?: string;
};

export async function POST(req: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const { assignmentId } = await params;

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userData.user.id;
    const body = (await req.json().catch(() => null)) as CompleteAssignmentBody | null;

    if (!body?.session_id || !body?.exercise_type) {
      return NextResponse.json({ error: "session_id and exercise_type are required" }, { status: 400 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: assignment, error: assignmentErr } = await supabase
      .from("lesson_assignments")
      .select("id, lesson_id, exercise_type, context_slug, status, completed_session_id")
      .eq("id", assignmentId)
      .maybeSingle();

    if (assignmentErr) {
      return NextResponse.json({ error: assignmentErr.message }, { status: 500 });
    }

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("id, student_id")
      .eq("id", assignment.lesson_id)
      .maybeSingle();

    if (lessonErr) {
      return NextResponse.json({ error: lessonErr.message }, { status: 500 });
    }

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (profile.role !== "admin" && lesson.student_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (assignment.exercise_type !== body.exercise_type) {
      return NextResponse.json({ error: "Exercise type mismatch" }, { status: 400 });
    }

    if (body.context_slug && assignment.context_slug !== body.context_slug) {
      return NextResponse.json({ error: "Context slug mismatch" }, { status: 400 });
    }

    const { data: completion, error: completionErr } = await supabase
      .from("exercise_session_completions")
      .select("id")
      .eq("student_id", lesson.student_id)
      .eq("exercise_type", body.exercise_type)
      .eq("session_id", body.session_id)
      .maybeSingle();

    if (completionErr) {
      return NextResponse.json({ error: completionErr.message }, { status: 500 });
    }

    if (!completion) {
      return NextResponse.json({ error: "Completion not found for session" }, { status: 400 });
    }

    if (assignment.status === "done" && assignment.completed_session_id === body.session_id) {
      return NextResponse.json({ ok: true, assignment });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("lesson_assignments")
      .update({
        status: "done",
        completed_session_id: body.session_id,
        completed_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .select("id, lesson_id, exercise_type, context_slug, status, completed_session_id, completed_at")
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, assignment: updated });
  } catch (e: any) {
    console.error("[lessons/assignments/:id/complete] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
