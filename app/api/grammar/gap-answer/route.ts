import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { updateLearningUnitKnowledge } from "@/lib/knowledge/updateLearningUnitKnowledge";
import { grammarAnswersMatch, GRAMMAR_NORMALIZE_OPTIONS } from "@/lib/grammar/normalizeAnswer";

const MAX_ANSWER_LEN = 2000;

type AnswerBody = {
  session_id?: unknown;
  exercise_slug?: unknown;
  gap_question_id?: unknown;
  answer_text?: unknown;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string";
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

    const rawBody = await req.json().catch(() => null);
    if (rawBody === null || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const body = rawBody as AnswerBody;
    if (
      !isNonEmptyString(body.session_id) ||
      !isNonEmptyString(body.exercise_slug) ||
      !isNonEmptyString(body.gap_question_id)
    ) {
      return NextResponse.json(
        { error: "session_id, exercise_slug and gap_question_id must be non-empty strings" },
        { status: 400 },
      );
    }
    if (body.answer_text === undefined || body.answer_text === null) {
      return NextResponse.json({ error: "answer_text is required" }, { status: 400 });
    }
    if (typeof body.answer_text !== "string") {
      return NextResponse.json({ error: "answer_text must be a string" }, { status: 400 });
    }

    const sessionId = body.session_id.trim();
    const exerciseSlug = body.exercise_slug.trim();
    const gapQuestionId = body.gap_question_id.trim();
    const answerTextRaw = body.answer_text;

    if (!sessionId || !exerciseSlug || !gapQuestionId) {
      return NextResponse.json(
        { error: "session_id, exercise_slug and gap_question_id cannot be whitespace-only" },
        { status: 400 },
      );
    }
    if (!isUuid(sessionId)) {
      return NextResponse.json({ error: "Invalid session_id format" }, { status: 400 });
    }
    if (!isUuid(gapQuestionId)) {
      return NextResponse.json({ error: "Invalid gap_question_id format" }, { status: 400 });
    }

    const answerText = answerTextRaw.trim();
    if (answerText.length === 0) {
      return NextResponse.json(
        { error: "answer_text is required and cannot be empty after trim" },
        { status: 400 },
      );
    }
    if (answerText.length > MAX_ANSWER_LEN) {
      return NextResponse.json(
        { error: `answer_text exceeds maximum length of ${MAX_ANSWER_LEN} characters` },
        { status: 400 },
      );
    }

    const studentId = user.id;

    // Verify session ownership and type
    const { data: trainingRow, error: trainingErr } = await supabase
      .from("training_sessions")
      .select("id, exercise_type, context_slug, status")
      .eq("id", sessionId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (trainingErr) {
      return NextResponse.json({ error: trainingErr.message }, { status: 500 });
    }
    if (!trainingRow) {
      return NextResponse.json({ error: "Training session not found" }, { status: 404 });
    }
    if (trainingRow.exercise_type !== "grammar") {
      return NextResponse.json(
        { error: "Session is not a grammar training session" },
        { status: 400 },
      );
    }
    if (trainingRow.context_slug !== exerciseSlug) {
      return NextResponse.json(
        { error: "exercise_slug does not match this session" },
        { status: 400 },
      );
    }
    if (trainingRow.status === "completed") {
      return NextResponse.json({ error: "Session is already completed" }, { status: 400 });
    }

    // Fetch question from DB (server is source of truth)
    const { data: questionRow, error: questionErr } = await supabase
      .from("grammar_gap_questions")
      .select("id, slug, expected_answer, accepted_answers, prompt")
      .eq("id", gapQuestionId)
      .maybeSingle();

    if (questionErr) {
      return NextResponse.json({ error: questionErr.message }, { status: 500 });
    }
    if (!questionRow) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    if (questionRow.slug !== exerciseSlug) {
      return NextResponse.json(
        { error: "gap_question_id does not belong to this exercise_slug" },
        { status: 400 },
      );
    }

    const canonical: string = questionRow.expected_answer;
    const accepted: string[] = questionRow.accepted_answers ?? [];

    if (!canonical || canonical.trim().length === 0) {
      return NextResponse.json({ error: "Invalid question configuration" }, { status: 500 });
    }

    const isCorrect =
      grammarAnswersMatch(answerText, canonical, GRAMMAR_NORMALIZE_OPTIONS) ||
      accepted.some((a) => grammarAnswersMatch(answerText, a, GRAMMAR_NORMALIZE_OPTIONS));

    // Persist to vocab_answer_events (same pattern as grammar/answer)
    const insertData = {
      student_id: studentId,
      test_run_id: null,
      user_vocab_item_id: null,
      question_mode: "grammar" as const,
      prompt: gapQuestionId,
      expected: canonical,
      given: answerText,
      is_correct: isCorrect,
      evaluation: isCorrect ? ("correct" as const) : ("wrong" as const),
      context_type: "grammar" as const,
      context_id: exerciseSlug,
      session_id: sessionId,
    };

    const { error: insertErr } = await supabase.from("vocab_answer_events").insert(insertData);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Knowledge: topic-level only — unit_id = exercise_slug
    const knowledgeResult = await updateLearningUnitKnowledge({
      supabase,
      studentId,
      unitType: "grammar",
      unitId: exerciseSlug,
      payload: { mode: "answer", isCorrect },
    });

    if (!knowledgeResult.ok) {
      console.error("[grammar/gap-answer] Knowledge update failed:", {
        studentId,
        unitId: exerciseSlug,
        message: knowledgeResult.error,
        cause: knowledgeResult.cause,
      });
    }

    return NextResponse.json({
      ok: true,
      is_correct: isCorrect,
      canonical_answer: canonical,
    });
  } catch (e: unknown) {
    console.error("[grammar/gap-answer] Error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && e instanceof Error ? e.stack : undefined,
      },
      { status: 500 },
    );
  }
}
