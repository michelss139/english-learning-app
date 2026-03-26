import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { updateLearningUnitKnowledge } from "@/lib/knowledge/updateLearningUnitKnowledge";
import { getGrammarPracticeExercise, looksLikeGrammarQuestionId } from "@/lib/grammar/practice";
import { grammarAnswersMatch, GRAMMAR_NORMALIZE_OPTIONS } from "@/lib/grammar/normalizeAnswer";

const MAX_ANSWER_LEN = 2000;

type AnswerBody = {
  session_id?: unknown;
  exercise_slug?: unknown;
  question_id?: unknown;
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
    if (!isNonEmptyString(body.session_id) || !isNonEmptyString(body.exercise_slug) || !isNonEmptyString(body.question_id)) {
      return NextResponse.json(
        { error: "session_id, exercise_slug and question_id must be non-empty strings" },
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
    const questionId = body.question_id.trim();
    const answerTextRaw = body.answer_text;

    if (!sessionId || !exerciseSlug || !questionId) {
      return NextResponse.json(
        { error: "session_id, exercise_slug and question_id cannot be whitespace-only" },
        { status: 400 },
      );
    }
    if (!isUuid(sessionId)) {
      return NextResponse.json({ error: "Invalid session_id format" }, { status: 400 });
    }

    if (looksLikeGrammarQuestionId(exerciseSlug)) {
      return NextResponse.json(
        { error: "exercise_slug must be a topic slug (e.g. present-simple), not a question_id" },
        { status: 400 },
      );
    }

    const answerText = answerTextRaw.trim();
    if (answerText.length === 0) {
      return NextResponse.json({ error: "answer_text is required and cannot be empty after trim" }, { status: 400 });
    }
    if (answerText.length > MAX_ANSWER_LEN) {
      return NextResponse.json(
        { error: `answer_text exceeds maximum length of ${MAX_ANSWER_LEN} characters` },
        { status: 400 },
      );
    }

    const studentId = user.id;

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
      return NextResponse.json({ error: "Session is not a grammar training session" }, { status: 400 });
    }
    if (trainingRow.context_slug !== exerciseSlug) {
      return NextResponse.json({ error: "exercise_slug does not match this session" }, { status: 400 });
    }
    if (trainingRow.status === "completed") {
      return NextResponse.json({ error: "Session is already completed" }, { status: 400 });
    }

    // exercise_slug = canonical topic / knowledge unit_id. question_id is only for finding the probe + event.prompt.
    const exercise = getGrammarPracticeExercise(exerciseSlug);
    if (!exercise) {
      return NextResponse.json({ error: "Unknown exercise_slug" }, { status: 400 });
    }
    if (exercise.slug !== exerciseSlug) {
      return NextResponse.json({ error: "Exercise catalog inconsistent with exercise_slug" }, { status: 400 });
    }

    const question = exercise.questions.find((q) => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: "question_id does not belong to this exercise_slug" }, { status: 400 });
    }

    const canonical = question.correct_option;
    if (typeof canonical !== "string" || canonical.trim().length === 0) {
      return NextResponse.json({ error: "Invalid question configuration" }, { status: 500 });
    }

    const isCorrect = grammarAnswersMatch(answerText, canonical, GRAMMAR_NORMALIZE_OPTIONS);

    /*
     * ARCHITECTURE NOTE – grammar events in vocab_answer_events (write side):
     * We persist grammar attempts in `vocab_answer_events` as a transitional reuse.
     * Grammar is NOT a vocab domain; this schema is vocab-centric.
     *
     * Field mapping for grammar rows:
     *   prompt         = question_id  (event-level task id, NOT knowledge unit_id / NOT exercise_slug)
     *   expected        = canonical correct answer text (from server source of truth)
     *   given           = real user answer text (trimmed string, NEVER "correct"/"wrong")
     *   is_correct      = server-computed boolean
     *   evaluation      = DB enum ('correct'|'wrong'), derived from is_correct
     *   context_type    = "grammar"
     *   context_id      = exercise_slug (matches session.context_slug)
     *   session_id      = training_sessions.id
     *   question_mode   = "grammar"
     *   test_run_id     = null (not applicable)
     *   user_vocab_item_id = null (not applicable)
     *
     * Limitations:
     *   - Column names (prompt/expected/given) reflect vocab UX, not grammar semantics
     *   - Not suitable for multi-answer tasks, complex grammar evaluation, or AI/coaching payloads
     *   - Analytics queries must special-case context_type/question_mode to avoid mixing domains
     *
     * A unified `exercise_answer_events` model should replace this when adding new modalities.
     * Do not extend this pattern silently.
     */
    const insertData = {
      student_id: studentId,
      test_run_id: null,
      user_vocab_item_id: null,
      question_mode: "grammar" as const,
      prompt: questionId,
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

    // Knowledge: topic-level only — unit_id = exercise_slug. Never pass question_id here.
    const knowledgeResult = await updateLearningUnitKnowledge({
      supabase,
      studentId,
      unitType: "grammar",
      unitId: exerciseSlug,
      payload: { mode: "answer", isCorrect },
    });

    if (!knowledgeResult.ok) {
      console.error("[grammar/answer] Knowledge update failed:", {
        studentId,
        unitId: exerciseSlug,
        message: knowledgeResult.error,
        cause: knowledgeResult.cause,
      });
    }

    return NextResponse.json({
      ok: true,
      is_correct: isCorrect,
    });
  } catch (e: unknown) {
    console.error("[grammar/answer] Error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && e instanceof Error ? e.stack : undefined,
      },
      { status: 500 },
    );
  }
}
