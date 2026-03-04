import { NextResponse } from "next/server";
import { ensureTutoringLessonAccess, getAuthContext } from "@/app/api/lessons/_helpers";

type CreateTeacherCommentBody = {
  lesson_id?: string;
  content?: string;
};

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const { searchParams } = new URL(req.url);
    const lessonId = (searchParams.get("lesson_id") ?? "").trim();

    if (!lessonId) {
      return NextResponse.json({ error: "lesson_id is required" }, { status: 400 });
    }

    const access = await ensureTutoringLessonAccess(supabase, lessonId, userId, role);
    if ("error" in access) return access.error;

    const { data, error } = await supabase
      .from("lesson_teacher_comments")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, comments: data ?? [] });
  } catch (e: any) {
    console.error("[lessons/teacher-comment] GET error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    if (role !== "admin") {
      return NextResponse.json({ error: "Only teacher can add comments" }, { status: 403 });
    }
    const body = (await req.json().catch(() => null)) as CreateTeacherCommentBody | null;

    if (!body?.lesson_id || !body?.content?.trim()) {
      return NextResponse.json({ error: "lesson_id and content are required" }, { status: 400 });
    }

    const access = await ensureTutoringLessonAccess(supabase, body.lesson_id, userId, role);
    if ("error" in access) return access.error;

    const { data, error } = await supabase
      .from("lesson_teacher_comments")
      .insert({
        lesson_id: body.lesson_id,
        teacher_id: userId,
        content: body.content.trim(),
      })
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, comment: data });
  } catch (e: any) {
    console.error("[lessons/teacher-comment] POST error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
