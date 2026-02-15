import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { getGrammarPracticeQuestion } from "@/lib/grammar/practice";

type AnswerBody = {
  session_id: string;
  question_id: string;
  selected_option: string;
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
    if (!body?.session_id || !body?.question_id || !body?.selected_option) {
      return NextResponse.json({ error: "session_id, question_id and selected_option are required" }, { status: 400 });
    }
    if (!isUuid(body.session_id)) {
      return NextResponse.json({ error: "Invalid session_id format" }, { status: 400 });
    }

    const userId = user.id;

    const { data: grammarSession, error: fetchErr } = await supabase
      .from("grammar_sessions")
      .select("id, student_id, exercise_slug")
      .eq("id", body.session_id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!grammarSession) {
      return NextResponse.json({ error: "Grammar session not found" }, { status: 404 });
    }
    if (grammarSession.student_id !== userId) {
      return NextResponse.json({ error: "Unauthorized for this session" }, { status: 403 });
    }

    const question = getGrammarPracticeQuestion(grammarSession.exercise_slug, body.question_id);
    if (!question) {
      return NextResponse.json({ error: "Question not found for exercise" }, { status: 400 });
    }
    if (!question.options.includes(body.selected_option)) {
      return NextResponse.json({ error: "Selected option is invalid for this question" }, { status: 400 });
    }

    const isCorrect = body.selected_option === question.correct_option;

    const { error: answerErr } = await supabase.from("grammar_session_answers").insert({
      session_id: grammarSession.id,
      student_id: userId,
      question_id: question.id,
      selected_option: body.selected_option,
      is_correct: isCorrect,
    });

    if (answerErr) {
      return NextResponse.json({ error: answerErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      is_correct: isCorrect,
      correct_option: question.correct_option,
    });
  } catch (e: any) {
    console.error("[grammar/answer] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
