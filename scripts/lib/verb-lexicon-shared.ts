/**
 * Shared OpenAI + Supabase helpers for verb lexicon generation scripts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const MODEL = "gpt-4.1";
export const DELAY_MS = 400;

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1";

export const CEFR_LEVELS: readonly CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"];

export type EnrichPayload = {
  translation_pl: string;
  definition_en: string;
  examples: string[];
  patterns: string[];
  level: CefrLevel;
};

export function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "OPENAI_API_KEY"): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function parseLimit(): number | null {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return null;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** PREMIUM enrich prompt (same for missing + by-topic). */
export function buildEnrichPrompt(lemma: string): string {
  return `Given the English verb: ${lemma}

Your task is to generate high-quality vocabulary data for a language learning app.

CRITICAL REQUIREMENTS:
- Focus ONLY on the most common, everyday meaning of the verb
- Ignore rare, technical, or idiomatic meanings
- Output must sound natural to a native speaker
- Avoid textbook or dictionary-like phrasing

---

1. TRANSLATION (Polish)
- Most natural and common translation
- Avoid overly formal or rare words

---

2. DEFINITION (English)
- Simple, learner-friendly (A2–B1 level)
- One short sentence
- Must explain meaning clearly, not vaguely

GOOD:
"He runs a business." → "to manage or operate something"

BAD:
"to perform an activity" ❌

---

3. EXAMPLES (2 sentences)
- Natural, everyday situations
- Short (max ~10 words)
- No complex grammar
- No artificial sentences

GOOD:
"I run every morning."
"She runs a small shop."

BAD:
"He executes running behavior daily." ❌

---

4. PATTERNS (2–3 items)

IMPORTANT: distinguish types

A) STRUCTURE PATTERNS (grammar):
- "run + business"
- "run + quickly"
- "run + away"

B) COMMON PHRASES (natural collocations):
- "run out of time"
- "run a company"

Rules:
- Only include patterns that are COMMON
- Avoid obscure phrasal verbs unless very frequent
- Keep patterns short and usable in exercises

---

5. LEVEL (CEFR)
Choose:
A1, A2, B1, B2, C1

Rules:
- A1/A2 = very common verbs (go, make, take)
- B1 = daily usage verbs
- B2+ = more abstract or specific verbs

---

# OUTPUT FORMAT (STRICT JSON)

{
  "translation_pl": "...",
  "definition_en": "...",
  "examples": ["...", "..."],
  "patterns": ["...", "..."],
  "level": "B1"
}

---

# ABSOLUTE RULES

- No placeholders ("something", "someone") unless necessary
- No academic tone
- No long sentences
- No rare meanings
- Everything must feel like real English

---

Return ONLY JSON.`;
}

export function stripJsonFence(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : t;
}

