import { NextResponse } from "next/server";
import { ensureTutoringLessonAccess, getAuthContext } from "@/app/api/lessons/_helpers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const access = await ensureTutoringLessonAccess(supabase, id, userId, role);
    if ("error" in access) return access.error;

    const { data, error } = await supabase
      .from("lesson_topics")
      .select("*")
      .eq("lesson_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, topics: data ?? [] });
  } catch (e: any) {
    console.error("[lessons/:id/topics] GET error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
