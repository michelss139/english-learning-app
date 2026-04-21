import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserIdFromApiRequest } from "@/lib/auth/adminApiAuth";

type PatternType = "collocation" | "preposition" | "complement";

type PatternInput = {
  type?: unknown;
  pattern?: unknown;
  example_en?: unknown;
  example_pl?: unknown;
};

type Body = {
  sense_id?: unknown;
  patterns?: unknown;
};

const ALLOWED_PATTERN_TYPES = new Set<PatternType>(["collocation", "preposition", "complement"]);
const MAX_PATTERNS = 10;

function cleanRequiredString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePattern(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseAdmin();

    const userId = await getUserIdFromApiRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized — sign in or send Authorization: Bearer <token>" },
        { status: 401 }
      );
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profErr || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const sense_id = cleanRequiredString(body?.sense_id);
    const rawPatterns = body?.patterns;

    if (!sense_id) {
      return NextResponse.json({ error: "sense_id is required" }, { status: 400 });
    }

    if (!Array.isArray(rawPatterns)) {
      return NextResponse.json({ error: "patterns must be an array" }, { status: 400 });
    }

    if (rawPatterns.length > MAX_PATTERNS) {
      return NextResponse.json({ error: `patterns must contain at most ${MAX_PATTERNS} items` }, { status: 400 });
    }

    const { data: existingPatternRows, error: fetchErr } = await supabase
      .from("lexicon_patterns")
      .select("pattern")
      .eq("sense_id", sense_id);

    if (fetchErr) {
      return NextResponse.json({ error: `Failed to fetch existing patterns: ${fetchErr.message}` }, { status: 500 });
    }

    const existingPatternSet = new Set(
      (existingPatternRows ?? []).map((row) => normalizePattern(cleanRequiredString(row.pattern))).filter(Boolean)
    );

    const seenInRequest = new Set<string>();
    const patternsToInsert: Array<{ sense_id: string; pattern: string }> = [];
    let skipped = 0;

    for (const raw of rawPatterns as PatternInput[]) {
      const type = cleanRequiredString(raw?.type) as PatternType;
      const pattern = cleanRequiredString(raw?.pattern);
      const example_en = cleanRequiredString(raw?.example_en);
      const example_pl = cleanOptionalString(raw?.example_pl);

      void example_pl;

      if (!ALLOWED_PATTERN_TYPES.has(type) || !pattern || !example_en) {
        skipped++;
        continue;
      }

      const normalizedPattern = normalizePattern(pattern);
      if (!normalizedPattern) {
        skipped++;
        continue;
      }

      if (existingPatternSet.has(normalizedPattern) || seenInRequest.has(normalizedPattern)) {
        skipped++;
        continue;
      }

      seenInRequest.add(normalizedPattern);
      patternsToInsert.push({
        sense_id,
        pattern: pattern.trim(),
      });
    }

    if (patternsToInsert.length > 0) {
      const { error: insertErr } = await supabase.from("lexicon_patterns").insert(patternsToInsert);
      if (insertErr) {
        return NextResponse.json({ error: `Failed to save patterns: ${insertErr.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      inserted: patternsToInsert.length,
      skipped,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
