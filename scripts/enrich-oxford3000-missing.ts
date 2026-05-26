/**
 * Enriches the lexicon with words from the Oxford 3000 that are missing or have no CEFR level.
 *
 * Reads:  scripts/data/oxford3000-diff-report.json  (output of diff-oxford3000.ts)
 * Writes: Supabase (lexicon_entries / lexicon_senses / lexicon_translations /
 *                   lexicon_examples / lexicon_patterns)
 *
 * Two modes (--status flag):
 *
 *   NO_CEFR   – word already exists in DB, sense has no cefr_level.
 *               Simple DB update, no Anthropic call.
 *
 *   MISSING   – word not in DB at all.
 *               Calls Anthropic, inserts full entry (entry + sense + translation +
 *               examples + patterns).
 *
 * Usage examples:
 *   npx tsx scripts/enrich-oxford3000-missing.ts --status NO_CEFR
 *   npx tsx scripts/enrich-oxford3000-missing.ts --status MISSING --level A1,A2 --limit=20
 *   npx tsx scripts/enrich-oxford3000-missing.ts --status MISSING --level A1 --dry-run
 *   npx tsx scripts/enrich-oxford3000-missing.ts --status MISSING --level A1,A2 --pos verb,adverb,preposition,conjunction
 */

import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  stripJsonFence,
  sleep,
  requiredEnv,
} from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const REPORT_PATH = path.resolve(
  process.cwd(),
  "scripts/data/oxford3000-diff-report.json"
);

const MODEL = "claude-sonnet-4-5-20250929";
const DELAY_MS = 300;

// ─── Anthropic API ────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY in environment");

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

async function callAnthropicWithRetry(prompt: string): Promise<string> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await callAnthropic(prompt);
    } catch (e) {
      last = e;
      if (attempt < 2) await sleep(2000 * (attempt + 1));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
const TARGET_EXAMPLES = 2;
const TARGET_PATTERNS = 3;

// ─── Domain mapping by POS ───────────────────────────────────────────────────

const DOMAIN_BY_POS: Record<string, string> = {
  verb: "verbs:general",
  adjective: "adjectives:general",
  noun: "nouns:general",
  adverb: "adverbs:general",
  preposition: "grammar:prepositions",
  conjunction: "grammar:conjunctions",
  pronoun: "grammar:pronouns",
  determiner: "grammar:determiners",
  numeral: "grammar:numerals",
  modal: "verbs:modal",
  exclamation: "grammar:exclamations",
  article: "grammar:articles",
  particle: "grammar:particles",
};

function domainForPos(pos: string): string {
  return DOMAIN_BY_POS[pos] ?? "general";
}

// ─── Payload type ────────────────────────────────────────────────────────────

type EnrichResult = {
  translation_pl: string;
  definition_en: string;
  examples: string[];
  patterns: string[];
};

// ─── POS-aware prompts ───────────────────────────────────────────────────────

function buildPrompt(lemma: string, pos: string, cefr: string): string {
  const posLabel = pos === "modal" ? "modal verb" : pos;

  const patternInstruction =
    ["verb", "modal", "adjective", "adverb", "preposition", "conjunction"].includes(pos)
      ? `4. PATTERNS (2–3 items) — short, reusable usage patterns, e.g.:
   • "run + away", "in + place", "because + [clause]"
   • or natural collocations: "run out of time", "in the end"
   Include at least one structure pattern (with +) and one collocation when possible.`
      : `4. PATTERNS (1–2 items) — very short usage note, e.g. "used before a noun" or "plural: ..."
   If nothing useful, return an empty array [].`;

  return `You are generating vocabulary data for a Polish learner's English app (CEFR level ${cefr}).

Word: "${lemma}"
Part of speech: ${posLabel}
CEFR level: ${cefr}

Generate the following (focus on the most common, everyday meaning — not rare or academic):

1. TRANSLATION (Polish) — most natural single translation (1–3 words max).

2. DEFINITION (English) — one clear, learner-friendly sentence at ${cefr} level.
   BAD: "to perform an action" ❌   GOOD: "to move fast on foot" ✓

3. EXAMPLES (exactly 2) — natural, short sentences (max ~10 words each).
   Must show the word in realistic context. No textbook clichés.

${patternInstruction}

Return ONLY strict JSON (no markdown):
{
  "translation_pl": "...",
  "definition_en": "...",
  "examples": ["...", "..."],
  "patterns": ["...", "..."]
}`;
}

function parseEnrichResult(text: string): EnrichResult {
  const raw = JSON.parse(stripJsonFence(text)) as Record<string, unknown>;

  const translation_pl =
    typeof raw.translation_pl === "string" ? raw.translation_pl.trim() : "";
  const definition_en =
    typeof raw.definition_en === "string" ? raw.definition_en.trim() : "";

  const examples = Array.isArray(raw.examples)
    ? (raw.examples as unknown[])
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, TARGET_EXAMPLES)
    : [];

  const patterns = Array.isArray(raw.patterns)
    ? (raw.patterns as unknown[])
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, TARGET_PATTERNS)
    : [];

  if (!translation_pl) throw new Error("Missing translation_pl");
  if (!definition_en) throw new Error("Missing definition_en");
  if (examples.length < 2) throw new Error(`Need 2 examples, got ${examples.length}`);

  return { translation_pl, definition_en, examples, patterns };
}

