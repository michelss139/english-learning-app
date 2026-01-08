import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normTerm(term: string): string {
  return term.trim().toLowerCase();
}

type Body = {
  term_en: string;
  level?: "A2" | "B1" | "B2";
  style?: "neutral" | "business" | "daily";
  force?: boolean;
};

async function openaiGenerateSentence(params: {
  term: string;
  level: "A2" | "B1" | "B2";
  style: "neutral" | "business" | "daily";
}) {
  const apiKey = requiredEnv("OPENAI_API_KEY");

  const model = "gpt-4.1-mini"; // szybki i tani do zdań; łatwo podmienisz w przyszłości :contentReference[oaicite:1]{index=1}

  const styleHint =
    params.style === "business"
      ? "context: business/work"
      : params.style === "daily"
      ? "context: daily life"
      : "context: neutral";

  const prompt = `
Generate ONE high-quality English example sentence for a language learner.
Constraints:
- CEFR level: ${params.level}
- ${styleHint}
- Must include the exact target term (case-insensitive) as a standalone word/phrase: "${params.term}"
- Natural, modern, learner-friendly. No idioms, no rare meanings, no slang, no archaic usage.
- 8–16 words.
- Output STRICT JSON only: {"sentence":"..."} with no extra keys.
`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: "system", content: "You output strictly valid JSON and nothing else." },
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

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Model did not return strict JSON: ${content}`);
  }

  const sentence = typeof parsed?.sentence === "string" ? parsed.sentence.trim() : "";
  if (!sentence) throw new Error("Missing sentence in model output.");

  return {
    sentence,
    model,
    usage: {
      // best-effort; different responses may include different token usage fields
      usage: json?.usage ?? null,
    },
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    const term_en = (body?.term_en ?? "").toString().trim();
    const level = (body?.level ?? "A2") as "A2" | "B1" | "B2";
    const style = (body?.style ?? "neutral") as "neutral" | "business" | "daily";
    const force = Boolean(body?.force);

    if (!term_en) {
      return NextResponse.json({ error: "term_en is required" }, { status: 400 });
    }

    // Auth: user token from header, verified via Supabase Admin
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

    const userId = userData.user.id;
    const term_en_norm = normTerm(term_en);

    // Fetch profile for premium gating
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, subscription_status, role")
      .eq("id", userId)
      .maybeSingle();

    if (profErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    const isAdmin = profile.role === "admin";
    const isPremium = profile.subscription_status === "active" || isAdmin;

    // Ensure enrichment row exists
    const { data: existing, error: existingErr } = await supabase
      .from("vocab_enrichments")
      .select("term_en_norm, example_en_manual, example_en_ai")
      .eq("term_en_norm", term_en_norm)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    // Rule 1: manual always wins and is free
    if (existing?.example_en_manual) {
      return NextResponse.json({
        ok: true,
        source: "manual",
        sentence: existing.example_en_manual,
      });
    }

    // Rule 2: if cached AI exists and not forcing, return it (no cost)
    if (existing?.example_en_ai && !force) {
      return NextResponse.json({
        ok: true,
        source: "ai_cache",
        sentence: existing.example_en_ai,
      });
    }

    // Rule 3: if not premium, block AI generation
    if (!isPremium) {
      return NextResponse.json(
        {
          error: "AI examples are available in Premium.",
          code: "PREMIUM_REQUIRED",
        },
        { status: 402 }
      );
    }

    // Generate with OpenAI
    const gen = await openaiGenerateSentence({ term: term_en_norm, level, style });

    // Upsert AI fields into cache
    const now = new Date().toISOString();

    const { error: upsertErr } = await supabase
      .from("vocab_enrichments")
      .upsert(
        {
          term_en_norm,
          example_en_ai: gen.sentence,
          example_en_ai_generated_at: now,
          example_en_ai_model: gen.model,
          example_en_ai_usage: gen.usage,
          example_en_ai_level: level,
          example_en_ai_style: style,
          updated_at: now,
        },
        { onConflict: "term_en_norm" }
      );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      source: "ai_generated",
      sentence: gen.sentence,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
