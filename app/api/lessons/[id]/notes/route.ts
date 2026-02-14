import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type CreateNoteBody = {
  content: string;
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
    .select("id, student_id")
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const access = await ensureLessonAccess(supabase, id, userId, role);
    if ("error" in access) return access.error;

    const body = (await req.json().catch(() => null)) as CreateNoteBody | null;
    if (!body?.content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const authorRole = role === "admin" ? "admin" : "student";

    const { data: note, error: noteErr } = await supabase
      .from("lesson_notes")
      .insert({
        lesson_id: id,
        author_id: userId,
        author_role: authorRole,
        content: body.content.trim(),
      })
      .select("id, lesson_id, author_id, author_role, content, created_at")
      .maybeSingle();

    if (noteErr) {
      return NextResponse.json({ error: noteErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, note });
  } catch (e: any) {
    console.error("[lessons/:id/notes] POST error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
