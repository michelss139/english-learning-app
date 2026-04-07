/**
 * Enrich irregular verbs with lexicon data (translation, definition, examples, patterns).
 * Does not create new irregular_verbs rows; uses service role + OpenAI.
 */
import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const MODEL = "gpt-4.1";
const DELAY_MS = 400;
const DOMAIN_VERB = "verbs:irregular";
const MIN_EXAMPLES = 1;
const TARGET_EXAMPLES = 2;
const MIN_PATTERNS = 1;
const TARGET_PATTERNS = 3;

type IrregularRow = {
  id: string;
  base: string;
  base_norm: string;
  entry_id: string | null;
};

type GptResult = {
  translation_pl: string;
  definition_en: string;
  examples: string[];
  patterns: string[];
};

function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "OPENAI_API_KEY"): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseLimit(): number | null {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return null;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function buildPrompt(lemma: string): string {
  return [
    `Given the English verb: ${lemma}`,
    "",
    "Provide:",
    "- Polish translation",
    "- Simple learner-friendly definition (one short sentence)",
    "- 2 example sentences",
    "- 2–3 common usage patterns, mixing BOTH kinds:",
    "  • concrete phrases / collocations (e.g. \"run out of time\", \"abide by the rules\")",
    "  • grammar structures using \" + \" (e.g. \"be + adjective\", \"be + noun\")",
    "",
    "Rules:",
    "- focus on common meanings",
    "- avoid rare or advanced meanings",
    "- keep it practical",
    "- examples must be natural and short",
    "- include at least one phrase-style pattern and at least one structure-style pattern (with +) when possible",
    "",
    "Return only strict JSON (no markdown):",
    `{
  "translation_pl": "...",
  "definition_en": "...",
  "examples": ["...", "..."],
  "patterns": ["...", "..."]
}`,
  ].join("\n");
}

function stripJsonFence(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : t;
}

function parseGptJson(text: string): GptResult {
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
  if (!translation_pl) throw new Error("Invalid GPT JSON: translation_pl");
  if (!definition_en) throw new Error("Invalid GPT JSON: definition_en");
  if (examples.length < 2) throw new Error("Invalid GPT JSON: need 2 examples");
  if (patterns.length < 2) throw new Error("Invalid GPT JSON: need at least 2 patterns");
  return { translation_pl, definition_en, examples: examples.slice(0, 2), patterns: patterns.slice(0, 3) };
}

async function callOpenAI(prompt: string): Promise<string> {
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
          content: "You output JSON only for lexical enrichment. No markdown.",
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

async function callOpenAIWithRetry(prompt: string): Promise<string> {
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

function extractResponseText(raw: unknown): string {
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

async function resolveEntryId(supabase: SupabaseClient, row: IrregularRow): Promise<string> {
  if (row.entry_id) {
    const { data: existing } = await supabase
      .from("lexicon_entries")
      .select("id, pos")
      .eq("id", row.entry_id)
      .maybeSingle();
    if (existing && existing.pos === "verb") return existing.id;
  }

  const { data: byNorm } = await supabase
    .from("lexicon_entries")
    .select("id")
    .eq("lemma_norm", row.base_norm)
    .eq("pos", "verb")
    .maybeSingle();

  if (byNorm) {
    await supabase.from("irregular_verbs").update({ entry_id: byNorm.id }).eq("id", row.id);
    return byNorm.id;
  }

  const { data: inserted, error } = await supabase
    .from("lexicon_entries")
    .insert({
      lemma: row.base.trim(),
      lemma_norm: row.base_norm,
      pos: "verb",
    })
    .select("id")
    .single();

  if (error) throw new Error(`lexicon_entries insert: ${error.message}`);
  await supabase.from("irregular_verbs").update({ entry_id: inserted.id }).eq("id", row.id);
  return inserted.id;
}

async function nextSenseOrder(supabase: SupabaseClient, entryId: string): Promise<number> {
  const { data } = await supabase
    .from("lexicon_senses")
    .select("sense_order")
    .eq("entry_id", entryId)
    .order("sense_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return typeof data?.sense_order === "number" ? data.sense_order + 1 : 0;
}

async function loadSenseState(
  supabase: SupabaseClient,
  entryId: string,
): Promise<{
  senseId: string | null;
  definition_en: string;
  translation_pl: string | null;
  exampleCount: number;
  exampleTexts: Set<string>;
  patternCount: number;
  patternTexts: Set<string>;
}> {
  const { data: sense } = await supabase
    .from("lexicon_senses")
    .select("id, definition_en")
    .eq("entry_id", entryId)
    .order("sense_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!sense) {
    return {
      senseId: null,
      definition_en: "",
      translation_pl: null,
      exampleCount: 0,
      exampleTexts: new Set(),
      patternCount: 0,
      patternTexts: new Set(),
    };
  }

  const senseId = sense.id as string;
  const def = (sense.definition_en as string) ?? "";

  const { data: tr } = await supabase
    .from("lexicon_translations")
    .select("translation_pl")
    .eq("sense_id", senseId)
    .maybeSingle();

  const { data: exRows } = await supabase.from("lexicon_examples").select("example_en").eq("sense_id", senseId);

  const exampleTexts = new Set<string>();
  for (const r of exRows ?? []) {
    const t = (r as { example_en?: string }).example_en?.trim().toLowerCase();
    if (t) exampleTexts.add(t);
  }

  let patternTexts = new Set<string>();
  let patternCount = 0;
  const { data: patRows, error: patErr } = await supabase.from("lexicon_patterns").select("pattern").eq("sense_id", senseId);

  if (!patErr && patRows) {
    patternCount = patRows.length;
    for (const r of patRows) {
      const p = (r as { pattern?: string }).pattern?.trim().toLowerCase();
      if (p) patternTexts.add(p);
    }
  }

  return {
    senseId,
    definition_en: def.trim(),
    translation_pl: (tr?.translation_pl as string)?.trim() ?? null,
    exampleCount: exampleTexts.size,
    exampleTexts,
    patternCount,
    patternTexts,
  };
}

function needsEnrichment(s: Awaited<ReturnType<typeof loadSenseState>>): boolean {
  const hasDef = s.definition_en.length > 0;
  const hasTr = !!(s.translation_pl && s.translation_pl.length > 0);
  return !hasTr || !hasDef || s.exampleCount < MIN_EXAMPLES || s.patternCount < MIN_PATTERNS;
}

function needsOnlyPatterns(s: Awaited<ReturnType<typeof loadSenseState>>): boolean {
  const hasDef = s.definition_en.length > 0;
  const hasTr = !!(s.translation_pl && s.translation_pl.length > 0);
  return hasDef && hasTr && s.exampleCount >= MIN_EXAMPLES && s.patternCount < MIN_PATTERNS;
}

async function applyEnrichment(
  supabase: SupabaseClient,
  entryId: string,
  senseId: string | null,
  gpt: GptResult,
  prior: Awaited<ReturnType<typeof loadSenseState>>,
): Promise<void> {
  let sid = senseId;

  if (!sid) {
    const order = await nextSenseOrder(supabase, entryId);
    const { data: ins, error } = await supabase
      .from("lexicon_senses")
      .insert({
        entry_id: entryId,
        definition_en: gpt.definition_en,
        sense_order: order,
        domain: DOMAIN_VERB,
      })
      .select("id")
      .single();
    if (error) throw new Error(`lexicon_senses insert: ${error.message}`);
    sid = ins.id;
  } else {
    if (!prior.definition_en) {
      const { error } = await supabase.from("lexicon_senses").update({ definition_en: gpt.definition_en }).eq("id", sid);
      if (error) throw new Error(`lexicon_senses update: ${error.message}`);
    }
  }

  const { data: trExisting } = await supabase.from("lexicon_translations").select("translation_pl").eq("sense_id", sid).maybeSingle();
  const trEmpty = !(trExisting?.translation_pl ?? "").trim();
  if (trEmpty) {
    if (!trExisting) {
      const { error } = await supabase.from("lexicon_translations").insert({
        sense_id: sid,
        translation_pl: gpt.translation_pl,
      });
      if (error) throw new Error(`lexicon_translations insert: ${error.message}`);
    } else {
      const { error } = await supabase
        .from("lexicon_translations")
        .update({ translation_pl: gpt.translation_pl })
        .eq("sense_id", sid);
      if (error) throw new Error(`lexicon_translations update: ${error.message}`);
    }
  }

  for (const ex of gpt.examples) {
    const low = ex.trim().toLowerCase();
    if (prior.exampleTexts.has(low)) continue;
    if ((await countExamples(supabase, sid!)) >= TARGET_EXAMPLES) break;
    const { error } = await supabase.from("lexicon_examples").insert({
      sense_id: sid,
      example_en: ex.trim(),
      source: "ai",
    });
    if (error && !error.message.includes("duplicate")) throw new Error(`lexicon_examples: ${error.message}`);
    prior.exampleTexts.add(low);
  }

  for (const p of gpt.patterns) {
    const low = p.trim().toLowerCase();
    if (prior.patternTexts.has(low)) continue;
    if ((await countPatterns(supabase, sid!)) >= TARGET_PATTERNS) break;
    const { error } = await supabase.from("lexicon_patterns").insert({
      sense_id: sid,
      pattern: p.trim(),
    });
    if (error && error.code !== "23505") throw new Error(`lexicon_patterns: ${error.message}`);
    prior.patternTexts.add(low);
  }
}

async function countExamples(supabase: SupabaseClient, senseId: string): Promise<number> {
  const { count, error } = await supabase
    .from("lexicon_examples")
    .select("id", { count: "exact", head: true })
    .eq("sense_id", senseId);
  if (error) return 0;
  return count ?? 0;
}

async function countPatterns(supabase: SupabaseClient, senseId: string): Promise<number> {
  const { count, error } = await supabase
    .from("lexicon_patterns")
    .select("id", { count: "exact", head: true })
    .eq("sense_id", senseId);
  if (error) return 0;
  return count ?? 0;
}

/** Add only patterns when everything else exists (still one GPT call for patterns text). */
async function applyPatternsOnly(
  supabase: SupabaseClient,
  senseId: string,
  gpt: GptResult,
  prior: Awaited<ReturnType<typeof loadSenseState>>,
): Promise<void> {
  for (const p of gpt.patterns) {
    const low = p.trim().toLowerCase();
    if (prior.patternTexts.has(low)) continue;
    if ((await countPatterns(supabase, senseId)) >= TARGET_PATTERNS) break;
    const { error } = await supabase.from("lexicon_patterns").insert({ sense_id: senseId, pattern: p.trim() });
    if (error && error.code !== "23505") throw new Error(`lexicon_patterns: ${error.message}`);
    prior.patternTexts.add(low);
  }
}

async function main(): Promise<void> {
  const limit = parseLimit();
  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: verbs, error } = await supabase
    .from("irregular_verbs")
    .select("id, base, base_norm, entry_id")
    .order("base_norm", { ascending: true });

  if (error) throw new Error(`irregular_verbs: ${error.message}`);
  const rows = (verbs ?? []) as IrregularRow[];
  const toProcess = limit ? rows.slice(0, limit) : rows;

  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`Verbs to process: ${toProcess.length}${limit ? ` (limit=${limit})` : ""}\n`);

  for (const row of toProcess) {
    const label = row.base_norm;
    try {
      const entryId = await resolveEntryId(supabase, row);
      let state = await loadSenseState(supabase, entryId);

      if (!needsEnrichment(state)) {
        console.log(`[skip] ${label} — complete`);
        skipped += 1;
        continue;
      }

      const gptRaw = await callOpenAIWithRetry(buildPrompt(row.base));
      const gpt = parseGptJson(gptRaw);

      if (!state.senseId) {
        await applyEnrichment(supabase, entryId, null, gpt, state);
        console.log(`[enriched] ${label} — new sense + data`);
        enriched += 1;
        await sleep(DELAY_MS);
        continue;
      }

      if (needsOnlyPatterns(state)) {
        await applyPatternsOnly(supabase, state.senseId, gpt, state);
        console.log(`[enriched] ${label} — patterns only`);
        enriched += 1;
        await sleep(DELAY_MS);
        continue;
      }

      await applyEnrichment(supabase, entryId, state.senseId, gpt, state);
      console.log(`[enriched] ${label} — patched`);
      enriched += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[error] ${label} — ${msg}`);
      errors += 1;
    }
    await sleep(DELAY_MS);
  }

  console.log("\n=== summary ===");
  console.log(`total: ${toProcess.length}`);
  console.log(`enriched: ${enriched}`);
  console.log(`skipped: ${skipped}`);
  console.log(`errors: ${errors}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
