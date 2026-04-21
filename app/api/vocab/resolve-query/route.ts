import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  query: string;
};

type ResolveCandidate = {
  lemma: string;
  confidence: number;
};

type ResolverModelResponse =
  | { status: "no_candidate" }
  | {
      status: "ok";
      candidates: ResolveCandidate[];
    };

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

function normLemma(value: string): string {
  return value.trim().toLowerCase();
}

function clampConfidence(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

async function resolveQueryCandidates(query: string): Promise<ResolveCandidate[]> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = "gpt-4.1";

  const prompt = `You resolve a user query to an existing English lemma for a vocabulary app.

Input query may be Polish or English: "${query}"

Goal:
- if the query is already English, return its base-form lemma
- if the query is Polish, return the most likely English lemma
- return only common everyday vocabulary
- prefer one candidate
- return at most 3 candidates

Rules:
- do not generate definitions
- do not generate translations
- do not generate examples
- do not guess
- if confidence is not high, return no_candidate
- if the query is nonsense, malformed, rare, technical, or inappropriate, return no_candidate

Return STRICT JSON only in exactly one of these shapes:
{"status":"no_candidate"}

or

{"status":"ok","candidates":[{"lemma":"radiator","confidence":0.93}]}

Candidate rules:
- lemma must be lowercase English base form
- confidence must be a number from 0 to 1
- candidates must be ordered best first
- prefer one candidate over many doubtful ones`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You return strictly valid JSON and nothing else. If you are not confident, return status no_candidate.",
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

  let cleanedContent = content.trim();
  if (cleanedContent.startsWith("```json")) {
    cleanedContent = cleanedContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanedContent.startsWith("```")) {
    cleanedContent = cleanedContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  cleanedContent = cleanedContent.trim();

  let parsed: ResolverModelResponse;
  try {
    parsed = JSON.parse(cleanedContent);
  } catch {
    throw new Error(`Model did not return valid JSON: ${cleanedContent.substring(0, 200)}`);
  }

  if (parsed.status === "no_candidate") {
    return [];
  }

  if (parsed.status !== "ok" || !Array.isArray(parsed.candidates)) {
    throw new Error("Invalid resolver response.");
  }

  const deduped = new Map<string, ResolveCandidate>();
  for (const rawCandidate of parsed.candidates.slice(0, 3)) {
    const lemma = normLemma(rawCandidate?.lemma ?? "");
    if (!lemma) continue;
    const confidence = clampConfidence(rawCandidate?.confidence);
    if (confidence <= 0) continue;
    if (!deduped.has(lemma)) {
      deduped.set(lemma, { lemma, confidence });
    }
  }

  return Array.from(deduped.values());
}

export async function POST(req: Request) {
  try {
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
    const query = (body?.query ?? "").toString().trim();

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const aiCandidates = await resolveQueryCandidates(query);
    if (aiCandidates.length === 0) {
      console.log(`[vocab/resolve-query] "${query}" -> []`);
      return NextResponse.json({ ok: false, reason: "no_candidate" });
    }

    const candidateLemmas = aiCandidates.map((candidate) => candidate.lemma);
    const { data: existingEntries, error: existingErr } = await supabase
      .from("lexicon_entries")
      .select("lemma_norm")
      .in("lemma_norm", candidateLemmas);

    if (existingErr) {
      return NextResponse.json({ error: `Failed to validate candidates: ${existingErr.message}` }, { status: 500 });
    }

    const existingLemmaSet = new Set((existingEntries ?? []).map((entry) => normLemma(String(entry.lemma_norm ?? ""))));
    const candidates = aiCandidates.filter((candidate) => existingLemmaSet.has(candidate.lemma)).slice(0, 3);

    console.log(`[vocab/resolve-query] "${query}" -> ${JSON.stringify(candidates.map((candidate) => candidate.lemma))}`);

    if (candidates.length === 0) {
      return NextResponse.json({ ok: false, reason: "no_candidate" });
    }

    return NextResponse.json({
      ok: true,
      candidates,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
