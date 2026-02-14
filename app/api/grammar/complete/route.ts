import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { awardXpAndBadges } from "@/lib/xp/award";
import { updateStreak } from "@/lib/streaks";

type Body = { session_id: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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
    if (!isUuid(body.session_id)) {
      return NextResponse.json({ error: "Invalid session_id format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const userId = userData.user.id;

    const { data: completionResult, error: completeErr } = await supabase.rpc("complete_grammar_practice", {
      p_student_id: userId,
      p_session_id: body.session_id,
    });

    if (completeErr) {
      const msg = completeErr.message || "Completion failed";
      if (msg.includes("GRAMMAR_SESSION_NOT_FOUND")) {
        return NextResponse.json({ error: "Grammar session not found" }, { status: 404 });
      }
      if (msg.includes("GRAMMAR_SESSION_NO_ANSWERS")) {
        return NextResponse.json({ error: "No answers for this session" }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const resultRow = Array.isArray(completionResult) ? completionResult[0] : completionResult;
    if (!resultRow) {
      return NextResponse.json({ error: "Completion result is empty" }, { status: 500 });
    }

    const exerciseSlug = resultRow.exercise_slug as string;
    const answerCount = Number(resultRow.answer_count ?? 0);
    const alreadyCompleted = !Boolean(resultRow.inserted);

    let award = {
      xp_awarded: 0,
      xp_total: 0,
      level: 0,
      xp_in_current_level: 0,
      xp_to_next_level: 0,
      newly_awarded_badges: [] as { slug: string; title: string; description: string | null }[],
    };

    if (!alreadyCompleted) {
      // Dedupe per grammar exercise slug prevents repeat farming across sessions.
      award = await awardXpAndBadges({
        supabase,
        userId,
        source: "grammar",
        sourceSlug: exerciseSlug,
        sessionId: body.session_id,
        dedupeKey: `grammar:${exerciseSlug}`,
        perfect: false,
        eligibleForAward: true,
        repeatQualified: false,
        meta: {
          answers: answerCount,
          exercise_slug: exerciseSlug,
        },
      });

      try {
        await updateStreak(supabase, userId);
      } catch (streakErr) {
        console.error("[grammar/complete] streak update failed:", streakErr);
      }
    }

    return NextResponse.json({
      ok: true,
      already_completed: alreadyCompleted,
      answer_count: answerCount ?? 0,
      exercise_slug: exerciseSlug,
      ...award,
    });
  } catch (e: any) {
    console.error("[grammar/complete] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
