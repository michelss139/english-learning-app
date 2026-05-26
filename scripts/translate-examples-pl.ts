/**
 * Adds Polish translations (example_pl) to all lexicon_examples that are missing them.
 *
 * Uses Anthropic claude-3-5-haiku — cheaper and faster than OpenAI for translation.
 * Strategy: batch 25 examples per call → ~300 calls for remaining ~7 500 rows.
 *
 * Usage:
 *   npx tsx scripts/translate-examples-pl.ts
 *   npx tsx scripts/translate-examples-pl.ts --dry-run
 *   npx tsx scripts/translate-examples-pl.ts --limit=100
 *   npx tsx scripts/translate-examples-pl.ts --cefr A1,A2
 *   npx tsx scripts/translate-examples-pl.ts --batch=30
 */

import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { stripJsonFence, sleep, requiredEnv } from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const MODEL = "claude-sonnet-4-5-20250929";
const DELAY_MS = 250;
const DEFAULT_BATCH = 25;

// ─── Types ────────────────────────────────────────────────────────────────────

type ExampleRow = {
  id: string;
  example_en: string;
  cefr_level: string | null;
};

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
      max_tokens: 4096,
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

// ─── Translation ──────────────────────────────────────────────────────────────

function buildTranslationPrompt(sentences: string[]): string {
  const numbered = sentences.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return `Translate the following English sentences to natural, everyday Polish.
Context: these are example sentences in a language learning app for Polish speakers.
Keep translations short and natural — match the tone of the original.

${numbered}

Return ONLY a JSON array with exactly ${sentences.length} Polish translations in the same order.
Example format: ["Tłumaczenie 1.", "Tłumaczenie 2.", ...]
No markdown, no explanations.`;
}

async function translateBatch(sentences: string[]): Promise<string[]> {
  const prompt = buildTranslationPrompt(sentences);
  const raw = await callAnthropicWithRetry(prompt);
  const parsed = JSON.parse(stripJsonFence(raw)) as unknown;

  if (!Array.isArray(parsed)) throw new Error("Expected JSON array from OpenAI");
  if (parsed.length !== sentences.length) {
    throw new Error(
      `Length mismatch: sent ${sentences.length}, got ${parsed.length}`
    );
  }

  return parsed.map((item, i) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new Error(`Translation ${i + 1} is empty or not a string`);
    }
    return item.trim();
  });
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function loadMissingExamples(
  supabase: SupabaseClient,
  cefrFilter: Set<string> | null
): Promise<ExampleRow[]> {
  const PAGE = 1000;
  const out: ExampleRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("lexicon_examples")
      .select(`id, example_en, lexicon_senses(cefr_level)`)
      .or("example_pl.is.null,example_pl.eq.")
      .range(from, from + PAGE - 1)
      .order("id");

    const { data, error } = await query;
    if (error) throw new Error(`lexicon_examples: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data as any[]) {
      const cefr = row.lexicon_senses?.cefr_level ?? null;
      if (cefrFilter && cefr && !cefrFilter.has(cefr)) continue;
      out.push({ id: row.id, example_en: row.example_en, cefr_level: cefr });
    }

    from += PAGE;
    if (data.length < PAGE) break;
  }

  return out;
}

async function saveBatch(
  supabase: SupabaseClient,
  rows: ExampleRow[],
  translations: string[],
  dryRun: boolean
): Promise<void> {
  if (dryRun) return;

  // Bulk update via upsert-style: individual updates in parallel (small batches)
  const updates = rows.map((row, i) =>
    supabase
      .from("lexicon_examples")
      .update({ example_pl: translations[i] })
      .eq("id", row.id)
  );

  const results = await Promise.all(updates);
  for (const { error } of results) {
    if (error) throw new Error(`update example_pl: ${error.message}`);
  }
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

type Args = {
  limit: number | null;
  batchSize: number;
  dryRun: boolean;
  cefrFilter: Set<string> | null;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const a = argv.find((x) => x.startsWith(`${flag}=`));
    return a ? a.split("=")[1] : null;
  };
  const has = (flag: string) => argv.includes(flag);

  const limitRaw = get("--limit");
  const batchRaw = get("--batch");
  const cefrRaw = get("--cefr");

  return {
    limit: limitRaw
      ? (() => { const n = Number(limitRaw); return Number.isFinite(n) && n > 0 ? Math.floor(n) : null; })()
      : null,
    batchSize: batchRaw
      ? (() => { const n = Number(batchRaw); return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 40) : DEFAULT_BATCH; })()
      : DEFAULT_BATCH,
    dryRun: has("--dry-run"),
    cefrFilter: cefrRaw
      ? new Set(cefrRaw.toUpperCase().split(",").map((s) => s.trim()))
      : null,
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

  console.log("Loading examples without Polish translation…");
  let examples = await loadMissingExamples(supabase, args.cefrFilter);

  if (args.limit) examples = examples.slice(0, args.limit);

  const totalBatches = Math.ceil(examples.length / args.batchSize);

  console.log(`\nTranslate example_pl`);
  console.log(`  examples to translate: ${examples.length}`);
  console.log(`  batch size:            ${args.batchSize}`);
  console.log(`  batches:               ${totalBatches}`);
  if (args.cefrFilter) console.log(`  CEFR filter:           ${[...args.cefrFilter].join(", ")}`);
  if (args.dryRun) console.log(`  DRY RUN — no writes`);
  console.log();

  if (examples.length === 0) {
    console.log("Nothing to translate.");
    return;
  }

  let done = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < examples.length; i += args.batchSize) {
    const batch = examples.slice(i, i + args.batchSize);
    const batchNum = Math.floor(i / args.batchSize) + 1;
    const sentences = batch.map((r) => r.example_en);

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const pct = ((i / examples.length) * 100).toFixed(1);
    process.stdout.write(
      `  [${batchNum}/${totalBatches}] ${pct}% (${elapsed}s) … `
    );

    try {
      const translations = await translateBatch(sentences);

      if (args.dryRun) {
        // Print first 2 from the batch
        console.log(`ok (dry)`);
        for (let j = 0; j < Math.min(2, batch.length); j++) {
          console.log(`    EN: ${batch[j].example_en}`);
          console.log(`    PL: ${translations[j]}`);
        }
      } else {
        await saveBatch(supabase, batch, translations, false);
        console.log(`ok`);
      }

      done += batch.length;
    } catch (e) {
      console.log(`ERROR`);
      console.error(`    ${(e as Error).message}`);
      errors += batch.length;
    }

    if (i + args.batchSize < examples.length) await sleep(DELAY_MS);
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);

  console.log("\n══════════════════════════════");
  console.log("  Summary");
  console.log("══════════════════════════════");
  console.log(`  total:     ${examples.length}`);
  console.log(`  done:      ${done}`);
  console.log(`  errors:    ${errors}`);
  console.log(`  time:      ${totalTime}s`);
  if (done > 0) console.log(`  avg speed: ${(done / totalTime).toFixed(1)} examples/s`);
  if (args.dryRun) console.log("\n  (dry run — no changes written)");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
