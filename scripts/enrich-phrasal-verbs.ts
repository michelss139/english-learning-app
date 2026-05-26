/**
 * Adds the top 200 most common English phrasal verbs as separate lexicon_entries.
 *
 * Each phrasal verb gets a full entry:
 *   lexicon_entries   → lemma = "give up", pos = "verb"
 *   lexicon_senses    → definition_en, domain = "verbs:phrasal", cefr_level
 *   lexicon_translations → translation_pl
 *   lexicon_examples  → 2 examples EN + PL
 *   lexicon_patterns  → 2–3 usage patterns
 *
 * Skips any phrasal verb already present in lexicon_entries.
 *
 * Usage:
 *   npx tsx scripts/enrich-phrasal-verbs.ts
 *   npx tsx scripts/enrich-phrasal-verbs.ts --dry-run
 *   npx tsx scripts/enrich-phrasal-verbs.ts --limit=20
 *   npx tsx scripts/enrich-phrasal-verbs.ts --cefr A1,A2
 */

import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { stripJsonFence, sleep, requiredEnv } from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const MODEL = "claude-sonnet-4-5-20250929";
const DOMAIN = "verbs:phrasal";
const DELAY_MS = 400;

// ─── Top 200 phrasal verbs, by CEFR level ────────────────────────────────────

type PhrasalEntry = { lemma: string; cefr: "A1" | "A2" | "B1" | "B2" };

