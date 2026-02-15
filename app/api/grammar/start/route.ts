import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { getGrammarPracticeExercise } from "@/lib/grammar/practice";

type StartBody = {
  exercise_slug: string;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: sessionErr,
    } = await supabase.auth.getUser();
    if (sessionErr || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as StartBody | null;
    if (!body?.exercise_slug) {
      return NextResponse.json({ error: "exercise_slug is required" }, { status: 400 });
    }

    const exercise = getGrammarPracticeExercise(body.exercise_slug);
    if (!exercise || exercise.questions.length === 0) {
      return NextResponse.json({ error: "Unsupported grammar exercise" }, { status: 400 });
    }

    const userId = user.id;

    const { data: sessionRow, error: insertErr } = await supabase
      .from("grammar_sessions")
      .insert({
        student_id: userId,
        exercise_slug: body.exercise_slug,
      })
      .select("id, exercise_slug")
      .single();

    if (insertErr || !sessionRow || !isUuid(sessionRow.id)) {
      return NextResponse.json({ error: insertErr?.message ?? "Failed to start session" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      session_id: sessionRow.id,
      exercise_slug: sessionRow.exercise_slug,
      questions: exercise.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
      })),
    });
  } catch (e: any) {
    console.error("[grammar/start] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
