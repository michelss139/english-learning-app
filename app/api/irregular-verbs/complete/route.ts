import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { awardXpAndBadges } from "@/lib/xp/award";
import { isPerfectSession } from "@/lib/xp/perfect";
import { updateStreak } from "@/lib/streaks";
import { getSessionSummary } from "@/lib/sessionSummary";

type CompleteBody = {
  session_id: string;
};

async function sessionHasToLearn(
  supabase: any,
  userId: string,
  sessionId: string
): Promise<boolean> {
  const { data: sessionRuns, error: sessionErr } = await supabase
    .from("irregular_verb_runs")
    .select("irregular_verb_id")
    .eq("student_id", userId)
    .eq("session_id", sessionId);

  if (sessionErr) throw sessionErr;

  const verbIds = Array.from(new Set((sessionRuns ?? []).map((row: any) => row.irregular_verb_id))).filter(Boolean);
  if (verbIds.length === 0) return false;

  const { data: toLearnRows, error: toLearnErr } = await supabase
    .from("irregular_verb_runs")
    .select("irregular_verb_id")
    .eq("student_id", userId)
    .eq("correct", false)
    .in("irregular_verb_id", verbIds)
    .limit(1);

  if (toLearnErr) throw toLearnErr;
  return (toLearnRows ?? []).length > 0;
}

export async function POST(req: Request) {
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

    const { count: totalCount, error: totalErr } = await supabase
      .from("irregular_verb_runs")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("session_id", body.session_id);

    if (totalErr) {
      return NextResponse.json({ error: totalErr.message }, { status: 500 });
    }

    const { count: wrongCount, error: wrongErr } = await supabase
      .from("irregular_verb_runs")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("session_id", body.session_id)
      .eq("correct", false);

    if (wrongErr) {
      return NextResponse.json({ error: wrongErr.message }, { status: 500 });
    }

    if (!totalCount || totalCount <= 0) {
      return NextResponse.json({ error: "No answers for this session" }, { status: 400 });
    }

    const wrongTotal = wrongCount ?? 0;
    const correctCount = Math.max(totalCount - wrongTotal, 0);
    const perfect = isPerfectSession({ totalCount, wrongCount: wrongTotal, minAnswers: 5 });
    const eligibleForAward = totalCount >= 5;
    const hasToLearn = await sessionHasToLearn(supabase, userId, body.session_id);

    const award = await awardXpAndBadges({
      supabase,
      userId,
      source: "irregular",
      sourceSlug: null,
      sessionId: body.session_id,
      dedupeKey: "irregular:default",
      perfect,
      eligibleForAward,
      repeatQualified: hasToLearn,
      meta: {
        total: totalCount,
        correct: correctCount,
      },
    });

    try {
      await updateStreak(supabase, userId);
    } catch (streakErr) {
      console.error("[irregular-verbs/complete] streak update failed:", streakErr);
    }

    const { error: completionErr } = await supabase.from("exercise_session_completions").upsert(
      {
        student_id: userId,
        session_id: body.session_id,
        exercise_type: "irregular",
        context_id: null,
        context_slug: null,
      },
      { onConflict: "student_id,exercise_type,session_id" }
    );

    if (completionErr) {
      return NextResponse.json({ error: completionErr.message }, { status: 500 });
    }

    const summary = await getSessionSummary(userId, body.session_id, "irregular");

    return NextResponse.json({
      ok: true,
      total: totalCount,
      correct: correctCount,
      perfect,
      summary,
      ...award,
    });
  } catch (e: any) {
    console.error("[irregular-verbs/complete] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
