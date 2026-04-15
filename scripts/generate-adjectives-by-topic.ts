/**
 * Topic-specific adjectives via GPT; filters lexicon duplicates; one sense per lemma, domain adjectives:<topic>.
 */
import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DELAY_MS,
  callOpenAIWithRetry,
  insertAdjectiveBundle,
  isDuplicateKeyError,
  lexiconEntryExists,
  parseAdjectiveEnrichJson,
  parseLimit,
  parseVerbArray,
  requiredEnv,
  sleep,
} from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

function parseTopicArg(): string {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const topic = args[0]?.trim();
  if (!topic) {
    throw new Error('Usage: npm run generate:adjectives-topic -- "<topic>" [--limit=N]');
  }
  return topic;
}

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
    `List useful English adjectives related to the topic: ${topic}`,
    "",
    "Rules:",
    "",
    "focus on B1–B2 level adjectives",
    "include natural, commonly used words",
    "include expressive adjectives (e.g. 'joyful', 'frustrated', 'peaceful')",
    "avoid very basic words (like 'big', 'good', 'nice')",
    "avoid technical or scientific terms",
    "avoid rare or literary words",
    "return base forms only",
    "",
    "List about 80–120 adjectives so there is enough variety after filtering.",
    "",
    "Return only a strict JSON array of strings (no markdown).",
  ].join("\n");
}

/** Same enrichment contract as generate-adjectives-missing.ts */
function buildAdjectiveEnrichPrompt(lemma: string): string {
  return [
    "You are generating vocabulary data.",
    "",
    `Word: "${lemma}"`,
    "",
    "Return JSON:",
    "",
    "{",
    '"translation_pl": "...",',
    '"definition_en": "...",',
    '"examples": ["...", "..."],',
    '"level": "A1|A2|B1|B2|C1|C2"',
    "}",
    "",
    "Rules:",
    "",
    "translation must be natural Polish",
    "definition must be simple and clear",
    "examples must be natural English sentences",
    `examples must include the word "${lemma}"`,
    "avoid artificial sentences",
    "use real-life contexts",
    "",
    "Return ONLY JSON (no markdown).",
  ].join("\n");
}

async function loadExistingAdjectiveNorms(supabase: SupabaseClient): Promise<Set<string>> {
  const out = new Set<string>();
  const { data: rows, error } = await supabase.from("lexicon_entries").select("lemma_norm").eq("pos", "adjective");
  if (error) throw new Error(`lexicon_entries: ${error.message}`);
  for (const r of rows ?? []) {
    const s = (r as { lemma_norm?: string }).lemma_norm?.trim().toLowerCase();
    if (s) out.add(s);
  }
  return out;
}

async function main(): Promise<void> {
  const topic = parseTopicArg();
  const domain = `adjectives:${topicToDomainLabel(topic)}`;
  const limit = parseLimit();

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Topic: "${topic}" → domain: "${domain}"`);
  if (limit) console.log(`limit: ${limit}`);
  console.log("");

  console.log("Loading existing adjective lemmas…");
  const existing = await loadExistingAdjectiveNorms(supabase);
  console.log(`  ${existing.size} known base forms\n`);

  console.log("Requesting candidate adjective list (GPT)…");
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

      if (await lexiconEntryExists(supabase, lemmaNorm, "adjective")) {
        console.log(`[skip] ${label} — lexicon row appeared`);
        existing.add(lemmaNorm);
        skipped += 1;
        await sleep(DELAY_MS);
        continue;
      }

      const enrichRaw = await callOpenAIWithRetry(buildAdjectiveEnrichPrompt(lemma));
      const data = parseAdjectiveEnrichJson(enrichRaw);

      await insertAdjectiveBundle(supabase, lemma.trim(), lemmaNorm, data, domain);
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
