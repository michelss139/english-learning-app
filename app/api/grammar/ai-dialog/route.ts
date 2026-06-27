import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { GrammarTenseSlug } from "@/lib/grammar/types";

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

const DIALOG_MODEL = "claude-sonnet-4-6";

type Body = {
  tense1: string;
  tense2: string;
  force?: boolean;
};

async function generateDialog(params: {
  tense1: string;
  tense2: string;
  tense1Title: string;
  tense2Title: string;
  isComparison: boolean;
}) {
  const apiKey = requiredEnv("ANTHROPIC_API_KEY");
  const client = new Anthropic({ apiKey });

  const prompt =
    params.isComparison && params.tense1 !== params.tense2
      ? `Write a short, natural English dialogue (5-7 lines) for A2/B1 learners that clearly CONTRASTS two tenses: ${params.tense1Title} and ${params.tense2Title}.

Rules:
- Everyday, realistic situation (work, travel, home, plans…).
- Each line starts with "A:" or "B:".
- Use **bold** ONLY on the verb form that demonstrates one of the two tenses.
- Make the contrast obvious: some lines use ${params.tense1Title}, others ${params.tense2Title}.
- Simple, correct A2/B1 English. No translations, no explanations.

Return ONLY the dialogue lines, nothing else.`
      : `Write a short, natural English dialogue (5-7 lines) for A2/B1 learners that clearly demonstrates the ${params.tense1Title} tense.

Rules:
- Everyday, realistic situation.
- Each line starts with "A:" or "B:".
- Use **bold** ONLY on the verb forms that demonstrate ${params.tense1Title}.
- Simple, correct A2/B1 English. No translations, no explanations.

Return ONLY the dialogue lines, nothing else.`;

  const msg = await client.messages.create({
    model: DIALOG_MODEL,
    max_tokens: 600,
    system:
      "You are an expert English teacher. You write clear, natural, level-appropriate dialogues that make grammar visible. You output only the dialogue, never commentary.",
    messages: [{ role: "user", content: prompt }],
  });

  const content = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!content) throw new Error("Model returned empty content.");

  return { dialog: content, model: DIALOG_MODEL };
}

/**
 * GET /api/grammar/ai-dialog?key=...
 * Returns cached dialog if available
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "key parameter is required" }, { status: 400 });
    }

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

    // Fetch from cache
    const { data: cached, error: cacheErr } = await supabase
      .from("grammar_ai_dialog_cache")
      .select("key, content, created_at")
      .eq("key", key)
      .maybeSingle();

    if (cacheErr) {
      return NextResponse.json({ error: cacheErr.message }, { status: 500 });
    }

    if (!cached) {
      return NextResponse.json({ ok: false, cached: false, dialog: null });
    }

    return NextResponse.json({
      ok: true,
      cached: true,
      dialog: cached.content,
      created_at: cached.created_at,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

/**
 * POST /api/grammar/ai-dialog
 * Generates AI dialog and saves to cache
 */
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

    const body = (await req.json().catch(() => null)) as Body | null;
    const tense1 = (body?.tense1 ?? "").toString().trim();
    const tense2 = (body?.tense2 ?? "").toString().trim();
    const force = Boolean(body?.force);

    if (!tense1 || !tense2) {
      return NextResponse.json({ error: "tense1 and tense2 are required" }, { status: 400 });
    }

    // Generate cache key (normalize order)
    const slugs = [tense1, tense2].sort();
    const cacheKey = `${slugs[0]}__${slugs[1]}__v1`;

    // Check cache first (unless forcing)
    if (!force) {
      const { data: cached, error: cacheErr } = await supabase
        .from("grammar_ai_dialog_cache")
        .select("key, content, created_at")
        .eq("key", cacheKey)
        .maybeSingle();

      if (cacheErr) {
        return NextResponse.json({ error: cacheErr.message }, { status: 500 });
      }

      if (cached) {
        return NextResponse.json({
          ok: true,
          source: "cache",
          dialog: cached.content,
          created_at: cached.created_at,
        });
      }
    }

    // Get tense titles for prompt
    const { getGrammarTenseBySlug } = await import("@/lib/grammar/content");
    
    // Handle special case: stative-verbs
    let tense1Title = tense1;
    let tense2Title = tense2;
    
    if (tense1 === "stative-verbs") {
      tense1Title = "Czasowniki statyczne";
    } else {
      const tense1Data = getGrammarTenseBySlug(tense1 as GrammarTenseSlug);
      if (!tense1Data) {
        return NextResponse.json({ error: `Invalid tense slug: ${tense1}` }, { status: 400 });
      }
      tense1Title = tense1Data.title;
    }
    
    if (tense2 === "stative-verbs") {
      tense2Title = "Czasowniki statyczne";
    } else {
      const tense2Data = getGrammarTenseBySlug(tense2 as GrammarTenseSlug);
      if (!tense2Data) {
        return NextResponse.json({ error: `Invalid tense slug: ${tense2}` }, { status: 400 });
      }
      tense2Title = tense2Data.title;
    }

    // Generate with Anthropic (Sonnet)
    const isComparison = tense1 !== tense2;
    const gen = await generateDialog({
      tense1,
      tense2,
      tense1Title,
      tense2Title,
      isComparison,
    });

    // Save to cache
    const now = new Date().toISOString();

    const { error: upsertErr } = await supabase
      .from("grammar_ai_dialog_cache")
      .upsert(
        {
          key: cacheKey,
          content: gen.dialog,
          created_at: now,
          updated_at: now,
        },
        { onConflict: "key" }
      );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      source: "generated",
      dialog: gen.dialog,
      model: gen.model,
      created_at: now,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
