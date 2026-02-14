import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type CreateLessonBody = {
  student_id?: string;
  lesson_date: string;
  topic: string;
  summary?: string | null;
};

export async function GET(req: Request) {
  try {
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
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const studentIdParam = searchParams.get("student_id");
    const studentId = profile.role === "admin" && studentIdParam ? studentIdParam : userId;

    const { data: lessons, error: lessonsErr } = await supabase
      .from("lessons")
      .select("id, student_id, created_by, lesson_date, topic, summary, created_at, updated_at")
      .eq("student_id", studentId)
      .order("lesson_date", { ascending: false });

    if (lessonsErr) {
      return NextResponse.json({ error: lessonsErr.message }, { status: 500 });
    }

    const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
    let assignmentCounts: Record<string, { assigned: number; done: number }> = {};

    if (lessonIds.length > 0) {
      const { data: assignments, error: assignmentsErr } = await supabase
        .from("lesson_assignments")
        .select("lesson_id, status")
        .in("lesson_id", lessonIds);

      if (assignmentsErr) {
        return NextResponse.json({ error: assignmentsErr.message }, { status: 500 });
      }

      assignmentCounts = (assignments ?? []).reduce((acc: any, row: any) => {
        if (!acc[row.lesson_id]) {
          acc[row.lesson_id] = { assigned: 0, done: 0 };
        }
        if (row.status === "done") acc[row.lesson_id].done += 1;
        if (row.status === "assigned") acc[row.lesson_id].assigned += 1;
        return acc;
      }, {});
    }

    const hydratedLessons = (lessons ?? []).map((lesson: any) => ({
      ...lesson,
      assignment_counts: assignmentCounts[lesson.id] ?? { assigned: 0, done: 0 },
    }));

    return NextResponse.json({ ok: true, lessons: hydratedLessons });
  } catch (e: any) {
    console.error("[lessons] GET error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
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
    const body = (await req.json().catch(() => null)) as CreateLessonBody | null;

    if (!body?.lesson_date || !body?.topic) {
      return NextResponse.json({ error: "lesson_date and topic are required" }, { status: 400 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const studentId = profile.role === "admin" ? body.student_id : userId;
    if (!studentId) {
      return NextResponse.json({ error: "student_id is required for admin" }, { status: 400 });
    }

    const { data: lesson, error: insertErr } = await supabase
      .from("lessons")
      .insert({
        student_id: studentId,
        created_by: userId,
        lesson_date: body.lesson_date,
        topic: body.topic.trim(),
        summary: body.summary?.trim() || null,
      })
      .select("id, student_id, created_by, lesson_date, topic, summary, created_at, updated_at")
      .maybeSingle();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, lesson });
  } catch (e: any) {
    console.error("[lessons] POST error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
