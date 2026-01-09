import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function normTerm(term: string) {
  return term.trim().toLowerCase();
}

function maskWord(sentence: string, term: string) {
  const regex = new RegExp(`\\b${term}\\b`, "i");
  return sentence.replace(regex, "____");
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function POST(req: Request) {
  try {
    // Auth: verify JWT token
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

    // Continue with build-gap-test logic
    const body = await req.json();
    const term_en = body?.term_en?.toString().trim();

    if (!term_en) {
      return NextResponse.json({ error: "term_en required" }, { status: 400 });
    }

    const term_norm = normTerm(term_en);

    // get example from enrichments
    const { data: enrich, error: enrichErr } = await supabase
      .from("vocab_enrichments")
      .select("example_en_manual, example_en_ai, example_en")
      .eq("term_en_norm", term_norm)
      .maybeSingle();

    if (enrichErr || !enrich) {
      return NextResponse.json({ error: "No enrichment found" }, { status: 404 });
    }

    const sentence =
      enrich.example_en_manual ||
      enrich.example_en_ai ||
      enrich.example_en ||
      null;

    if (!sentence) {
      return NextResponse.json({ error: "No example sentence available" }, { status: 404 });
    }

    if (!sentence.toLowerCase().includes(term_norm)) {
      return NextResponse.json({ error: "Term not found in sentence" }, { status: 400 });
    }

    const masked = maskWord(sentence, term_norm);

    // naive distractors for now – we will improve later
    const base = term_norm;
    const distractors = [
      base.slice(0, -1),
      base + "s",
      base + "ing",
    ].filter((x) => x && x !== base);

    const options = shuffle([
      base,
      ...distractors.slice(0, 3),
    ]).slice(0, 4);

    return NextResponse.json({
      ok: true,
      original: sentence,
      masked,
      correct: base,
      options,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
