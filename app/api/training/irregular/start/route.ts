import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type TrainMode = "both" | "past_simple" | "past_participle";
type StartMode = "manual" | "targeted" | "lesson_verbs";
type SessionForm = "past_simple" | "past_participle" | "both";

type FirstVerbDto = {
  id: string;
  base: string;
  past_simple: string;
  past_simple_variants: string[];
  past_participle: string;
  past_participle_variants: string[];
};

type TargetItem = {
  verbId: string;
  form: "past_simple" | "past_participle";
};

type SessionItemDto = {
  verb: FirstVerbDto;
  form: SessionForm;
};

type StartResponse = {
  sessionId: string;
  firstVerb?: FirstVerbDto;
  total: number;
  startMode: StartMode;
  mode: TrainMode;
  sessionItems?: SessionItemDto[];
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

function normalizeMode(value: unknown): TrainMode {
  if (value === "past_simple" || value === "past_participle" || value === "both") {
    return value;
  }
  return "both";
}

function normalizeStartMode(value: unknown): StartMode {
  if (value === "targeted" || value === "lesson_verbs") return value;
  return "manual";
}

function toVerbDto(verb: {
  id: string;
  base: string;
  past_simple: string;
  past_simple_variants: string[] | null;
  past_participle: string;
  past_participle_variants: string[] | null;
}): FirstVerbDto {
  return {
    id: verb.id,
    base: verb.base,
    past_simple: verb.past_simple,
    past_simple_variants: verb.past_simple_variants ?? [],
    past_participle: verb.past_participle,
    past_participle_variants: verb.past_participle_variants ?? [],
  };
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

    const body = (await req.json().catch(() => null)) as
      | {
          startMode?: StartMode;
          mode?: TrainMode;
          targets?: TargetItem[];
          lessonVerbs?: string[];
        }
      | null;
    const startMode = normalizeStartMode(body?.startMode);
    const mode = normalizeMode(body?.mode);

    if (startMode === "lesson_verbs") {
      const rawList = Array.isArray(body?.lessonVerbs) ? body.lessonVerbs : [];
      const tokens = [...new Set(rawList.map((v) => String(v).trim().toLowerCase()).filter(Boolean))];

      if (tokens.length < 1) {
        return NextResponse.json(
          { error: "lessonVerbs must include at least one verb", code: "MISSING_LESSON_VERBS" },
          { status: 400 }
        );
      }

      if (tokens.length > 40) {
        return NextResponse.json(
          { error: "lessonVerbs may contain at most 40 items", code: "TOO_MANY_LESSON_VERBS" },
          { status: 400 }
        );
      }

      const { data: verbs, error: verbsError } = await supabase
        .from("irregular_verbs")
        .select("id, base, base_norm, past_simple, past_simple_variants, past_participle, past_participle_variants")
        .in("base_norm", tokens);

      if (verbsError) {
        console.error("[training/irregular/start] Error fetching lesson_verbs:", verbsError);
        return NextResponse.json(
          { error: verbsError.message, code: "VERBS_LOAD_FAILED" },
          { status: 500 }
        );
      }

      const byNorm = new Map((verbs ?? []).map((v) => [String(v.base_norm), v]));
      const ordered = tokens.map((t) => byNorm.get(t)).filter(Boolean) as NonNullable<typeof verbs>;
      if (ordered.length < 1) {
        return NextResponse.json(
          { error: "no lesson verbs matched the irregular verbs database", code: "LESSON_VERBS_NOT_FOUND" },
          { status: 400 }
        );
      }

      const sessionItems: SessionItemDto[] = ordered.map((verb) => ({
        verb: toVerbDto(verb),
        form: "both",
      }));

      const sessionId = createSessionId();
      const { error: sessionInsertErr } = await supabase.from("training_sessions").insert({
        id: sessionId,
        student_id: user.id,
        exercise_type: "irregular",
        status: "started",
        context_slug: null,
        context_id: null,
        question_count: sessionItems.length,
        metadata: {
          source: "lesson_verbs",
          lesson_verbs_isolated: true,
          mode,
          items: sessionItems.length,
        },
      });

      if (sessionInsertErr) {
        console.error("[training/irregular/start] training_sessions insert failed:", sessionInsertErr);
        return NextResponse.json(
          { error: sessionInsertErr.message, code: "SESSION_INSERT_FAILED" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        sessionId,
        total: sessionItems.length,
        startMode,
        mode,
        sessionItems,
      });
    }

    if (startMode === "targeted") {
      const targets = Array.isArray(body?.targets) ? body.targets : [];

      if (targets.length < 1) {
        return NextResponse.json(
          { error: "targets are required for targeted mode", code: "MISSING_TARGETS" },
          { status: 400 }
        );
      }

      if (targets.length > 5) {
        return NextResponse.json(
          { error: "targets may contain at most 5 items", code: "TOO_MANY_TARGETS" },
          { status: 400 }
        );
      }

      const invalidTarget = targets.find(
        (target) =>
          !target ||
          typeof target.verbId !== "string" ||
          !target.verbId ||
          (target.form !== "past_simple" && target.form !== "past_participle")
      );

      if (invalidTarget) {
        return NextResponse.json(
          { error: "invalid target item", code: "INVALID_TARGET" },
          { status: 400 }
        );
      }

      const targetVerbIds = Array.from(new Set(targets.map((target) => target.verbId)));
      const { data: verbs, error: verbsError } = await supabase
        .from("irregular_verbs")
        .select("id, base, past_simple, past_simple_variants, past_participle, past_participle_variants")
        .in("id", targetVerbIds);

      if (verbsError) {
        console.error("[training/irregular/start] Error fetching targeted verbs:", verbsError);
        return NextResponse.json(
          { error: verbsError.message, code: "VERBS_LOAD_FAILED" },
          { status: 500 }
        );
      }

      const verbMap = new Map((verbs ?? []).map((verb) => [verb.id, toVerbDto(verb)]));
      const missingTarget = targets.find((target) => !verbMap.has(target.verbId));
      if (missingTarget) {
        return NextResponse.json(
          { error: "one or more targets were not found", code: "TARGET_NOT_FOUND" },
          { status: 400 }
        );
      }

      const sessionItems: SessionItemDto[] = targets.map((target) => ({
        verb: verbMap.get(target.verbId)!,
        form: target.form,
      }));

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
          question_count: sessionItems.length,
          metadata: {
            source: "targeted",
            mode,
            targetsCount: sessionItems.length,
          },
        });

      if (sessionInsertErr) {
        console.error("[training/irregular/start] training_sessions insert failed:", sessionInsertErr);
        return NextResponse.json(
          { error: sessionInsertErr.message, code: "SESSION_INSERT_FAILED" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        sessionId,
        total: sessionItems.length,
        startMode,
        mode,
        sessionItems,
      });
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
          mode,
        },
      });

    if (sessionInsertErr) {
      console.error("[training/irregular/start] training_sessions insert failed:", sessionInsertErr);
      return NextResponse.json(
        { error: sessionInsertErr.message, code: "SESSION_INSERT_FAILED" },
        { status: 500 }
      );
    }

    const firstVerb: FirstVerbDto = toVerbDto(selectedVerb);

    return NextResponse.json({
      sessionId,
      firstVerb,
      total: pinnedIds.length,
      startMode,
      mode,
    });
  } catch (e: unknown) {
    console.error("[training/irregular/start] Error:", e);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
