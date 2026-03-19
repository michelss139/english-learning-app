import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type FirstVerbDto = {
  id: string;
  base: string;
  past_simple: string;
  past_simple_variants: string[];
  past_participle: string;
  past_participle_variants: string[];
};

type StartResponse = {
  sessionId: string;
  firstVerb: FirstVerbDto;
  total: number;
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

    const { data: pinned, error: pinnedError } = await supabase
      .from("user_irregular_verbs")
      .select("irregular_verb_id")
      .eq("student_id", user.id);

    if (pinnedError) {
      console.error("[training/irregular/start] Error fetching pinned verbs:", pinnedError);
      return NextResponse.json(
        { error: pinnedError.message, code: "PINNED_LOAD_FAILED" },
        { status: 500 }
      );
    }

    const pinnedIds = (pinned ?? []).map((p) => p.irregular_verb_id).filter(Boolean);

    if (pinnedIds.length < 1) {
      return NextResponse.json(
        { error: "No pinned verbs. Please pin some verbs first.", code: "NO_PINNED_VERBS" },
        { status: 400 }
      );
    }

    const { data: verbs, error: verbsError } = await supabase
      .from("irregular_verbs")
      .select("id, base, past_simple, past_simple_variants, past_participle, past_participle_variants")
      .in("id", pinnedIds);

    if (verbsError || !verbs?.length) {
      console.error("[training/irregular/start] Error fetching verbs:", verbsError);
      return NextResponse.json(
        { error: verbsError?.message ?? "Failed to load verbs", code: "VERBS_LOAD_FAILED" },
        { status: 500 }
      );
    }

    const randomIndex = Math.floor(Math.random() * verbs.length);
    const selectedVerb = verbs[randomIndex];

    const sessionId = createSessionId();

    const { error: sessionInsertErr } = await supabase
      .from("training_sessions")
      .insert({
        id: sessionId,
        student_id: user.id,
        exercise_type: "irregular",
        status: "started",
        context_slug: null,
        context_id: null,
        question_count: pinnedIds.length,
        metadata: {
          source: "manual",
        },
      });

    if (sessionInsertErr) {
      console.error("[training/irregular/start] training_sessions insert failed:", sessionInsertErr);
      return NextResponse.json(
        { error: sessionInsertErr.message, code: "SESSION_INSERT_FAILED" },
        { status: 500 }
      );
    }

    const firstVerb: FirstVerbDto = {
      id: selectedVerb.id,
      base: selectedVerb.base,
      past_simple: selectedVerb.past_simple,
      past_simple_variants: selectedVerb.past_simple_variants ?? [],
      past_participle: selectedVerb.past_participle,
      past_participle_variants: selectedVerb.past_participle_variants ?? [],
    };

    return NextResponse.json({
      sessionId,
      firstVerb,
      total: pinnedIds.length,
    });
  } catch (e: unknown) {
    console.error("[training/irregular/start] Error:", e);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
