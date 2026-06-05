import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { awardXpAndBadges } from "@/lib/xp/award";
import { isPerfectSession } from "@/lib/xp/perfect";
import { updateStreak } from "@/lib/streaks";
import { getSessionSummary } from "@/lib/sessionSummary";
import { isSuggestionTrainingMetadata } from "@/lib/suggestions/suggestionContext";

type CompleteBody = {
  session_id: string;
};

async function sessionHasToLearn(
  supabase: any,
  userId: string,
  sessionId: string,
  sessionWrongCount: number
): Promise<boolean> {
  // If the session itself had wrong answers, user has things to learn.
  if (sessionWrongCount > 0) return true;

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

    const { data: trainSession, error: tsErr } = await supabase
      .from("training_sessions")
      .select("metadata")
      .eq("id", body.session_id)
      .eq("student_id", userId)
      .eq("exercise_type", "irregular")
      .maybeSingle();

    if (tsErr) {
      return NextResponse.json({ error: tsErr.message }, { status: 500 });
    }
    if (!trainSession) {
      return NextResponse.json(
        { error: "Training session not found", code: "SESSION_MISMATCH" },
        { status: 400 },
      );
    }

    const lessonVerbsIsolated =
      trainSession.metadata &&
      typeof trainSession.metadata === "object" &&
      !Array.isArray(trainSession.metadata) &&
      (trainSession.metadata as Record<string, unknown>).lesson_verbs_isolated === true;

    const fromSuggestion = isSuggestionTrainingMetadata(trainSession.metadata);

    const [
      { count: totalCount, error: totalErr },
      { count: wrongCount, error: wrongErr },
    ] = await Promise.all([
      supabase
        .from("irregular_verb_runs")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId)
        .eq("session_id", body.session_id),
      supabase
        .from("irregular_verb_runs")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId)
        .eq("session_id", body.session_id)
        .eq("correct", false),
    ]);

    if (totalErr) {
      return NextResponse.json({ error: totalErr.message }, { status: 500 });
    }
    if (wrongErr) {
      return NextResponse.json({ error: wrongErr.message }, { status: 500 });
    }

    if (!totalCount || totalCount <= 0) {
      return NextResponse.json({ error: "No answers for this session" }, { status: 400 });
    }

    const wrongTotal = wrongCount ?? 0;
    const correctCount = Math.max(totalCount - wrongTotal, 0);
    const completedAt = new Date().toISOString();

    if (lessonVerbsIsolated) {
      try {
        await supabase
          .from("training_sessions")
          .update({ completed_at: completedAt, status: "completed" })
          .eq("id", body.session_id)
          .eq("student_id", userId)
          .eq("exercise_type", "irregular")
          .is("completed_at", null);
      } catch (trainingSessionErr) {
        console.error("[irregular-verbs/complete] training_sessions update failed:", trainingSessionErr);
      }

      const summary = await getSessionSummary(userId, body.session_id, "irregular", {
        total: totalCount,
        wrong: wrongTotal,
        finishedAt: completedAt,
      });

      return NextResponse.json({
        ok: true,
        isolated_lesson_verbs: true,
        total: totalCount,
        correct: correctCount,
        perfect: wrongTotal === 0,
        summary,
        xp_awarded: 0,
        xp_total: 0,
        level: 0,
        xp_in_current_level: 0,
        xp_to_next_level: 0,
        newly_awarded_badges: [] as [],
        xp_skip_reason: "isolated_lesson_no_xp",
      });
    }

    const answersCount = totalCount;
    const xpAmount = answersCount >= 5 ? 10 : answersCount;
    const perfect = isPerfectSession({ totalCount, wrongCount: wrongTotal, minAnswers: 1 });
    const eligibleForAward = true;
    const hasToLearn = await sessionHasToLearn(supabase, userId, body.session_id, wrongTotal);

    const award = await awardXpAndBadges({
      supabase,
      userId,
      source: "irregular",
      sourceSlug: null,
      sessionId: body.session_id,
      dedupeKey: "irregular:default",
      perfect,
      xp: xpAmount,
      eligibleForAward,
      repeatQualified: hasToLearn || fromSuggestion,
      meta: {
        total: totalCount,
        correct: correctCount,
        from_suggestion: fromSuggestion,
        answers_count: answersCount,
        xp_session_scaled: true,
      },
    });

    const [, completionResult] = await Promise.allSettled([
      updateStreak(supabase, userId).catch((streakErr) => {
        console.error("[irregular-verbs/complete] streak update failed:", streakErr);
      }),
      supabase.from("exercise_session_completions").upsert(
        {
          student_id: userId,
          session_id: body.session_id,
          exercise_type: "irregular",
          context_id: null,
          context_slug: null,
        },
        { onConflict: "student_id,exercise_type,session_id" }
      ),
      (async () => {
        try {
          await supabase
            .from("training_sessions")
            .update({ completed_at: completedAt, status: "completed" })
            .eq("id", body.session_id)
            .eq("student_id", userId)
            .eq("exercise_type", "irregular")
            .is("completed_at", null);
        } catch (trainingSessionErr) {
          console.error("[irregular-verbs/complete] training_sessions update failed:", trainingSessionErr);
        }
      })(),
    ]);

    if (completionResult.status === "fulfilled") {
      const { error: completionErr } = completionResult.value as { error: any };
      if (completionErr) {
        return NextResponse.json({ error: completionErr.message }, { status: 500 });
      }
    }

    const summary = await getSessionSummary(userId, body.session_id, "irregular", {
      total: totalCount,
      wrong: wrongTotal,
      finishedAt: completedAt,
    });

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
