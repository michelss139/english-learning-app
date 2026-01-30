import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { awardXpAndBadges } from "@/lib/xp/award";
import { isPerfectSession } from "@/lib/xp/perfect";

type CompleteBody = {
  session_id: string;
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
    if (!body?.session_id) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const userId = userData.user.id;

    const { data: cluster, error: clusterErr } = await supabase
      .from("vocab_clusters")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (clusterErr) {
      return NextResponse.json({ error: clusterErr.message }, { status: 500 });
    }
    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const { count: totalCount, error: totalErr } = await supabase
      .from("vocab_answer_events")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("context_type", "vocab_cluster")
      .eq("context_id", slug)
      .eq("session_id", body.session_id);

    if (totalErr) {
      return NextResponse.json({ error: totalErr.message }, { status: 500 });
    }

    const { count: wrongCount, error: wrongErr } = await supabase
      .from("vocab_answer_events")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("context_type", "vocab_cluster")
      .eq("context_id", slug)
      .eq("session_id", body.session_id)
      .eq("is_correct", false);

    if (wrongErr) {
      return NextResponse.json({ error: wrongErr.message }, { status: 500 });
    }

    if (!totalCount || totalCount <= 0) {
      return NextResponse.json({ error: "No answers for this session" }, { status: 400 });
    }

    const wrongTotal = wrongCount ?? 0;
    const correctCount = Math.max(totalCount - wrongTotal, 0);
    const perfect = isPerfectSession({ totalCount, wrongCount: wrongTotal });

    const { data: sessionEvents, error: sessionErr } = await supabase
      .from("vocab_answer_events")
      .select("question_mode, prompt, expected")
      .eq("student_id", userId)
      .eq("context_type", "vocab_cluster")
      .eq("context_id", slug)
      .eq("session_id", body.session_id);

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
      source: "cluster",
      sourceSlug: slug,
      sessionId: body.session_id,
      dedupeKey: `cluster:${slug}`,
      perfect,
      repeatQualified: hasToLearn,
      meta: {
        total: totalCount,
        correct: correctCount,
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
    console.error("[clusters/complete] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