// ─── DB writes ───────────────────────────────────────────────────────────────

async function insertFullEntry(
  supabase: SupabaseClient,
  lemma: string,
  pos: string,
  cefr_level: string,
  result: EnrichResult,
  dryRun: boolean
): Promise<void> {
  const lemma_norm = lemma.toLowerCase().trim();
  const domain = domainForPos(pos);

  if (dryRun) {
    console.log(`    [dry-run] would insert: ${lemma} (${pos}, ${cefr_level})`);
    console.log(`      translation: ${result.translation_pl}`);
    console.log(`      definition:  ${result.definition_en}`);
    console.log(`      examples:    ${result.examples.join(" | ")}`);
    if (result.patterns.length) console.log(`      patterns:    ${result.patterns.join(" | ")}`);
    return;
  }

  let entryId: string | null = null;

  try {
    // Guard: skip if entry was inserted concurrently
    const { data: existing } = await supabase
      .from("lexicon_entries")
      .select("id")
      .eq("lemma_norm", lemma_norm)
      .eq("pos", pos)
      .maybeSingle();

    if (existing?.id) {
      console.log(`    [skip] ${lemma} (${pos}) — appeared in DB since diff was run`);
      return;
    }

    const { data: entryRow, error: eErr } = await supabase
      .from("lexicon_entries")
      .insert({ lemma, lemma_norm, pos })
      .select("id")
      .single();

    if (eErr) throw new Error(`lexicon_entries: ${eErr.message}`);
    entryId = entryRow.id as string;

    const { data: senseRow, error: sErr } = await supabase
      .from("lexicon_senses")
      .insert({
        entry_id: entryId,
        definition_en: result.definition_en,
        sense_order: 0,
        domain,
        cefr_level,
      })
      .select("id")
      .single();

    if (sErr) throw new Error(`lexicon_senses: ${sErr.message}`);
    const senseId = senseRow.id as string;

    const { error: trErr } = await supabase
      .from("lexicon_translations")
      .insert({ sense_id: senseId, translation_pl: result.translation_pl });
    if (trErr) throw new Error(`lexicon_translations: ${trErr.message}`);

    for (const ex of result.examples) {
      const { error: exErr } = await supabase
        .from("lexicon_examples")
        .insert({ sense_id: senseId, example_en: ex, source: "ai" });
      if (exErr && exErr.code !== "23505") throw new Error(`lexicon_examples: ${exErr.message}`);
    }

    for (const pat of result.patterns) {
      const { error: pErr } = await supabase
        .from("lexicon_patterns")
        .insert({ sense_id: senseId, pattern: pat });
      if (pErr && pErr.code !== "23505") throw new Error(`lexicon_patterns: ${pErr.message}`);
    }
  } catch (e) {
    // Roll back entry on failure to avoid orphan rows
    if (entryId) {
      await supabase.from("lexicon_entries").delete().eq("id", entryId);
    }
    throw e;
  }
}

async function patchCefrLevel(
  supabase: SupabaseClient,
  senseId: string,
  cefr_level: string,
  lemma: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log(`    [dry-run] would set cefr_level=${cefr_level} on sense ${senseId} (${lemma})`);
    return;
  }

  const { error } = await supabase
    .from("lexicon_senses")
    .update({ cefr_level })
    .eq("id", senseId);

  if (error) throw new Error(`lexicon_senses update cefr_level: ${error.message}`);
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

