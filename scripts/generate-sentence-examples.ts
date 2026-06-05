/**
 * generate-sentence-examples.ts
 *
 * Generates sentence_examples rows using Claude API, then:
 * 1. Inserts into sentence_examples (tense + modal rows)
 * 2. Picks 4 best per verb and enriches lexicon_examples
 *
 * Run: npx tsx scripts/generate-sentence-examples.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Config ───────────────────────────────────────────────────────────────────

const VERBS = [
  "go", "come", "have", "do", "make",
  "take", "see", "get", "know", "think",
  "want", "give", "find", "tell", "use",
];

const TENSES = [
  "present-simple",
  "present-continuous",
  "present-perfect",
  "present-perfect-continuous",
  "past-simple",
  "past-continuous",
  "past-perfect",
  "past-perfect-continuous",
  "future-simple",
  "future-continuous",
  "future-perfect",
  "future-perfect-continuous",
];

const MODALS = ["can", "should", "must", "would", "could"];

const SUBJECTS = ["I", "he", "they"];

const TYPES = ["affirmative", "negative"] as const;

// sense_id from lexicon_senses for enrichment
const VERB_SENSE_IDS: Record<string, string> = {
  come:  "657190d6-9947-4136-b8c5-97292e03bccc",
  do:    "33b1673c-9f0b-4afd-978e-998140fff49f",
  find:  "03d60e13-87e8-4360-a3e6-c5649613256c",
  get:   "c661bd8f-d1ac-4210-ac90-124a0b806792",
  give:  "39f9a246-db77-438a-8ea8-cd9b74f28314",
  go:    "a5861a0d-aeb3-4fd2-a3b3-d9742a04342e",
  have:  "b3f08507-84dd-45d9-a3cc-1d5df48295a0",
  know:  "636003e2-1256-48db-ad39-456912ea0273",
  make:  "caff2cc3-82f9-4613-a47d-d80df6b65f46",
  see:   "6f48a1c7-9442-40da-b78d-d19a7dee50e6",
  take:  "772dc4ff-b16a-436a-8006-54a0c950a8c5",
  tell:  "d17da429-4a41-4458-8041-28d426176d83",
  think: "b0014bcc-d6c2-4f7a-bfb0-09995b7312a6",
  use:   "84857bd3-79fd-48d3-ae6d-00ed6cfe628d",
  want:  "442842cb-3862-444f-b426-4f3230b3dc7e",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type SentenceRow = {
  verb: string;
  tense: string | null;
  modal: string | null;
  subject: string;
  type: "affirmative" | "negative";
  sentence_en: string;
  sentence_pl: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function insertBatch(rows: SentenceRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from("sentence_examples").insert(batch);
    if (error) throw new Error(`Insert error: ${error.message}`);
  }
}

// ── Tense prompt ─────────────────────────────────────────────────────────────

function buildTensePrompt(verb: string): string {
  const expectedCount = TENSES.length * SUBJECTS.length * TYPES.length;
  return `Generate ${expectedCount} English sentence examples for the verb "${verb}".

Cover all combinations of:
- Tenses: ${TENSES.join(", ")}
- Subjects: ${SUBJECTS.join(", ")}
- Types: affirmative, negative

Requirements:
1. Sentences must be natural, everyday English at A2-B1 level — not textbook examples.
   Good: "I've been working here for three years." Bad: "I have done the thing."
2. Keep context CONSISTENT within each tense — e.g. all present-perfect rows for "${verb}"
   should refer to the same kind of situation, so comparing I/he/they is meaningful.
3. Polish translations must be natural Polish, not word-for-word.
4. For negative sentences use contractions: don't, doesn't, hasn't, won't, etc.
5. Never use placeholder phrases like "something" or "a place".

Return ONLY a JSON array. No markdown, no commentary. Each element:
{
  "verb": "${verb}",
  "tense": "<tense-slug>",
  "modal": null,
  "subject": "<subject>",
  "type": "<affirmative|negative>",
  "sentence_en": "<natural English sentence>",
  "sentence_pl": "<natural Polish translation>"
}

Tense slugs to use exactly: ${TENSES.join(", ")}`;
}

// ── Modal prompt ─────────────────────────────────────────────────────────────

function buildModalPrompt(verb: string): string {
  const expectedCount = MODALS.length * SUBJECTS.length * TYPES.length;
  return `Generate ${expectedCount} English sentence examples for the verb "${verb}" combined with modal verbs.

Cover all combinations of:
- Modals: ${MODALS.join(", ")}
- Subjects: ${SUBJECTS.join(", ")}
- Types: affirmative, negative

Requirements:
1. Sentences must be natural, everyday English at A2-B1 level.
2. Keep context consistent within each modal — all "should ${verb}" sentences should relate
   to a similar real-life situation.
3. Polish translations must be natural Polish, not word-for-word.
4. For negatives use contractions: can't, shouldn't, mustn't, wouldn't, couldn't.
5. Never use placeholder phrases.

Return ONLY a JSON array. No markdown, no commentary. Each element:
{
  "verb": "${verb}",
  "tense": null,
  "modal": "<modal>",
  "subject": "<subject>",
  "type": "<affirmative|negative>",
  "sentence_en": "<natural English sentence>",
  "sentence_pl": "<natural Polish translation>"
}`;
}

// ── Generate & validate ───────────────────────────────────────────────────────

async function generateRows(verb: string, prompt: string, expectedCount: number): Promise<SentenceRow[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  let rows: SentenceRow[];
  try {
    rows = JSON.parse(text);
  } catch {
    // Try to extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error(`No JSON array found in response for ${verb}`);
    rows = JSON.parse(match[0]);
  }

  if (!Array.isArray(rows)) throw new Error(`Response is not an array for ${verb}`);

  if (rows.length < expectedCount * 0.9) {
    console.warn(`  ⚠ Expected ~${expectedCount} rows, got ${rows.length} for ${verb}`);
  }

  return rows.filter(
    (r) =>
      typeof r.verb === "string" &&
      typeof r.subject === "string" &&
      typeof r.type === "string" &&
      typeof r.sentence_en === "string" &&
      typeof r.sentence_pl === "string"
  );
}

// ── Lexicon enrichment ────────────────────────────────────────────────────────

async function enrichLexicon(verb: string, rows: SentenceRow[]): Promise<void> {
  const senseId = VERB_SENSE_IDS[verb];
  if (!senseId) return;

  // Pick 4 affirmative rows from different tenses/modals for variety
  const candidates = rows.filter((r) => r.type === "affirmative");
  const picked: SentenceRow[] = [];
  const usedTenses = new Set<string>();

  for (const row of candidates) {
    const key = row.tense ?? row.modal ?? "modal";
    if (!usedTenses.has(key) && picked.length < 4) {
      picked.push(row);
      usedTenses.add(key);
    }
    if (picked.length >= 4) break;
  }

  const lexiconRows = picked.map((r) => ({
    sense_id: senseId,
    example_en: r.sentence_en,
    example_pl: r.sentence_pl,
    source: "ai-generated",
    example_hash: Buffer.from(r.sentence_en).toString("base64").slice(0, 32),
  }));

  const { error } = await supabase.from("lexicon_examples").insert(lexiconRows);
  if (error) console.warn(`  ⚠ Lexicon insert error for ${verb}: ${error.message}`);
  else console.log(`  ✓ Added ${lexiconRows.length} examples to lexicon_examples`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Check if table already has data
  const { count } = await supabase
    .from("sentence_examples")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    console.log(`⚠ sentence_examples already has ${count} rows. Skipping generation.`);
    console.log("  Delete rows first if you want to regenerate.");
    return;
  }

  const tenseExpected = TENSES.length * SUBJECTS.length * TYPES.length;   // 72
  const modalExpected = MODALS.length * SUBJECTS.length * TYPES.length;    // 30
  const totalExpected = VERBS.length * (tenseExpected + modalExpected);    // 1530

  console.log(`\n🚀 Generating sentence examples`);
  console.log(`   Verbs: ${VERBS.length} | Tense rows per verb: ~${tenseExpected} | Modal rows: ~${modalExpected}`);
  console.log(`   Expected total: ~${totalExpected} rows\n`);

  let grandTotal = 0;

  for (const verb of VERBS) {
    console.log(`\n▶ ${verb}`);

    // Tense rows
    console.log(`  Generating tense rows…`);
    const tenseRows = await generateRows(verb, buildTensePrompt(verb), tenseExpected);
    console.log(`  ✓ Got ${tenseRows.length} tense rows`);
    await insertBatch(tenseRows);
    console.log(`  ✓ Inserted tense rows`);

    await sleep(1000);

    // Modal rows
    console.log(`  Generating modal rows…`);
    const modalRows = await generateRows(verb, buildModalPrompt(verb), modalExpected);
    console.log(`  ✓ Got ${modalRows.length} modal rows`);
    await insertBatch(modalRows);
    console.log(`  ✓ Inserted modal rows`);

    // Lexicon enrichment — from tense rows (natural tense sentences)
    await enrichLexicon(verb, tenseRows);

    grandTotal += tenseRows.length + modalRows.length;
    console.log(`  Total so far: ${grandTotal} rows`);

    await sleep(500);
  }

  console.log(`\n✅ Done! Total rows inserted: ${grandTotal}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
