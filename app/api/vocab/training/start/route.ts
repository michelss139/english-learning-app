import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { pickExampleEn, pickLemma, pickTranslationPl } from "@/lib/vocab/poolOverviewUtils";

const QUICK_MAX = 8;

type StartBody = {
  sense_ids?: unknown;
  mode?: string;
};

type TrainingCard = {
  sense_id: string;
  lemma: string | null;
  definition_en: string | null;
  translation_pl: string | null;
  example_en: string | null;
};

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

function shuffleArray<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export async function POST(req: Request): Promise<NextResponse<{ session_id: string; cards: TrainingCard[] } | { error: string }>> {
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

    const body = (await req.json().catch(() => ({}))) as StartBody;
    if (!Array.isArray(body.sense_ids) || body.sense_ids.length === 0) {
      return NextResponse.json({ error: "sense_ids array is required" }, { status: 400 });
    }

    const modeRaw = typeof body.mode === "string" ? body.mode : "quick";
    const mode =
      modeRaw === "errors" || modeRaw === "new" || modeRaw === "mastered" ? modeRaw : "quick";
    const rawIds = body.sense_ids
      .filter((x): x is string => typeof x === "string" && x.length > 0)
      .map((x) => x.trim())
      .filter(Boolean);

    const uniqueIds = Array.from(new Set(rawIds));

    const { data: owned, error: ownedErr } = await supabase
      .from("user_vocab_items")
      .select("sense_id")
      .eq("student_id", userId)
      .in("sense_id", uniqueIds)
      .not("sense_id", "is", null);

    if (ownedErr) {
      return NextResponse.json({ error: ownedErr.message }, { status: 500 });
    }

    const allowed = new Set((owned ?? []).map((r: { sense_id: string }) => r.sense_id));
    const ordered = uniqueIds.filter((id) => allowed.has(id));

    const cap = mode === "quick" ? QUICK_MAX : QUICK_MAX;
    const finalIds = ordered.slice(0, cap);

    if (finalIds.length === 0) {
      return NextResponse.json(
        { error: "No valid sense_ids in your pool", code: "EMPTY_SELECTION" },
        { status: 400 }
      );
    }

    const { data: senses, error: senseErr } = await supabase
      .from("lexicon_senses")
      .select(
        `
        id,
        definition_en,
        lexicon_entries(lemma),
        lexicon_translations(translation_pl),
        lexicon_examples(example_en)
      `
      )
      .in("id", finalIds);

    if (senseErr) {
      return NextResponse.json({ error: senseErr.message }, { status: 500 });
    }

    const byId = new Map((senses ?? []).map((s: any) => [s.id as string, s]));

    const cardsOrdered: TrainingCard[] = [];
    for (const id of finalIds) {
      const row = byId.get(id);
      if (!row) continue;
      const entry = row.lexicon_entries;
      cardsOrdered.push({
        sense_id: id,
        lemma: pickLemma(entry),
        definition_en: (row.definition_en as string | null) ?? null,
        translation_pl: pickTranslationPl(row.lexicon_translations),
        example_en: pickExampleEn(row.lexicon_examples),
      });
    }

    const cards = shuffleArray(cardsOrdered);
    const sessionId = createSessionId();

    const { error: sessionInsertErr } = await supabase.from("training_sessions").insert({
      id: sessionId,
      student_id: userId,
      exercise_type: "pack",
      status: "started",
      context_slug: "vocab_pool",
      context_id: null,
      question_count: cards.length,
      metadata: {
        source: "vocab_pool",
        mode,
        sense_ids: finalIds,
      },
    });

    if (sessionInsertErr) {
      console.error("[vocab/training/start] training_sessions insert failed:", sessionInsertErr);
      return NextResponse.json({ error: sessionInsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ session_id: sessionId, cards });
  } catch (e: unknown) {
    console.error("[vocab/training/start]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
