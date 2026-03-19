import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { updateLearningUnitKnowledge } from "@/lib/knowledge/updateLearningUnitKnowledge";

type AnswerBody = {
  session_id: string;
  slug: string;
  is_correct: boolean;
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

    const body = (await req.json().catch(() => null)) as AnswerBody | null;
    if (!body?.session_id || body?.slug == null || typeof body?.is_correct !== "boolean") {
      return NextResponse.json(
        { error: "session_id, slug and is_correct are required" },
        { status: 400 }
      );
    }
    if (!isUuid(body.session_id)) {
      return NextResponse.json({ error: "Invalid session_id format" }, { status: 400 });
    }

    const studentId = user.id;
    const slug = String(body.slug).trim();
    if (!slug) {
      return NextResponse.json({ error: "slug cannot be empty" }, { status: 400 });
    }

    const insertData = {
      student_id: studentId,
      test_run_id: null,
      user_vocab_item_id: null,
      question_mode: "grammar" as const,
      prompt: slug,
      expected: null,
      given: body.is_correct ? "correct" : "wrong",
      is_correct: body.is_correct,
      evaluation: body.is_correct ? ("correct" as const) : ("wrong" as const),
      context_type: "grammar" as const,
      context_id: slug,
      session_id: body.session_id,
    };

    const { error: insertErr } = await supabase
      .from("vocab_answer_events")
      .insert(insertData);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const knowledgeResult = await updateLearningUnitKnowledge({
      supabase,
      studentId,
      unitType: "grammar",
      unitId: slug,
      payload: { mode: "answer", isCorrect: body.is_correct },
    });

    if (!knowledgeResult.ok) {
      console.error("[grammar/answer] Knowledge update failed:", {
        studentId,
        unitId: slug,
        message: knowledgeResult.error,
        cause: knowledgeResult.cause,
      });
      // Don't fail the request - event was logged
    }

    return NextResponse.json({
      ok: true,
      is_correct: body.is_correct,
    });
  } catch (e: unknown) {
    console.error("[grammar/answer] Error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && e instanceof Error ? e.stack : undefined,
      },
      { status: 500 }
    );
  }
}