const PHRASAL_VERBS: PhrasalEntry[] = [
  // ── A1 ──────────────────────────────────────────────────────────────────
  { lemma: "come in",    cefr: "A1" },
  { lemma: "come back",  cefr: "A1" },
  { lemma: "get up",     cefr: "A1" },
  { lemma: "go out",     cefr: "A1" },
  { lemma: "go back",    cefr: "A1" },
  { lemma: "look at",    cefr: "A1" },
  { lemma: "look for",   cefr: "A1" },
  { lemma: "pick up",    cefr: "A1" },
  { lemma: "put down",   cefr: "A1" },
  { lemma: "put on",     cefr: "A1" },
  { lemma: "sit down",   cefr: "A1" },
  { lemma: "stand up",   cefr: "A1" },
  { lemma: "take off",   cefr: "A1" },
  { lemma: "turn on",    cefr: "A1" },
  { lemma: "turn off",   cefr: "A1" },
  { lemma: "wake up",    cefr: "A1" },

  // ── A2 ──────────────────────────────────────────────────────────────────
  { lemma: "break down",    cefr: "A2" },
  { lemma: "carry on",      cefr: "A2" },
  { lemma: "clean up",      cefr: "A2" },
  { lemma: "find out",      cefr: "A2" },
  { lemma: "get back",      cefr: "A2" },
  { lemma: "get on",        cefr: "A2" },
  { lemma: "give back",     cefr: "A2" },
  { lemma: "go on",         cefr: "A2" },
  { lemma: "grow up",       cefr: "A2" },
  { lemma: "hang up",       cefr: "A2" },
  { lemma: "hurry up",      cefr: "A2" },
  { lemma: "look up",       cefr: "A2" },
  { lemma: "look after",    cefr: "A2" },
  { lemma: "move on",       cefr: "A2" },
  { lemma: "put off",       cefr: "A2" },
  { lemma: "run away",      cefr: "A2" },
  { lemma: "run out of",    cefr: "A2" },
  { lemma: "set off",       cefr: "A2" },
  { lemma: "slow down",     cefr: "A2" },
  { lemma: "switch on",     cefr: "A2" },
  { lemma: "switch off",    cefr: "A2" },
  { lemma: "take away",     cefr: "A2" },
  { lemma: "throw away",    cefr: "A2" },
  { lemma: "try on",        cefr: "A2" },
  { lemma: "turn up",       cefr: "A2" },
  { lemma: "use up",        cefr: "A2" },
  { lemma: "wait for",      cefr: "A2" },

  // ── B1 ──────────────────────────────────────────────────────────────────
  { lemma: "bring up",        cefr: "B1" },
  { lemma: "calm down",       cefr: "B1" },
  { lemma: "catch up",        cefr: "B1" },
  { lemma: "check in",        cefr: "B1" },
  { lemma: "check out",       cefr: "B1" },
  { lemma: "cheer up",        cefr: "B1" },
  { lemma: "come across",     cefr: "B1" },
  { lemma: "come up",         cefr: "B1" },
  { lemma: "count on",        cefr: "B1" },
  { lemma: "cut down",        cefr: "B1" },
  { lemma: "deal with",       cefr: "B1" },
  { lemma: "drop off",        cefr: "B1" },
  { lemma: "end up",          cefr: "B1" },
  { lemma: "fall behind",     cefr: "B1" },
  { lemma: "fall out",        cefr: "B1" },
  { lemma: "figure out",      cefr: "B1" },
  { lemma: "fill in",         cefr: "B1" },
  { lemma: "get along",       cefr: "B1" },
  { lemma: "get away",        cefr: "B1" },
  { lemma: "get over",        cefr: "B1" },
  { lemma: "get rid of",      cefr: "B1" },
  { lemma: "give away",       cefr: "B1" },
  { lemma: "give up",         cefr: "B1" },
  { lemma: "go ahead",        cefr: "B1" },
  { lemma: "hand in",         cefr: "B1" },
  { lemma: "hand out",        cefr: "B1" },
  { lemma: "hold on",         cefr: "B1" },
  { lemma: "keep on",         cefr: "B1" },
  { lemma: "keep up",         cefr: "B1" },
  { lemma: "leave out",       cefr: "B1" },
  { lemma: "let down",        cefr: "B1" },
  { lemma: "log in",          cefr: "B1" },
  { lemma: "log out",         cefr: "B1" },
  { lemma: "look forward to", cefr: "B1" },
  { lemma: "look into",       cefr: "B1" },
  { lemma: "make up",         cefr: "B1" },
  { lemma: "mix up",          cefr: "B1" },
  { lemma: "move out",        cefr: "B1" },
  { lemma: "pass out",        cefr: "B1" },
  { lemma: "pay back",        cefr: "B1" },
  { lemma: "pick out",        cefr: "B1" },
  { lemma: "point out",       cefr: "B1" },
  { lemma: "put away",        cefr: "B1" },
  { lemma: "run into",        cefr: "B1" },
  { lemma: "set up",          cefr: "B1" },
  { lemma: "show off",        cefr: "B1" },
  { lemma: "sign up",         cefr: "B1" },
  { lemma: "sort out",        cefr: "B1" },
  { lemma: "speak up",        cefr: "B1" },
  { lemma: "speed up",        cefr: "B1" },
  { lemma: "stand out",       cefr: "B1" },
  { lemma: "take over",       cefr: "B1" },
  { lemma: "take up",         cefr: "B1" },
  { lemma: "turn down",       cefr: "B1" },
  { lemma: "turn out",        cefr: "B1" },
  { lemma: "work out",        cefr: "B1" },
  { lemma: "write down",      cefr: "B1" },
  { lemma: "call back",       cefr: "B1" },
  { lemma: "call off",        cefr: "B1" },
  { lemma: "carry out",       cefr: "B1" },
  { lemma: "cut back",        cefr: "B1" },
  { lemma: "drop out",        cefr: "B1" },
  { lemma: "fall apart",      cefr: "B1" },
  { lemma: "fill out",        cefr: "B1" },
  { lemma: "get through",     cefr: "B1" },
  { lemma: "go through",      cefr: "B1" },
  { lemma: "hold back",       cefr: "B1" },
  { lemma: "knock out",       cefr: "B1" },
  { lemma: "let in",          cefr: "B1" },
  { lemma: "look out",        cefr: "B1" },
  { lemma: "make out",        cefr: "B1" },
  { lemma: "pass on",         cefr: "B1" },
  { lemma: "put up",          cefr: "B1" },
  { lemma: "roll up",         cefr: "B1" },
  { lemma: "run out",         cefr: "B1" },
  { lemma: "save up",         cefr: "B1" },
  { lemma: "show up",         cefr: "B1" },
  { lemma: "take apart",      cefr: "B1" },
  { lemma: "take on",         cefr: "B1" },
  { lemma: "tie up",          cefr: "B1" },
  { lemma: "turn around",     cefr: "B1" },

  // ── B2 ──────────────────────────────────────────────────────────────────
  { lemma: "back off",       cefr: "B2" },
  { lemma: "back up",        cefr: "B2" },
  { lemma: "blow up",        cefr: "B2" },
  { lemma: "break into",     cefr: "B2" },
  { lemma: "break out",      cefr: "B2" },
  { lemma: "break up",       cefr: "B2" },
  { lemma: "bring about",    cefr: "B2" },
  { lemma: "bring forward",  cefr: "B2" },
  { lemma: "build up",       cefr: "B2" },
  { lemma: "burn out",       cefr: "B2" },
  { lemma: "come up with",   cefr: "B2" },
  { lemma: "cut off",        cefr: "B2" },
  { lemma: "face up to",     cefr: "B2" },
  { lemma: "fall through",   cefr: "B2" },
  { lemma: "get ahead",      cefr: "B2" },
  { lemma: "get around",     cefr: "B2" },
  { lemma: "give in",        cefr: "B2" },
  { lemma: "hold up",        cefr: "B2" },
  { lemma: "keep up with",   cefr: "B2" },
  { lemma: "let go of",      cefr: "B2" },
  { lemma: "live up to",     cefr: "B2" },
  { lemma: "make up for",    cefr: "B2" },
  { lemma: "miss out on",    cefr: "B2" },
  { lemma: "pass away",      cefr: "B2" },
  { lemma: "pull off",       cefr: "B2" },
  { lemma: "put up with",    cefr: "B2" },
  { lemma: "reach out",      cefr: "B2" },
  { lemma: "rule out",       cefr: "B2" },
  { lemma: "settle down",    cefr: "B2" },
  { lemma: "stand up for",   cefr: "B2" },
  { lemma: "take off",       cefr: "B2" },
  { lemma: "throw up",       cefr: "B2" },
  { lemma: "track down",     cefr: "B2" },
  { lemma: "turn into",      cefr: "B2" },
  { lemma: "wrap up",        cefr: "B2" },
  { lemma: "break through",  cefr: "B2" },
  { lemma: "brush up on",    cefr: "B2" },
  { lemma: "catch on",       cefr: "B2" },
  { lemma: "cut out",        cefr: "B2" },
  { lemma: "die out",        cefr: "B2" },
  { lemma: "draw up",        cefr: "B2" },
  { lemma: "ease up",        cefr: "B2" },
  { lemma: "get back to",    cefr: "B2" },
  { lemma: "give out",       cefr: "B2" },
  { lemma: "go along with",  cefr: "B2" },
  { lemma: "head off",       cefr: "B2" },
  { lemma: "keep away from", cefr: "B2" },
  { lemma: "lay off",        cefr: "B2" },
  { lemma: "let off",        cefr: "B2" },
  { lemma: "look back on",   cefr: "B2" },
  { lemma: "make do with",   cefr: "B2" },
  { lemma: "narrow down",    cefr: "B2" },
  { lemma: "opt out",        cefr: "B2" },
  { lemma: "phase out",      cefr: "B2" },
  { lemma: "pick up on",     cefr: "B2" },
  { lemma: "play down",      cefr: "B2" },
  { lemma: "press on",       cefr: "B2" },
  { lemma: "pull through",   cefr: "B2" },
  { lemma: "put across",     cefr: "B2" },
  { lemma: "size up",        cefr: "B2" },
  { lemma: "step up",        cefr: "B2" },
  { lemma: "stick to",       cefr: "B2" },
  { lemma: "sum up",         cefr: "B2" },
  { lemma: "take in",        cefr: "B2" },
  { lemma: "talk into",      cefr: "B2" },
  { lemma: "think over",     cefr: "B2" },
  { lemma: "touch on",       cefr: "B2" },
  { lemma: "turn away",      cefr: "B2" },
  { lemma: "wind up",        cefr: "B2" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrichResult = {
  translation_pl: string;
  definition_en: string;
  examples: Array<{ en: string; pl: string }>;
  patterns: string[];
};

// ─── Anthropic ────────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((c) => c.type === "text")?.text ?? "";
  if (!text) throw new Error("Anthropic: empty response");
  return text;
}

async function callWithRetry(prompt: string): Promise<string> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await callAnthropic(prompt); }
    catch (e) { last = e; if (attempt < 2) await sleep(2000 * (attempt + 1)); }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

