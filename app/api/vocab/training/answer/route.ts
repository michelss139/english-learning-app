import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { updateLearningUnitKnowledge } from "@/lib/knowledge/updateLearningUnitKnowledge";

type AnswerBody = {
  sense_id: string;
  given: string;
  direction: "en-pl" | "pl-en";
  session_id: string;
};

function normalizeSpacing(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function pickLemma(embed: unknown): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return typeof embed[0]?.lemma === "string" ? embed[0].lemma : null;
  }
  if (typeof embed === "object" && embed !== null && "lemma" in embed) {
    const value = (embed as { lemma?: unknown }).lemma;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function stripDiacritics(value: string): string {
  const decomposed = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return decomposed
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ż/g, "z")
    .replace(/ź/g, "z");
}

function normalizeInput(value: string, removeDiacriticsFlag: boolean): string {
  const normalized = normalizeSpacing(value);
  return removeDiacriticsFlag ? stripDiacritics(normalized) : normalized;
}

function isCorrectAnswer(expected: string | null, given: string, removeDiacriticsFlag: boolean): boolean {
  if (!expected) return false;
  const expectedNormalized = normalizeInput(expected, removeDiacriticsFlag);
  const givenNormalized = normalizeInput(given, removeDiacriticsFlag);
  return expectedNormalized.length > 0 && expectedNormalized === givenNormalized;
}

export async function POST(req: Request): Promise<NextResponse<{ ok: true; isCorrect: boolean; expected: string | null } | { error: string }>> {
  try {
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

    const body = (await req.json().catch(() => null)) as AnswerBody | null;
    if (!body?.sense_id || !body?.given || !body?.direction || !body?.session_id) {
      return NextResponse.json({ error: "sense_id, given, direction, session_id are required" }, { status: 400 });
    }
    if (body.direction !== "en-pl" && body.direction !== "pl-en") {
      return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
    }

    const { data: poolRow, error: poolErr } = await supabase
      .from("user_vocab_items")
      .select("id")
      .eq("student_id", userId)
      .eq("sense_id", body.sense_id)
      .maybeSingle();

    if (poolErr) {
      return NextResponse.json({ error: poolErr.message }, { status: 500 });
    }
    if (!poolRow) {
      return NextResponse.json({ error: "Sense not in your pool", code: "NOT_IN_POOL" }, { status: 404 });
    }

    const { data: senseRow, error: senseErr } = await supabase
      .from("lexicon_senses")
      .select(
        `
        id,
        definition_en,
        lexicon_entries(lemma),
        lexicon_translations(translation_pl)
      `
      )
      .eq("id", body.sense_id)
      .maybeSingle();

    if (senseErr) {
      return NextResponse.json({ error: senseErr.message }, { status: 500 });
    }
    if (!senseRow) {
      return NextResponse.json({ error: "Sense not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const lemma = pickLemma((senseRow as any)?.lexicon_entries);
    const translationEmbed = (senseRow as any)?.lexicon_translations;
    const translation_pl = Array.isArray(translationEmbed)
      ? translationEmbed[0]?.translation_pl ?? null
      : translationEmbed?.translation_pl ?? null;

    const expectedValue = body.direction === "en-pl" ? translation_pl : lemma;
    let isCorrect = isCorrectAnswer(expectedValue, body.given, body.direction === "en-pl");

    if (!isCorrect && body.direction === "pl-en" && translation_pl) {
      isCorrect = isCorrectAnswer(translation_pl, body.given, true);
    }

    const { error: insertErr } = await supabase.from("vocab_answer_events").insert({
      student_id: userId,
      test_run_id: null,
      user_vocab_item_id: poolRow.id,
      question_mode: body.direction,
      prompt: body.direction === "en-pl" ? lemma ?? "" : translation_pl ?? "",
      expected: expectedValue,
      given: body.given,
      is_correct: isCorrect,
      evaluation: isCorrect ? "correct" : "wrong",
      context_type: "vocab_pool",
      context_id: body.sense_id,
      pack_id: null,
      session_id: body.session_id,
      direction: body.direction,
    });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const knowledgeResult = await updateLearningUnitKnowledge({
      supabase,
      studentId: userId,
      unitType: "sense",
      unitId: body.sense_id,
      payload: { mode: "answer", isCorrect },
    });
    if (!knowledgeResult.ok) {
      console.error("[vocab/training/answer] Knowledge update failed:", {
        studentId: userId,
        unitType: "sense",
        unitId: body.sense_id,
        message: knowledgeResult.error,
        cause: knowledgeResult.cause,
      });
    }

    return NextResponse.json({
      ok: true,
      isCorrect,
      expected: expectedValue,
    });
  } catch (e: unknown) {
    console.error("[vocab/training/answer]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
