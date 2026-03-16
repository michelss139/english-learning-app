import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { loadClusterPageData, type ClusterTask } from "@/lib/vocab/clusterLoader";

type StartBody = {
  slug?: string;
  limit?: number | string;
  questionLimit?: number | string;
};

type StartResponse = {
  sessionId: string;
  questions: ClusterTask[];
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

function parseQuestionLimit(value: unknown): number {
  const raw = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(raw) || typeof raw !== "number" || raw <= 0) {
    return 10;
  }
  return Math.min(Math.max(Math.trunc(raw), 2), 20);
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
    const questionLimit = parseQuestionLimit(body.questionLimit ?? body.limit);

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const result = await loadClusterPageData({
      supabase,
      studentId: user.id,
      slug,
      limit: questionLimit,
      includeAnswers: true,
    });

    if (result.status === "not_found") {
      return NextResponse.json(
        { error: "Cluster not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const questions = shuffleArray(result.data.tasks).slice(0, questionLimit);
    const sessionId = createSessionId();

    const { error: sessionInsertErr } = await supabase
      .from("training_sessions")
      .insert({
        id: sessionId,
        student_id: user.id,
        exercise_type: "cluster",
        status: "started",
        context_slug: slug,
        context_id: result.data.cluster.id,
        question_count: questions.length,
        metadata: {
          limit: questionLimit,
          source: "manual",
        },
      });

    if (sessionInsertErr) {
      return NextResponse.json({ error: sessionInsertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      sessionId,
      questions,
    });
  } catch (e: unknown) {
    console.error("[training/cluster/start] Error:", e);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