function buildPrompt(phrasal: string, cefr: string): string {
  return `You are generating vocabulary data for a Polish learner's English app.

Phrasal verb: "${phrasal}"
CEFR level: ${cefr}

This is a PHRASAL VERB — treat it as a single unit with its own distinct meaning,
separate from the base verb. Focus on the most common everyday meaning.

Generate:

1. POLISH TRANSLATION — most natural, idiomatic Polish equivalent (1–4 words).

2. ENGLISH DEFINITION — one clear, learner-friendly sentence.
   Show the meaning of the PHRASAL VERB specifically.
   BAD: "to verb something" ❌   GOOD: "to stop trying to do something difficult" ✓

3. EXAMPLES — exactly 2 short, natural sentences (max ~10 words each) + their Polish translations.
   Must show the phrasal verb used naturally.

4. PATTERNS — 2–3 usage patterns showing grammar structure:
   e.g. "give up + noun", "give up + verb-ing", "give up on + someone"

Return ONLY strict JSON (no markdown):
{
  "translation_pl": "...",
  "definition_en": "...",
  "examples": [
    { "en": "...", "pl": "..." },
    { "en": "...", "pl": "..." }
  ],
  "patterns": ["...", "...", "..."]
}`;
}

function parseResult(raw: string): EnrichResult {
  const data = JSON.parse(stripJsonFence(raw)) as Record<string, unknown>;

  const translation_pl = typeof data.translation_pl === "string" ? data.translation_pl.trim() : "";
  const definition_en = typeof data.definition_en === "string" ? data.definition_en.trim() : "";

  const examples = Array.isArray(data.examples)
    ? (data.examples as unknown[])
        .filter((e): e is { en: string; pl: string } =>
          typeof (e as any)?.en === "string" && typeof (e as any)?.pl === "string"
        )
        .slice(0, 2)
    : [];

  const patterns = Array.isArray(data.patterns)
    ? (data.patterns as unknown[])
        .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
        .map((p) => p.trim())
        .slice(0, 3)
    : [];

  if (!translation_pl) throw new Error("Missing translation_pl");
  if (!definition_en) throw new Error("Missing definition_en");
  if (examples.length < 2) throw new Error(`Need 2 examples, got ${examples.length}`);

  return { translation_pl, definition_en, examples, patterns };
}

