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

    const { error: insErr } = await supabase.from("vocab_exercise_runs").insert({
      student_id,
      mode,
      term_en_norm,
      correct,
      chosen,
      masked,
      source,
    });

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