type Args = {
  statuses: Set<string>;
  levels: Set<string>;
  posFilter: Set<string> | null;
  limit: number | null;
  dryRun: boolean;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);

  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
  };

  const rawStatus = get("--status") ?? "MISSING,NO_CEFR";
  const rawLevel = get("--level") ?? "A1,A2";
  const rawPos = get("--pos");
  const rawLimit = argv.find((a) => a.startsWith("--limit="));
  const dryRun = argv.includes("--dry-run");

  const limit = rawLimit
    ? (() => {
        const n = Number(rawLimit.split("=")[1]);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
      })()
    : null;

  return {
    statuses: new Set(rawStatus.toUpperCase().split(",").map((s) => s.trim())),
    levels: new Set(rawLevel.toUpperCase().split(",").map((s) => s.trim())),
    posFilter: rawPos
      ? new Set(rawPos.toLowerCase().split(",").map((s) => s.trim()))
      : null,
    limit,
    dryRun,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type DiffRow = {
  lemma: string;
  pos: string;
  cefr_level: string;
  status: string;
  db_sense_id?: string | null;
  db_entry_id?: string | null;
};

async function main(): Promise<void> {
  const args = parseArgs();

  if (!fs.existsSync(REPORT_PATH)) {
    console.error(
      `Report not found: ${REPORT_PATH}\nRun: npx tsx scripts/diff-oxford3000.ts`
    );
    process.exit(1);
  }

  const report: DiffRow[] = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));

  // Apply filters
  let queue = report.filter(
    (r) =>
      args.statuses.has(r.status) &&
      args.levels.has(r.cefr_level) &&
      (args.posFilter === null || args.posFilter.has(r.pos))
  );

  if (args.limit) queue = queue.slice(0, args.limit);

  console.log(`\nOxford 3000 Enrichment`);
  console.log(`  status: ${[...args.statuses].join(", ")}`);
  console.log(`  level:  ${[...args.levels].join(", ")}`);
  if (args.posFilter) console.log(`  pos:    ${[...args.posFilter].join(", ")}`);
  if (args.limit) console.log(`  limit:  ${args.limit}`);
  if (args.dryRun) console.log(`  DRY RUN — no writes`);
  console.log(`  queue:  ${queue.length} entries\n`);

  if (queue.length === 0) {
    console.log("Nothing to process.");
    return;
  }

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Split by status
  const noCefrItems = queue.filter((r) => r.status === "NO_CEFR");
  const missingItems = queue.filter((r) => r.status === "MISSING");

  let done = 0;
  let skipped = 0;
  let errors = 0;

  // ── NO_CEFR: simple DB patch, no OpenAI ──────────────────────────────────
  if (noCefrItems.length > 0) {
    console.log(`── NO_CEFR: patching cefr_level on ${noCefrItems.length} senses ──\n`);

    for (const item of noCefrItems) {
      if (!item.db_sense_id) {
        console.log(`  [skip] ${item.lemma} (${item.pos}) — no sense_id in report`);
        skipped++;
        continue;
      }

      try {
        await patchCefrLevel(
          supabase,
          item.db_sense_id,
          item.cefr_level,
          item.lemma,
          args.dryRun
        );
        console.log(`  [ok] ${item.cefr_level}  ${item.pos.padEnd(14)} ${item.lemma}`);
        done++;
      } catch (e) {
        console.error(`  [error] ${item.lemma} — ${(e as Error).message}`);
        errors++;
      }
    }

    console.log();
  }

  // ── MISSING: full insert with OpenAI ─────────────────────────────────────
  if (missingItems.length > 0) {
    console.log(`── MISSING: enriching ${missingItems.length} entries via Anthropic ──\n`);

    for (const item of missingItems) {
      const label = `${item.cefr_level}  ${item.pos.padEnd(14)} ${item.lemma}`;
      process.stdout.write(`  ${label} … `);

      try {
        const prompt = buildPrompt(item.lemma, item.pos, item.cefr_level);
        const raw = await callAnthropicWithRetry(prompt);
        const result = parseEnrichResult(raw);

        await insertFullEntry(
          supabase,
          item.lemma,
          item.pos,
          item.cefr_level,
          result,
          args.dryRun
        );

        console.log(`ok (${result.translation_pl})`);
        done++;
      } catch (e) {
        console.log(`ERROR`);
        console.error(`    ${(e as Error).message}`);
        errors++;
      }

      await sleep(DELAY_MS);
    }

    console.log();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("══════════════════");
  console.log("  Summary");
  console.log("══════════════════");
  console.log(`  processed: ${queue.length}`);
  console.log(`  done:      ${done}`);
  console.log(`  skipped:   ${skipped}`);
  console.log(`  errors:    ${errors}`);
  if (args.dryRun) console.log("\n  (dry run — no changes written)");
  else
    console.log(
      "\n  Run diff-oxford3000.ts again to see updated coverage."
    );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
