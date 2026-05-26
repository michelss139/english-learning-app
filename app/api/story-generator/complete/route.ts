import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { awardXpAndBadges } from "@/lib/xp/award";
import { updateLearningUnitKnowledge } from "@/lib/knowledge/updateLearningUnitKnowledge";
import { isRegisteredGrammarExerciseSlug } from "@/lib/grammar/practice";

type TenseScore = {
  tense: string;
  correct: number;
  total: number;
};

type Body = {
  session_id: string;
  correct: number;
  total: number;
  tense_scores?: TenseScore[];
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body?.session_id) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    const correct = Number(body.correct ?? 0);
    const total = Number(body.total ?? 0);
    if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0 || correct < 0) {
      return NextResponse.json({ error: "Invalid score payload" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userData.user.id;

    // ── 1. Award XP ────────────────────────────────────────────────────────────
    const award = await awardXpAndBadges({
      supabase,
      userId,
      source: "grammar",
      sourceSlug: "story-generator",
      sessionId: body.session_id,
      dedupeKey: "grammar:story-generator",
      perfect: true,
      meta: { correct, total },
    });

    // ── 2. Update per-tense knowledge (non-blocking — never fails the response) ─
    const tenseScores = Array.isArray(body.tense_scores) ? body.tense_scores : [];

    await Promise.allSettled(
      tenseScores
        .filter(
          (ts) =>
            typeof ts.tense === "string" &&
            Number.isFinite(ts.total) &&
            ts.total > 0 &&
            Number.isFinite(ts.correct) &&
            isRegisteredGrammarExerciseSlug(ts.tense)
        )
        .map((ts) =>
          updateLearningUnitKnowledge({
            supabase,
            studentId: userId,
            unitType: "grammar",
            unitId: ts.tense,
            payload: {
              mode: "session",
              total: Math.floor(ts.total),
              correct: Math.min(Math.floor(ts.correct), Math.floor(ts.total)),
            },
          })
        )
    );

    return NextResponse.json({ ok: true, ...award });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