export function parseVerbArray(text: string): string[] {
  const parsed = JSON.parse(stripJsonFence(text)) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Expected JSON array of verb strings");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== "string") continue;
    const raw = item.trim().replace(/\s+/g, " ");
    if (!raw) continue;
    if (raw.length > 48) continue;
    if (!/^[\p{L}\s'-]+$/u.test(raw)) continue;
    const norm = raw.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(raw);
  }
  return out;
}

export function parseCefrLevel(raw: unknown): CefrLevel {
  if (typeof raw !== "string") throw new Error("Invalid enrich JSON: level");
  const norm = raw.trim().toUpperCase();
  const map: Record<string, CefrLevel> = { A1: "A1", A2: "A2", B1: "B1", B2: "B2", C1: "C1" };
  const level = map[norm];
  if (!level) throw new Error(`Invalid enrich JSON: level must be one of ${CEFR_LEVELS.join(", ")}`);
  return level;
}

export function parseEnrichJson(text: string): EnrichPayload {
  const raw = JSON.parse(stripJsonFence(text)) as Record<string, unknown>;
  const translation_pl = typeof raw.translation_pl === "string" ? raw.translation_pl.trim() : "";
  const definition_en = typeof raw.definition_en === "string" ? raw.definition_en.trim() : "";
  const ex = raw.examples;
  const examples = Array.isArray(ex)
    ? ex.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
    : [];
  const pat = raw.patterns;
  const patterns = Array.isArray(pat)
    ? pat.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
    : [];
  if (!translation_pl) throw new Error("Invalid enrich JSON: translation_pl");
  if (!definition_en) throw new Error("Invalid enrich JSON: definition_en");
  if (examples.length < 2) throw new Error("Invalid enrich JSON: need 2 examples");
  if (patterns.length < 2) throw new Error("Invalid enrich JSON: need at least 2 patterns");
  const level = parseCefrLevel(raw.level);
  return {
    translation_pl,
    definition_en,
    examples: examples.slice(0, 2),
    patterns: [...new Set(patterns.map((p) => p.trim()))].slice(0, 3),
    level,
  };
}

export async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [
        {
          role: "system",
          content:
            "You produce strict JSON only (a JSON array or one JSON object as the user asks). Valid UTF-8, no markdown fences or commentary. For lexical strings, sound natural to native speakers.",
        },
        { role: "user", content: prompt },
      ],
      text: { format: { type: "text" } },
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenAI ${response.status}: ${body}`);
  }
  const data = (await response.json()) as unknown;
  const text = extractResponseText(data);
  if (!text) throw new Error("OpenAI: empty text");
  return text;
}

export async function callOpenAIWithRetry(prompt: string): Promise<string> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await callOpenAI(prompt);
    } catch (e) {
      last = e;
      if (attempt < 2) await sleep(1500 * (attempt + 1));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export function isDuplicateKeyError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const c = (e as { code?: string }).code;
  return c === "23505";
}

export function extractResponseText(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const response = raw as {
    output?: Array<{ content?: Array<{ type?: unknown; text?: unknown }> }>;
  };
  if (!Array.isArray(response.output)) return "";
  const chunks: string[] = [];
  for (const outputItem of response.output) {
    if (!outputItem?.content) continue;
    for (const c of outputItem.content) {
      const tv = c?.text;
      if (typeof tv === "string" && tv.length > 0) chunks.push(tv);
      else if (tv && typeof tv === "object" && "value" in tv) {
        const v = (tv as { value?: unknown }).value;
        if (typeof v === "string" && v.length > 0) chunks.push(v);
      }
    }
  }
  return chunks.join("").trim();
}

export async function loadExistingVerbLemmaNorms(
  supabase: SupabaseClient,
  includeIrregular: boolean,
): Promise<Set<string>> {
  const out = new Set<string>();

  const { data: lexRows, error: lexErr } = await supabase.from("lexicon_entries").select("lemma_norm").eq("pos", "verb");

  if (lexErr) throw new Error(`lexicon_entries: ${lexErr.message}`);
  for (const r of lexRows ?? []) {
    const s = (r as { lemma_norm?: string }).lemma_norm?.trim().toLowerCase();
    if (s) out.add(s);
  }

  if (includeIrregular) {
    const { data: irrRows, error: irrErr } = await supabase.from("irregular_verbs").select("base_norm");
    if (!irrErr) {
      for (const r of irrRows ?? []) {
        const s = (r as { base_norm?: string }).base_norm?.trim().toLowerCase();
        if (s) out.add(s);
      }
    }
  }

  return out;
}

export async function verbEntryExists(supabase: SupabaseClient, lemmaNorm: string): Promise<boolean> {
  const { data } = await supabase
    .from("lexicon_entries")
    .select("id")
    .eq("lemma_norm", lemmaNorm)
    .eq("pos", "verb")
    .maybeSingle();
  return Boolean(data?.id);
}

export async function insertVerbBundle(
  supabase: SupabaseClient,
  lemmaDisplay: string,
  lemmaNorm: string,
  payload: EnrichPayload,
  domain: string,
): Promise<void> {
  let entryId: string | null = null;
  try {
    const { data: entryRow, error: eIns } = await supabase
      .from("lexicon_entries")
      .insert({
        lemma: lemmaDisplay,
        lemma_norm: lemmaNorm,
        pos: "verb",
      })
      .select("id")
      .single();

    if (eIns) throw eIns;
    entryId = entryRow.id as string;

    const { data: senseRow, error: sIns } = await supabase
      .from("lexicon_senses")
      .insert({
        entry_id: entryId,
        definition_en: payload.definition_en,
        sense_order: 0,
        domain,
        cefr_level: payload.level,
      })
      .select("id")
      .single();

    if (sIns) throw sIns;
    const senseId = senseRow.id as string;

    const { error: trErr } = await supabase.from("lexicon_translations").insert({
      sense_id: senseId,
      translation_pl: payload.translation_pl,
    });
    if (trErr) throw trErr;

    for (const ex of payload.examples) {
      const { error: exErr } = await supabase.from("lexicon_examples").insert({
        sense_id: senseId,
        example_en: ex,
        source: "ai",
      });
      if (exErr) throw exErr;
    }

    for (const pat of payload.patterns) {
      const { error: pErr } = await supabase.from("lexicon_patterns").insert({
        sense_id: senseId,
        pattern: pat,
      });
      if (pErr && pErr.code !== "23505") throw pErr;
    }
  } catch (e) {
    if (entryId) {
      await supabase.from("lexicon_entries").delete().eq("id", entryId);
    }
    throw e;
  }
}
