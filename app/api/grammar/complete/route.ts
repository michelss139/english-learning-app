import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { awardXpAndBadges } from "@/lib/xp/award";
import { isPerfectSession } from "@/lib/xp/perfect";
import { updateStreak } from "@/lib/streaks";
import { getSessionSummary } from "@/lib/sessionSummary";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type Body = { session_id: string; slug: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: Request) {
  try {
    const routeSupabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: sessionErr,
    } = await routeSupabase.auth.getUser();
    if (sessionErr || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body?.session_id || !body?.slug) {
      return NextResponse.json({ error: "session_id and slug are required" }, { status: 400 });
    }
    if (!isUuid(body.session_id)) {
      return NextResponse.json({ error: "Invalid session_id format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const userId = user.id;
    const slug = String(body.slug).trim();
    if (!slug) {
      return NextResponse.json({ error: "slug cannot be empty" }, { status: 400 });
    }

    const { count: totalCount, error: totalErr } = await supabase
      .from("vocab_answer_events")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("context_type", "grammar")
      .eq("context_id", slug)
      .eq("session_id", body.session_id);

    if (totalErr) {
      return NextResponse.json({ error: totalErr.message }, { status: 500 });
    }

    const { count: wrongCount, error: wrongErr } = await supabase
      .from("vocab_answer_events")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("context_type", "grammar")
      .eq("context_id", slug)
      .eq("session_id", body.session_id)
      .eq("is_correct", false);

    if (wrongErr) {
      return NextResponse.json({ error: wrongErr.message }, { status: 500 });
    }

    const total = totalCount ?? 0;
    const wrong = wrongCount ?? 0;
    const correct = Math.max(total - wrong, 0);

    if (total <= 0) {
      return NextResponse.json({ error: "No answers for this session" }, { status: 400 });
    }

    const { data: existingCompletion } = await supabase
      .from("exercise_session_completions")
      .select("id")
      .eq("student_id", userId)
      .eq("exercise_type", "grammar_practice")
      .eq("session_id", body.session_id)
      .maybeSingle();

    const alreadyCompleted = !!existingCompletion;

    let award = {
      xp_awarded: 0,
      xp_total: 0,
      level: 0,
      xp_in_current_level: 0,
      xp_to_next_level: 0,
      newly_awarded_badges: [] as { slug: string; title: string; description: string | null }[],
    };

    if (!alreadyCompleted) {
      const perfect = isPerfectSession({ totalCount: total, wrongCount: wrong });

      award = await awardXpAndBadges({
        supabase,
        userId,
        source: "grammar",
        sourceSlug: slug,
        sessionId: body.session_id,
        dedupeKey: `grammar:${slug}`,
        perfect,
        eligibleForAward: true,
        repeatQualified: false,
        meta: {
          total,
          correct,
          wrong,
          exercise_slug: slug,
        },
      });

      try {
        await updateStreak(supabase, userId);
      } catch (streakErr) {
        console.error("[grammar/complete] streak update failed:", streakErr);
      }
    }

    const { error: upsertErr } = await supabase.from("exercise_session_completions").upsert(
      {
        student_id: userId,
        session_id: body.session_id,
        exercise_type: "grammar_practice",
        exercise_slug: slug,
        context_id: null,
        context_slug: slug,
      },
      { onConflict: "student_id,exercise_type,session_id" }
    );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    const summary = await getSessionSummary(userId, body.session_id, "grammar_practice");

    return NextResponse.json({
      ok: true,
      total,
      correct,
      wrong,
      already_completed: alreadyCompleted,
      summary,
      ...award,
    });
  } catch (e: unknown) {
    console.error("[grammar/complete] Error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && e instanceof Error ? e.stack : undefined,
      },
      { status: 500 }
    );
  }
}
