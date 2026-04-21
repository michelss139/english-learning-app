import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserIdFromApiRequest } from "@/lib/auth/adminApiAuth";

type Body = {
  sense_id?: string;
};

type PatternType = "collocation" | "preposition" | "complement";

type PatternPreview = {
  type: PatternType;
  pattern: string;
  example_en: string;
  example_pl: string | null;
};

type ModelResponse = {
  patterns?: Array<{
    type?: unknown;
    pattern?: unknown;
    example_en?: unknown;
    example_pl?: unknown;
  }>;
};

const ALLOWED_PATTERN_TYPES = new Set<PatternType>(["collocation", "preposition", "complement"]);
const MAX_PATTERNS = 7;
const MAX_PATTERN_LENGTH = 120;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanRequiredString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parseStrictJsonContent(content: string): ModelResponse {
  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  return JSON.parse(cleaned.trim()) as ModelResponse;
}

async function openaiGeneratePatterns(params: {
  lemma: string;
  pos: string;
  definition_en: string;
  existingPatterns: string[];
}): Promise<PatternPreview[]> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = "gpt-4o-mini";

  const existingPatternsText =
    params.existingPatterns.length > 0 ? params.existingPatterns.map((pattern) => `- ${pattern}`).join("\n") : "(none)";

  const prompt = `You are a linguist generating high-quality English usage patterns.

Rules:
- Focus ONLY on the given sense
- Do NOT mix meanings
- Do NOT repeat existing patterns
- Avoid duplicates and near-duplicates
- Prefer fewer, high-quality patterns
- Max 7 patterns
- Use simple canonical forms
- Patterns must be usable in exercises
- Include only common, real usage

Allowed types:
- collocation
- preposition
- complement

Return STRICT JSON only in this format:
{
  "patterns": [
    {
      "type": "collocation",
      "pattern": "example pattern",
      "example_en": "Example sentence.",
      "example_pl": "Optional Polish translation."
    }
  ]
}

Rules:
- No markdown
- No explanations
- No extra fields

Lemma: ${params.lemma}
Part of speech: ${params.pos}
Definition: ${params.definition_en}

Existing patterns (DO NOT repeat or rephrase these):
${existingPatternsText}

Generate NEW usage patterns for this exact meaning.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You output strictly valid JSON and nothing else.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${text}`);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`OpenAI response not JSON: ${text}`);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned empty content.");
  }

  let parsed: ModelResponse;
  try {
    parsed = parseStrictJsonContent(content);
  } catch {
    throw new Error(`Model did not return strict JSON: ${content}`);
  }

  if (!Array.isArray(parsed.patterns)) {
    return [];
  }

  const existingSet = new Set(params.existingPatterns.map((pattern) => normalizeForComparison(pattern)));
  const seen = new Set<string>();
  const cleanedPatterns: PatternPreview[] = [];

  for (const raw of parsed.patterns.slice(0, MAX_PATTERNS)) {
    const type = cleanRequiredString(raw?.type) as PatternType;
    const pattern = cleanRequiredString(raw?.pattern);
    const example_en = cleanRequiredString(raw?.example_en);
    const example_pl = cleanOptionalString(raw?.example_pl);

    if (!ALLOWED_PATTERN_TYPES.has(type)) continue;
    if (!pattern || !example_en) continue;
    if (pattern.length > MAX_PATTERN_LENGTH) continue;

    const normalizedPattern = normalizeForComparison(pattern);
    if (!normalizedPattern) continue;
    if (existingSet.has(normalizedPattern)) continue;
    if (seen.has(normalizedPattern)) continue;

    seen.add(normalizedPattern);
    cleanedPatterns.push({
      type,
      pattern,
      example_en,
      example_pl,
    });
  }

  return cleanedPatterns;
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

    if (!sense_id) {
      return NextResponse.json({ error: "sense_id is required" }, { status: 400 });
    }

    const { data: sense, error: senseErr } = await supabase
      .from("lexicon_senses")
      .select(
        `
        id,
        definition_en,
        lexicon_entries!inner(
          lemma,
          pos
        )
      `
      )
      .eq("id", sense_id)
      .maybeSingle();

    if (senseErr) {
      return NextResponse.json({ error: `Failed to fetch sense: ${senseErr.message}` }, { status: 500 });
    }

    if (!sense) {
      return NextResponse.json({ error: "Sense not found" }, { status: 404 });
    }

    const entryRaw = sense.lexicon_entries;
    const entry = Array.isArray(entryRaw) ? entryRaw[0] : entryRaw;
    const lemma = cleanRequiredString((entry as { lemma?: string } | null)?.lemma);
    const pos = cleanRequiredString((entry as { pos?: string } | null)?.pos);
    const definition_en = cleanRequiredString(sense.definition_en);

    if (!lemma || !pos || !definition_en) {
      return NextResponse.json({ error: "Sense is missing required lexicon data" }, { status: 500 });
    }

    const { data: existingPatternRows, error: patternErr } = await supabase
      .from("lexicon_patterns")
      .select("pattern")
      .eq("sense_id", sense_id);

    if (patternErr) {
      return NextResponse.json({ error: `Failed to fetch existing patterns: ${patternErr.message}` }, { status: 500 });
    }

    const existingPatterns = (existingPatternRows ?? [])
      .map((row) => cleanRequiredString(row.pattern))
      .filter(Boolean);

    const patterns = await openaiGeneratePatterns({
      lemma,
      pos,
      definition_en,
      existingPatterns,
    });

    return NextResponse.json({
      sense: {
        sense_id,
        lemma,
        definition: definition_en,
      },
      patterns,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
