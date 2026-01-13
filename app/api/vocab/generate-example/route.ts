import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createHash } from "crypto";

/**
 * POST /api/vocab/generate-example
 * 
 * Generate a new example sentence for a specific sense.
 * Saves to lexicon_examples pool (limit 10 per sense, LRU rotation).
 */

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

type Body = {
  sense_id: string; // lexicon_senses.id
  level?: "A2" | "B1" | "B2";
  style?: "neutral" | "business" | "daily";
  force?: boolean; // Force regeneration even if limit reached
};

function hashExample(example: string): string {
  return createHash("sha256").update(example.trim().toLowerCase()).digest("hex").slice(0, 64);
}

async function openaiGenerateSentence(params: {
  term: string;
  definition: string;
  level: "A2" | "B1" | "B2";
  style: "neutral" | "business" | "daily";
}): Promise<string> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = "gpt-4o-mini";

  const styleHint =
    params.style === "business"
      ? "context: business/work"
      : params.style === "daily"
      ? "context: daily life"
      : "context: neutral";

  const prompt = `Generate ONE high-quality English example sentence for a language learner.

Context:
- Word: "${params.term}"
- Definition: "${params.definition}"
- CEFR level: ${params.level}
- ${styleHint}

Constraints:
- Must include the exact target word "${params.term}" (case-insensitive) as a standalone word/phrase
- Natural, modern, learner-friendly. No idioms, no rare meanings, no slang, no archaic usage.
- 8–16 words.
- Output STRICT JSON only: {"sentence":"..."} with no extra keys.`;

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

  return sentence;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    const sense_id = body?.sense_id;
    const level = (body?.level ?? "A2") as "A2" | "B1" | "B2";
    const style = (body?.style ?? "neutral") as "neutral" | "business" | "daily";
    const force = Boolean(body?.force);

    if (!sense_id) {
      return NextResponse.json({ error: "sense_id is required" }, { status: 400 });
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

    // Fetch profile for premium gating (optional - can remove if no paywall)
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, subscription_status, role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    const isAdmin = profile.role === "admin";
    const isPremium = profile.subscription_status === "active" || isAdmin;

    // For now, allow all authenticated users (no paywall)
    // if (!isPremium) {
    //   return NextResponse.json(
    //     {
    //       error: "AI examples are available in Premium.",
    //       code: "PREMIUM_REQUIRED",
    //     },
    //     { status: 402 }
    //   );
    // }

    // Fetch sense with entry to get lemma
    const { data: sense, error: senseErr } = await supabase
      .from("lexicon_senses")
      .select(
        `
        id,
        definition_en,
        lexicon_entries(lemma)
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

    const lemma = (sense.lexicon_entries as any)?.lemma;
    if (!lemma) {
      return NextResponse.json({ error: "Entry not found for sense" }, { status: 404 });
    }

    // Check current examples count
    const { data: existingExamples, error: countErr } = await supabase
      .from("lexicon_examples")
      .select("id, example_en, example_hash, created_at")
      .eq("sense_id", sense_id)
      .order("created_at", { ascending: true });

    if (countErr) {
      return NextResponse.json({ error: `Failed to check examples: ${countErr.message}` }, { status: 500 });
    }

    const currentCount = existingExamples?.length || 0;
    const MAX_EXAMPLES = 10;

    // If limit reached and not forcing, return random existing example
    if (currentCount >= MAX_EXAMPLES && !force) {
      const randomExample = existingExamples?.[Math.floor(Math.random() * existingExamples.length)];
      return NextResponse.json({
        ok: true,
        source: "pool_random",
        sentence: randomExample?.example_en || null,
        message: "Limit reached. Returning random example from pool.",
      });
    }

    // Generate new example with retry for duplicates
    let newSentence: string | null = null;
    let attempts = 0;
    const MAX_RETRIES = 2;

    while (attempts < MAX_RETRIES && !newSentence) {
      attempts++;
      try {
        const generated = await openaiGenerateSentence({
          term: lemma,
          definition: sense.definition_en,
          level,
          style,
        });

        const newHash = hashExample(generated);

        // Check for duplicate
        const isDuplicate = existingExamples?.some((ex) => ex.example_hash === newHash);

        if (!isDuplicate) {
          newSentence = generated;
        } else if (attempts >= MAX_RETRIES) {
          // Last attempt, use it anyway or return existing
          const randomExample = existingExamples?.[Math.floor(Math.random() * existingExamples.length)];
          return NextResponse.json({
            ok: true,
            source: "pool_random",
            sentence: randomExample?.example_en || null,
            message: "Generated duplicate after retries. Returning random example from pool.",
          });
        }
      } catch (e: any) {
        if (attempts >= MAX_RETRIES) {
          throw e;
        }
        // Retry on error
      }
    }

    if (!newSentence) {
      return NextResponse.json({ error: "Failed to generate unique example after retries" }, { status: 500 });
    }

    const newHash = hashExample(newSentence);

    // If at limit, delete oldest (LRU - delete by created_at)
    if (currentCount >= MAX_EXAMPLES && existingExamples && existingExamples.length > 0) {
      const oldestIds = existingExamples
        .slice(0, currentCount - MAX_EXAMPLES + 1)
        .map((ex) => ex.id);

      if (oldestIds.length > 0) {
        const { error: deleteErr } = await supabase.from("lexicon_examples").delete().in("id", oldestIds);

        if (deleteErr) {
          console.warn("[generate-example] Failed to delete old examples:", deleteErr);
          // Continue anyway
        }
      }
    }

    // Insert new example
    const { data: newExample, error: insertErr } = await supabase
      .from("lexicon_examples")
      .insert({
        sense_id,
        example_en: newSentence,
        source: "ai",
        example_hash: newHash,
      })
      .select("id, example_en")
      .single();

    if (insertErr) {
      // If duplicate hash error, return existing
      if (String(insertErr.message).toLowerCase().includes("unique")) {
        const randomExample = existingExamples?.[Math.floor(Math.random() * existingExamples.length)];
        return NextResponse.json({
          ok: true,
          source: "pool_random",
          sentence: randomExample?.example_en || null,
          message: "Example already exists. Returning random example from pool.",
        });
      }
      return NextResponse.json({ error: `Failed to save example: ${insertErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      source: "ai_generated",
      sentence: newExample.example_en,
    });
  } catch (e: any) {
    console.error("[generate-example] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
