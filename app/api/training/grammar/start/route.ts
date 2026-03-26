import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { isRegisteredGrammarExerciseSlug } from "@/lib/grammar/practice";

/** Body uses `slug` for backward compatibility; value is the grammar exercise_slug (topic), not question_id. */
type StartBody = {
  slug?: string;
};

type StartResponse = {
  sessionId: string;
};

type ErrorResponse = {
  error: string;
  code?: string;
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

export async function POST(req: Request): Promise<NextResponse<StartResponse | ErrorResponse>> {
  try {
    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as StartBody;
    const exerciseSlug = body.slug?.trim();

    if (!exerciseSlug) {
      return NextResponse.json(
        { error: "slug is required", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    if (!isRegisteredGrammarExerciseSlug(exerciseSlug)) {
      return NextResponse.json(
        {
          error: "Unknown or invalid grammar exercise slug (must be a topic slug from the catalog, not a question_id)",
          code: "INVALID_EXERCISE_SLUG",
        },
        { status: 400 }
      );
    }

    const sessionId = createSessionId();

    // context_slug = canonical exercise_slug = user_learning_unit_knowledge.unit_id for grammar.
    // Stable: must match catalog keys in lib/grammar/practice.ts; never a question_id (e.g. …-q1).
    const { error: sessionInsertErr } = await supabase
      .from("training_sessions")
      .insert({
        id: sessionId,
        student_id: user.id,
        exercise_type: "grammar",
        status: "started",
        context_slug: exerciseSlug,
        context_id: null,
        question_count: 1,
        metadata: { source: "manual" },
      });

    if (sessionInsertErr) {
      return NextResponse.json({ error: sessionInsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ sessionId });
  } catch (e: unknown) {
    console.error("[training/grammar/start] Error:", e);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