// ─── DB insert ────────────────────────────────────────────────────────────────

async function insertPhrasalVerb(
  supabase: SupabaseClient,
  lemma: string,
  cefr: string,
  result: EnrichResult,
  dryRun: boolean
): Promise<void> {
  const lemma_norm = lemma.toLowerCase().trim();

  if (dryRun) {
    console.log(`    translation: ${result.translation_pl}`);
    console.log(`    definition:  ${result.definition_en}`);
    console.log(`    examples:    ${result.examples.map((e) => e.en).join(" | ")}`);
    if (result.patterns.length) console.log(`    patterns:    ${result.patterns.join(" | ")}`);
    return;
  }

  // Guard: check if already exists
  const { data: existing } = await supabase
    .from("lexicon_entries")
    .select("id")
    .eq("lemma_norm", lemma_norm)
    .eq("pos", "verb")
    .maybeSingle();

  if (existing?.id) {
    console.log(`    [skip] already in DB`);
    return;
  }

  let entryId: string | null = null;
  try {
    const { data: entry, error: eErr } = await supabase
      .from("lexicon_entries")
      .insert({ lemma, lemma_norm, pos: "verb" })
      .select("id").single();
    if (eErr) throw new Error(`entry: ${eErr.message}`);
    entryId = entry.id as string;

    const { data: sense, error: sErr } = await supabase
      .from("lexicon_senses")
      .insert({ entry_id: entryId, definition_en: result.definition_en, sense_order: 0, domain: DOMAIN, cefr_level: cefr })
      .select("id").single();
    if (sErr) throw new Error(`sense: ${sErr.message}`);
    const senseId = sense.id as string;

    const { error: trErr } = await supabase
      .from("lexicon_translations")
      .insert({ sense_id: senseId, translation_pl: result.translation_pl });
    if (trErr) throw new Error(`translation: ${trErr.message}`);

    for (const ex of result.examples) {
      const { error: exErr } = await supabase
        .from("lexicon_examples")
        .insert({ sense_id: senseId, example_en: ex.en, example_pl: ex.pl, source: "ai" });
      if (exErr && exErr.code !== "23505") throw new Error(`example: ${exErr.message}`);
    }

    for (const pat of result.patterns) {
      const { error: pErr } = await supabase
        .from("lexicon_patterns")
        .insert({ sense_id: senseId, pattern: pat });
      if (pErr && pErr.code !== "23505") throw new Error(`pattern: ${pErr.message}`);
    }
  } catch (e) {
    if (entryId) await supabase.from("lexicon_entries").delete().eq("id", entryId);
    throw e;
  }
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const argv = process.argv.slice(2);
  const get = (f: string) => { const a = argv.find((x) => x.startsWith(`${f}=`)); return a ? a.split("=")[1] : null; };
  const limitRaw = get("--limit");
  const cefrRaw = get("--cefr");
  return {
    limit: limitRaw ? (() => { const n = Number(limitRaw); return Number.isFinite(n) && n > 0 ? Math.floor(n) : null; })() : null,
    dryRun: argv.includes("--dry-run"),
    cefrFilter: cefrRaw ? new Set(cefrRaw.toUpperCase().split(",").map((s) => s.trim())) : null,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Load existing lemma_norms to skip already-present entries
  const { data: existing, error: exErr } = await supabase
    .from("lexicon_entries")
    .select("lemma_norm")
    .eq("pos", "verb");
  if (exErr) throw new Error(`lexicon_entries: ${exErr.message}`);
  const existingNorms = new Set((existing ?? []).map((r: any) => r.lemma_norm as string));

  // Filter queue
  let queue = PHRASAL_VERBS.filter((pv) => {
    if (existingNorms.has(pv.lemma.toLowerCase())) return false;
    if (args.cefrFilter && !args.cefrFilter.has(pv.cefr)) return false;
    return true;
  });

  const alreadyDone = PHRASAL_VERBS.length - queue.length - (args.cefrFilter
    ? PHRASAL_VERBS.filter((pv) => args.cefrFilter && !args.cefrFilter.has(pv.cefr)).length
    : 0);

  if (args.limit) queue = queue.slice(0, args.limit);

  console.log(`\nPhrasal Verbs Enrichment`);
  console.log(`  total in list:  ${PHRASAL_VERBS.length}`);
  console.log(`  already in DB:  ${alreadyDone}`);
  console.log(`  to process:     ${queue.length}`);
  if (args.cefrFilter) console.log(`  CEFR filter:    ${[...args.cefrFilter].join(", ")}`);
  if (args.dryRun) console.log(`  DRY RUN — no writes`);
  console.log();

  if (queue.length === 0) { console.log("Nothing to process."); return; }

  let done = 0, skipped = 0, errors = 0;

  for (const pv of queue) {
    const label = `${pv.cefr}  ${pv.lemma}`;
    process.stdout.write(`  ${label.padEnd(30)} … `);

    try {
      const raw = await callWithRetry(buildPrompt(pv.lemma, pv.cefr));
      const result = parseResult(raw);
      await insertPhrasalVerb(supabase, pv.lemma, pv.cefr, result, args.dryRun);
      console.log(`ok (${result.translation_pl})`);
      if (args.dryRun) {
        console.log(`    definition:  ${result.definition_en}`);
        console.log(`    examples:    ${result.examples.map((e) => `${e.en} → ${e.pl}`).join(" | ")}`);
        console.log(`    patterns:    ${result.patterns.join(" | ")}`);
      }
      done++;
    } catch (e) {
      console.log(`ERROR`);
      console.error(`    ${(e as Error).message}`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log("\n══════════════════════════");
  console.log("  Summary");
  console.log("══════════════════════════");
  console.log(`  processed: ${queue.length}`);
  console.log(`  done:      ${done}`);
  console.log(`  skipped:   ${skipped}`);
  console.log(`  errors:    ${errors}`);
  if (args.dryRun) console.log("\n  (dry run — no changes written)");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
