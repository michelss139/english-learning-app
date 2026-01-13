import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * DELETE /api/vocab/delete-lesson
 * 
 * Delete lesson (student_lessons).
 * Also removes all lesson_vocab_items via cascade.
 */

type Body = {
  lesson_id: string;
};

export async function DELETE(req: Request) {
  try {
    // Auth: verify JWT token
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

    const body = (await req.json().catch(() => null)) as Body | null;
    const lesson_id = body?.lesson_id;

    if (!lesson_id) {
      return NextResponse.json({ error: "lesson_id is required" }, { status: 400 });
    }

    // Verify ownership
    const { data: lesson, error: checkErr } = await supabase
      .from("student_lessons")
      .select("id, student_id")
      .eq("id", lesson_id)
      .maybeSingle();

    if (checkErr) {
      return NextResponse.json({ error: `Failed to verify lesson: ${checkErr.message}` }, { status: 500 });
    }

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (lesson.student_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete (cascade will remove from lesson_vocab_items)
    const { error: deleteErr } = await supabase.from("student_lessons").delete().eq("id", lesson_id);

    if (deleteErr) {
      return NextResponse.json({ error: `Failed to delete lesson: ${deleteErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (e: any) {
    console.error("[delete-lesson] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
