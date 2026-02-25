import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
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

function normalizeInput(value: string, removeDiacritics: boolean): string {
  const normalized = normalizeSpacing(value);
  return removeDiacritics ? stripDiacritics(normalized) : normalized;
}

function isCorrectAnswer(expected: string | null, given: string, removeDiacritics: boolean): boolean {
  if (!expected) return false;
  const expectedNormalized = normalizeInput(expected, removeDiacritics);
  const givenNormalized = normalizeInput(given, removeDiacritics);
  return expectedNormalized.length > 0 && expectedNormalized === givenNormalized;
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: sessionErr,
    } = await supabase.auth.getUser();
    if (sessionErr || !user?.id) {
      return NextResponse.json({ error: "Authentication failed", code: "UNAUTHORIZED" }, { status: 401 });
    }
    const userId = user.id;

    const body = (await req.json().catch(() => null)) as AnswerBody | null;
    if (!body?.sense_id || !body?.given || !body?.direction || !body?.session_id) {
      return NextResponse.json({ error: "sense_id, given, direction, session_id are required" }, { status: 400 });
    }
    if (body.direction !== "en-pl" && body.direction !== "pl-en") {
      return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
    }

    const { data: pack, error: packErr } = await supabase
      .from("vocab_packs")
      .select("id, slug, is_published")
      .eq("slug", slug)
      .maybeSingle();

    if (packErr) {
      return NextResponse.json({ error: packErr.message }, { status: 500 });
    }
    if (!pack || !pack.is_published) {
      return NextResponse.json({ error: "Pack not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const { data: packItem, error: packItemErr } = await supabase
      .from("vocab_pack_items")
      .select("id")
      .eq("pack_id", pack.id)
      .eq("sense_id", body.sense_id)
      .maybeSingle();

    if (packItemErr) {
      return NextResponse.json({ error: packItemErr.message }, { status: 500 });
    }
    if (!packItem) {
      return NextResponse.json({ error: "Sense not found in pack", code: "NOT_FOUND" }, { status: 404 });
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

    const lemma = (senseRow as any)?.lexicon_entries?.lemma ?? null;
    const translationEmbed = (senseRow as any)?.lexicon_translations;
    const translation_pl = Array.isArray(translationEmbed)
      ? translationEmbed[0]?.translation_pl ?? null
      : translationEmbed?.translation_pl ?? null;

    const expectedValue = body.direction === "en-pl" ? translation_pl : lemma;
    let isCorrect = isCorrectAnswer(expectedValue, body.given, body.direction === "en-pl");

    if (!isCorrect && body.direction === "pl-en" && translation_pl) {
      isCorrect = isCorrectAnswer(translation_pl, body.given, true);
    }

    const { data: existingItem } = await supabase
      .from("user_vocab_items")
      .select("id")
      .eq("student_id", userId)
      .eq("sense_id", body.sense_id)
      .maybeSingle();

    const { error: insertErr } = await supabase.from("vocab_answer_events").insert({
      student_id: userId,
      test_run_id: null,
      user_vocab_item_id: existingItem?.id ?? null,
      question_mode: body.direction,
      prompt: body.direction === "en-pl" ? lemma ?? "" : translation_pl ?? "",
      expected: expectedValue,
      given: body.given,
      is_correct: isCorrect,
      evaluation: isCorrect ? "correct" : "wrong",
      context_type: "vocab_pack",
      context_id: body.sense_id,
      pack_id: pack.id,
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
      console.error("[packs/answer] Knowledge update failed:", {
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
  } catch (e: any) {
    console.error("[packs/answer] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
