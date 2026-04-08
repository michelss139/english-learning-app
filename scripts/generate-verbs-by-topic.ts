/**
 * Lists topic-specific verbs via GPT, filters lexicon duplicates, inserts full lexicon rows with verbs:{topic} domain.
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

function parseTopicArg(): string {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const topic = args[0]?.trim();
  if (!topic) {
    throw new Error('Usage: npm run generate:verbs-topic -- "<topic>" [--limit=N]');
  }
  return topic;
}

/** Safe fragment for lexicon_senses.domain: verbs:travel, verbs:work_life */
function topicToDomainLabel(topic: string): string {
  const slug = topic
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return slug || "topic";
}

function buildTopicListerPrompt(topic: string): string {
  return [
    `List English verbs commonly used in the context of: ${topic}`,
    "",
    "Rules:",
    "- focus on real-life usage",
    "- include verbs people actually use in this context",
    "- avoid rare or academic verbs",
    "- avoid basic verbs like 'go', 'make', 'do' if already common in general English",
    "- return base forms only",
    "",
    "List about 80–120 verbs so there is enough variety after filtering.",
    "",
    "IMPORTANT:",
    "- Do NOT include verbs that already exist in the database",
    "- Only generate NEW verbs",
    "",
    "Return only a strict JSON array of strings (no markdown).",
  ].join("\n");
}

async function main(): Promise<void> {
  const topic = parseTopicArg();
  const domain = `verbs:${topicToDomainLabel(topic)}`;
  const limit = parseLimit();

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Topic: "${topic}" → domain: "${domain}"`);
  if (limit) console.log(`limit: ${limit}`);
  console.log("");

  console.log("Loading existing verb lemmas (lexicon + irregular)…");
  const existing = await loadExistingVerbLemmaNorms(supabase, true);
  console.log(`  ${existing.size} known base forms\n`);

  console.log("Requesting candidate verb list (GPT)…");
  const listRaw = await callOpenAIWithRetry(buildTopicListerPrompt(topic));
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
        console.log(`[skip] ${label} — already in lexicon`);
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

      await insertVerbBundle(supabase, lemma.trim(), lemmaNorm, data, domain);
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
