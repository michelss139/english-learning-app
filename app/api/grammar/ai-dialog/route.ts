import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

type Body = {
  tense1: string;
  tense2: string;
  force?: boolean;
};

async function openaiGenerateDialog(params: {
  tense1: string;
  tense2: string;
  tense1Title: string;
  tense2Title: string;
  isComparison: boolean;
}) {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = "gpt-4o-mini"; // Fast and cost-effective

  let prompt: string;

  if (params.isComparison && params.tense1 !== params.tense2) {
    // Comparison dialog
    prompt = `Generate a short English dialogue (4-6 lines) for A2/B1 level learners that contrasts two grammatical tenses: ${params.tense1Title} and ${params.tense2Title}.

Requirements:
- Level: A2/B1 (simple, clear English)
- Length: 4-6 lines of dialogue between two people
- Purpose: Show the difference between ${params.tense1Title} and ${params.tense2Title} in natural conversation
- Highlight verb forms: Use **bold** to mark verb forms that demonstrate each tense
- Natural and practical: Use everyday situations
- Clear contrast: Make it obvious when each tense is used

Format: Return ONLY the dialogue text, with each line on a new line. Use **bold** for verb forms.

Example format:
A: I **work** every day.
B: I **am working** right now.
A: I **worked** yesterday.
B: I **have worked** here for two years.

Generate the dialogue:`;
  } else {
    // Single tense dialog
    prompt = `Generate a short English dialogue (4-6 lines) for A2/B1 level learners demonstrating the ${params.tense1Title} tense.

Requirements:
- Level: A2/B1 (simple, clear English)
- Length: 4-6 lines of dialogue between two people
- Purpose: Show practical usage of ${params.tense1Title} in natural conversation
- Highlight verb forms: Use **bold** to mark verb forms that demonstrate ${params.tense1Title}
- Natural and practical: Use everyday situations
- Clear examples: Make it obvious when ${params.tense1Title} is used

Format: Return ONLY the dialogue text, with each line on a new line. Use **bold** for verb forms.

Example format (for Present Simple):
A: I **work** every day.
B: What time do you **start**?
A: I **start** at nine o'clock.
B: Do you **like** your job?

Generate the dialogue:`;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "You are a helpful English language teacher. Generate clear, educational dialogues for language learners.",
        },
        { role: "user", content: prompt.trim() },
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

  return {
    dialog: content.trim(),
    model,
    usage: json?.usage || {},
  };
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
      tense1Title = "Stative Verbs";
    } else {
      const tense1Data = getGrammarTenseBySlug(tense1 as any);
      if (!tense1Data) {
        return NextResponse.json({ error: `Invalid tense slug: ${tense1}` }, { status: 400 });
      }
      tense1Title = tense1Data.title;
    }
    
    if (tense2 === "stative-verbs") {
      tense2Title = "Stative Verbs";
    } else {
      const tense2Data = getGrammarTenseBySlug(tense2 as any);
      if (!tense2Data) {
        return NextResponse.json({ error: `Invalid tense slug: ${tense2}` }, { status: 400 });
      }
      tense2Title = tense2Data.title;
    }

    // Generate with OpenAI
    const isComparison = tense1 !== tense2;
    const gen = await openaiGenerateDialog({
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
