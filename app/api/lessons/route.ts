import { NextResponse } from "next/server";
import {
  assertCanCreateLessonForStudent,
  LESSON_API_ROW_SELECT,
  lessonsListVisibilityOrFilter,
} from "@/app/api/lessons/_helpers";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type CreateLessonBody = {
  student_id?: string;
  lesson_date: string;
  topic?: string;
  summary?: string | null;
  teacher_note?: string | null;
  student_note?: string | null;
};

const LESSON_ROW_SELECT = LESSON_API_ROW_SELECT;

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

    let lessonsQuery = supabase.from("lessons").select(LESSON_ROW_SELECT);

    if (profile.role === "admin") {
      const studentId = studentIdParam ?? userId;
      lessonsQuery = lessonsQuery.eq("student_id", studentId);
    } else {
      const { data: relRows, error: relErr } = await supabase
        .from("teacher_student_relations")
        .select("student_id")
        .eq("teacher_id", userId);

      if (relErr) {
        return NextResponse.json({ error: relErr.message }, { status: 500 });
      }

      const rosterIds = (relRows ?? []).map((r) => r.student_id as string);
      lessonsQuery = lessonsQuery.or(lessonsListVisibilityOrFilter(userId, rosterIds));
    }

    const { data: lessons, error: lessonsErr } = await lessonsQuery.order("lesson_date", {
      ascending: false,
    });

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

    const topicStr = typeof body?.topic === "string" ? body.topic.trim() : "";
    if (!body?.lesson_date || !topicStr) {
      return NextResponse.json(
        { error: "lesson_date and a non-empty topic are required" },
        { status: 400 },
      );
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const rawStudentId =
      typeof body.student_id === "string" ? body.student_id.trim() : "";

    if (profile.role === "admin" && !rawStudentId) {
      return NextResponse.json({ error: "student_id is required for admin" }, { status: 400 });
    }

    const studentId =
      profile.role === "admin" ? rawStudentId : rawStudentId.length > 0 ? rawStudentId : userId;

    if (!studentId) {
      return NextResponse.json(
        { error: "student_id is required (use your own id for a personal lesson)" },
        { status: 400 },
      );
    }

    const relationCheck = await assertCanCreateLessonForStudent(
      supabase,
      userId,
      studentId,
      profile.role === "admin",
    );
    if ("error" in relationCheck) return relationCheck.error;

    const { data: lesson, error: insertErr } = await supabase
      .from("lessons")
      .insert({
        student_id: studentId,
        created_by: userId,
        lesson_date: body.lesson_date,
        topic: topicStr,
        summary: body.summary?.trim() || null,
        teacher_note: body.teacher_note?.trim() || null,
        student_note: body.student_note?.trim() || null,
      })
      .select(LESSON_ROW_SELECT)
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
