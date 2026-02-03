import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { awardXpAndBadges } from "@/lib/xp/award";
import { isPerfectSession } from "@/lib/xp/perfect";

type CompleteBody = {
  session_id: string;
  direction: "en-pl" | "pl-en" | "mix";
  count_mode: "5" | "10" | "all";
};

function normalizeTerm(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function getTermKey(questionMode: string, prompt: string | null, expected: string | null): string | null {
  const base = questionMode === "en-pl" ? prompt : expected;
  return normalizeTerm(base ?? "");
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as CompleteBody | null;
    if (!body?.session_id || !body?.direction || !body?.count_mode) {
      return NextResponse.json({ error: "session_id, direction, count_mode are required" }, { status: 400 });
    }
    if (body.direction !== "en-pl" && body.direction !== "pl-en" && body.direction !== "mix") {
      return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
    }
    if (body.count_mode !== "5" && body.count_mode !== "10" && body.count_mode !== "all") {
      return NextResponse.json({ error: "Invalid count_mode" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const userId = userData.user.id;

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

    let totalQuery = supabase
      .from("vocab_answer_events")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("pack_id", pack.id)
      .eq("context_type", "vocab_pack")
      .eq("session_id", body.session_id);

    if (body.direction !== "mix") {
      totalQuery = totalQuery.eq("direction", body.direction);
    }

    const { count: totalCount, error: totalErr } = await totalQuery;

    if (totalErr) {
      return NextResponse.json({ error: totalErr.message }, { status: 500 });
    }

    let wrongQuery = supabase
      .from("vocab_answer_events")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("pack_id", pack.id)
      .eq("context_type", "vocab_pack")
      .eq("session_id", body.session_id)
      .eq("is_correct", false);

    if (body.direction !== "mix") {
      wrongQuery = wrongQuery.eq("direction", body.direction);
    }

    const { count: wrongCount, error: wrongErr } = await wrongQuery;

    if (wrongErr) {
      return NextResponse.json({ error: wrongErr.message }, { status: 500 });
    }

    if (!totalCount || totalCount <= 0) {
      return NextResponse.json({ error: "No answers for this session" }, { status: 400 });
    }

    const wrongTotal = wrongCount ?? 0;
    const correctCount = Math.max(totalCount - wrongTotal, 0);
    const perfect = isPerfectSession({ totalCount, wrongCount: wrongTotal });

    let eventsQuery = supabase
      .from("vocab_answer_events")
      .select("question_mode, prompt, expected")
      .eq("student_id", userId)
      .eq("pack_id", pack.id)
      .eq("context_type", "vocab_pack")
      .eq("session_id", body.session_id);

    if (body.direction !== "mix") {
      eventsQuery = eventsQuery.eq("direction", body.direction);
    }

    const { data: sessionEvents, error: sessionErr } = await eventsQuery;

    if (sessionErr) {
      return NextResponse.json({ error: sessionErr.message }, { status: 500 });
    }

    const sessionKeys = Array.from(
      new Set(
        (sessionEvents ?? [])
          .map((event: any) => getTermKey(event.question_mode, event.prompt, event.expected))
          .filter(Boolean)
      )
    ) as string[];

    let hasToLearn = false;
    if (sessionKeys.length > 0) {
      const { data: toLearnRows, error: toLearnErr } = await supabase
        .from("v2_vocab_to_learn_total")
        .select("term_en_norm")
        .eq("student_id", userId)
        .in("term_en_norm", sessionKeys);

      if (toLearnErr) {
        return NextResponse.json({ error: toLearnErr.message }, { status: 500 });
      }

      hasToLearn = (toLearnRows ?? []).length > 0;
    }

    const award = await awardXpAndBadges({
      supabase,
      userId,
      source: "pack",
      sourceSlug: slug,
      sessionId: body.session_id,
      dedupeKey: `pack:${slug}:${body.direction}:${body.count_mode}`,
      perfect,
      repeatQualified: hasToLearn,
      meta: {
        direction: body.direction,
        count_mode: body.count_mode,
        total: totalCount,
        correct: correctCount,
      },
      badgeContext: {
        packSlug: slug,
        countMode: body.count_mode,
      },
    });

    return NextResponse.json({
      ok: true,
      total: totalCount,
      correct: correctCount,
      perfect,
      ...award,
    });
  } catch (e: any) {
    console.error("[packs/complete] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
