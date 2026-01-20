import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  mode: "gap";
  term_en_norm: string;
  correct: boolean;
  chosen?: string | null;
  masked?: string | null;
  source?: "manual" | "ai" | "open" | null;
};

function normTerm(s: string) {
  return s.trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;

    const mode = body?.mode;
    const term_en_norm = normTerm(body?.term_en_norm ?? "");
    const correct = Boolean(body?.correct);
    const chosen = (body?.chosen ?? null) as string | null;
    const masked = (body?.masked ?? null) as string | null;
    const source = (body?.source ?? null) as Body["source"];

    if (mode !== "gap") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    if (!term_en_norm) {
      return NextResponse.json({ error: "term_en_norm is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const student_id = userData.user.id;

    // Legacy endpoint - vocab_exercise_runs is deprecated
    // All new features should log to vocab_answer_events instead
    // This endpoint is kept for backward compatibility but no longer writes data
    // TODO: Remove this endpoint once all clients are migrated to vocab_answer_events

    return NextResponse.json({ ok: true, deprecated: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
