import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

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
    const slug = body.slug?.trim();

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const sessionId = createSessionId();

    const { error: sessionInsertErr } = await supabase
      .from("training_sessions")
      .insert({
        id: sessionId,
        student_id: user.id,
        exercise_type: "grammar",
        status: "started",
        context_slug: slug,
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
