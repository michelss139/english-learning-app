/**
 * Suggests B1–B2 everyday verbs via GPT, filters out lexicon + irregular list, inserts full lexicon rows.
 */
import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  DELAY_MS,
  buildEnrichPrompt,
  callOpenAIWithRetry,
  insertVerbBundle,
  isDuplicateKeyError,
  loadExistingVerbLemmaNorms,
  parseEnrichJson,
  parseLimit,
  parseVerbArray,
  requiredEnv,
  sleep,
  verbEntryExists,
} from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const DOMAIN_GENERAL = "verbs:general";

function buildListerPrompt(): string {
  return [
    "List 200 English verbs that are:",
    "",
    "- less common than basic verbs like \"go\", \"make\", \"take\"",
    "- but still used in real everyday language",
    "- useful for intermediate learners (B1–B2)",
    "- not rare, not technical, not academic",
    "",
    "Rules:",
    "- avoid basic verbs (go, make, take, do, get, etc.)",
    "- avoid very rare verbs",
    "- include practical verbs used in real situations",
    "- return base forms only (infinitive without \"to\")",
    "",
    "Return only a strict JSON array of strings (no markdown).",
  ].join("\n");
}

async function main(): Promise<void> {
  const limit = parseLimit();
  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Loading existing verb lemmas (lexicon + irregular)…");
  const existing = await loadExistingVerbLemmaNorms(supabase, true);
  console.log(`  ${existing.size} known base forms\n`);

  console.log("Requesting candidate verb list (GPT)…");
  const listRaw = await callOpenAIWithRetry(buildListerPrompt());
  const candidates = parseVerbArray(listRaw);
  console.log(`  ${candidates.length} candidates from model\n`);

  const missing: string[] = [];
  for (const c of candidates) {
    const norm = c.toLowerCase();
    if (!existing.has(norm)) missing.push(c);
  }

  const toCreate = limit ? missing.slice(0, limit) : missing;
  console.log(`Missing (new): ${missing.length}; processing: ${toCreate.length}${limit ? ` (limit=${limit})` : ""}\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const lemma of toCreate) {
    const lemmaNorm = lemma.trim().toLowerCase().replace(/\s+/g, " ");
    const label = lemmaNorm;

    try {
      if (existing.has(lemmaNorm)) {
        console.log(`[skip] ${label} — already tracked`);
        skipped += 1;
        await sleep(DELAY_MS);
        continue;
      }

      if (await verbEntryExists(supabase, lemmaNorm)) {
        console.log(`[skip] ${label} — lexicon row appeared`);
        existing.add(lemmaNorm);
        skipped += 1;
        await sleep(DELAY_MS);
        continue;
      }

      const enrichRaw = await callOpenAIWithRetry(buildEnrichPrompt(lemma));
      const data = parseEnrichJson(enrichRaw);

      await insertVerbBundle(supabase, lemma.trim(), lemmaNorm, data, DOMAIN_GENERAL);
      existing.add(lemmaNorm);
      console.log(`[created] ${label}`);
      created += 1;
    } catch (e: unknown) {
      if (isDuplicateKeyError(e)) {
        existing.add(lemmaNorm);
        console.log(`[skip] ${label} — duplicate key`);
        skipped += 1;
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[error] ${label} — ${msg}`);
        errors += 1;
      }
    }

    await sleep(DELAY_MS);
  }

  console.log("\n=== summary ===");
  console.log(`total processed: ${toCreate.length}`);
  console.log(`created: ${created}`);
  console.log(`skipped: ${skipped}`);
  console.log(`errors: ${errors}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
