import { NextResponse } from "next/server";
import { ensureTutoringLessonAccess, getAuthContext } from "@/app/api/lessons/_helpers";

type CreateTopicBody = {
  lesson_id?: string;
  topic_type?: "conversation" | "grammar" | "custom";
  topic_value?: string;
};

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const body = (await req.json().catch(() => null)) as CreateTopicBody | null;

    if (!body?.lesson_id || !body?.topic_type || !body?.topic_value?.trim()) {
      return NextResponse.json({ error: "lesson_id, topic_type and topic_value are required" }, { status: 400 });
    }

    const allowedTopicTypes = new Set(["conversation", "grammar", "custom"]);
    if (!allowedTopicTypes.has(body.topic_type)) {
      return NextResponse.json({ error: "Invalid topic_type" }, { status: 400 });
    }

    const access = await ensureTutoringLessonAccess(supabase, body.lesson_id, userId, role);
    if ("error" in access) return access.error;

    const { data, error } = await supabase
      .from("lesson_topics")
      .insert({
        lesson_id: body.lesson_id,
        topic_type: body.topic_type,
        topic_value: body.topic_value.trim(),
      })
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, topic: data });
  } catch (e: any) {
    console.error("[lessons/topics] POST error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
