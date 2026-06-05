/**
 * generate-cluster-data.ts
 *
 * Generates:
 * 1. Examples (with example_pl) for hear-listen and say-tell
 * 2. example_pl for existing make-do and bring-take examples
 * 3. Correction questions (15 per cluster) for all 4 clusters
 *
 * Run: npx tsx scripts/generate-cluster-data.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// correct_entry_id = vocab_cluster_entries.id (NOT lexicon_entries.id)
const CLUSTER_CORRECT_ENTRY_IDS: Record<string, string> = {
  "make-do":    "c22321e2-fa1e-4bd6-a388-8796aa783a8a", // make (cluster entry)
  "bring-take": "b3338ab1-7994-4d08-9507-91da611dbf98", // take (cluster entry — bring not in entries)
  "hear-listen":"211df91d-3d43-4325-9acd-77b5fdce562c", // hear (cluster entry)
  "say-tell":   "82116161-7baa-42aa-b48a-0f19f5a3c741", // say (cluster entry)
};

const CLUSTER_IDS: Record<string, string> = {
  "make-do":    "531d65ca-642f-49dc-8a84-b20c57f9e351",
  "bring-take": "9694ca31-938c-41d1-90ad-2fe9e60e181e",
  "hear-listen":"dcffb5cd-ecb4-462d-97fb-8f6e44606d5b",
  "say-tell":   "16ad9050-4866-4767-ba09-cf8a0d7dafd7",
};

async function callClaude(prompt: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
}

function extractJson<T>(text: string): T {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array found");
  return JSON.parse(match[0]) as T;
}

// ── Step 1: Generate examples for hear-listen and say-tell ───────────────────

async function generateExamples(slug: string): Promise<void> {
  console.log(`\n▶ Generating examples for ${slug}…`);
  const [v1, v2] = slug.split("-") as [string, string];

  const text = await callClaude(`
Generate 20 natural English sentence examples for the vocabulary cluster "${v1} / ${v2}".

Rules:
- 10 examples using "${v1}", 10 using "${v2}"
- Level A2-B1, everyday situations, natural English
- Each example must clearly show the correct usage that distinguishes the two verbs
- Polish translations must be natural Polish, not word-for-word

Return ONLY a JSON array. No markdown. Each object:
{
  "example_en": "She listens to music while cooking.",
  "example_pl": "Słucha muzyki podczas gotowania.",
  "focus_term": "${v1} or ${v2} (the exact form used)",
  "note": "one short sentence explaining why this verb is correct here"
}
`);

  const examples = extractJson<Array<{
    example_en: string;
    example_pl: string;
    focus_term: string;
    note: string;
  }>>(text);

  const rows = examples.map((e, i) => ({
    cluster_id: CLUSTER_IDS[slug],
    example_en: e.example_en,
    example_pl: e.example_pl,
    focus_term: e.focus_term,
    note: e.note,
    source: "ai",
    sort_order: i + 1,
  }));

  const { error } = await supabase.from("vocab_cluster_examples").insert(rows);
  if (error) throw new Error(`Insert error: ${error.message}`);
  console.log(`  ✓ Inserted ${rows.length} examples for ${slug}`);
}

// ── Step 2: Add example_pl to existing make-do and bring-take examples ────────

async function enrichExampleTranslations(slug: string): Promise<void> {
  console.log(`\n▶ Adding example_pl to existing ${slug} examples…`);

  const { data, error } = await supabase
    .from("vocab_cluster_examples")
    .select("id, example_en")
    .eq("cluster_id", CLUSTER_IDS[slug])
    .is("example_pl", null)
    .limit(60);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    console.log(`  ✓ No examples need translation for ${slug}`);
    return;
  }

  const text = await callClaude(`
Translate these English sentences to natural Polish. Return ONLY a JSON array.
Each object: { "id": "<uuid>", "example_pl": "<natural Polish translation>" }

Sentences:
${data.map((d) => `{"id":"${d.id}","en":"${d.example_en}"}`).join("\n")}
`);

  const translations = extractJson<Array<{ id: string; example_pl: string }>>(text);

  for (const t of translations) {
    await supabase
      .from("vocab_cluster_examples")
      .update({ example_pl: t.example_pl })
      .eq("id", t.id);
  }
  console.log(`  ✓ Updated ${translations.length} translations for ${slug}`);
}

// ── Step 3: Generate correction questions ─────────────────────────────────────

async function generateCorrectionQuestions(slug: string): Promise<void> {
  console.log(`\n▶ Generating correction questions for ${slug}…`);
  const [v1, v2] = slug.split("-") as [string, string];

  const text = await callClaude(`
Generate 15 "correct the mistake" questions for the vocabulary cluster "${v1} / ${v2}".

Each question shows a sentence with a wrong verb choice. The student must rewrite the sentence with the correct verb.

Rules:
- Each sentence uses the WRONG verb (${v1} where ${v2} should be, or vice versa)
- The corrected sentence should be clear and natural
- Mix of tenses and subjects (I, he, she, they, we)
- Add a short Polish explanation of why the correction is needed
- Do NOT make other errors — only the wrong verb choice

Return ONLY a JSON array. No markdown. Each object:
{
  "source_text": "I made a shower before work.",
  "expected_answer": "I had a shower before work.",
  "explanation": "Z 'shower' używamy 'have', nie 'make'. Mówimy 'have a shower/bath'.",
  "instruction": "Popraw błąd w zdaniu."
}
`);

  const questions = extractJson<Array<{
    source_text: string;
    expected_answer: string;
    explanation: string;
    instruction: string;
  }>>(text);

  const rows = questions.map((q, i) => ({
    cluster_id: CLUSTER_IDS[slug],
    slot: "correction",
    correct_entry_id: CLUSTER_CORRECT_ENTRY_IDS[slug],
    correct_choice: q.expected_answer,
    choices: [q.expected_answer, "__text__"],
    prompt: "Popraw błąd w zdaniu:",
    source_text: q.source_text,
    expected_answer: q.expected_answer,
    accepted_answers: [q.expected_answer],
    explanation: q.explanation,
    instruction: q.instruction,
    task_type: "correction",
    is_active: true,
    sort_order: 100 + i,
  }));

  const { error } = await supabase.from("vocab_cluster_questions").insert(rows);
  if (error) throw new Error(`Insert error: ${error.message}`);
  console.log(`  ✓ Inserted ${rows.length} correction questions for ${slug}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Steps 1 & 2 already done — only run correction questions
  for (const slug of Object.keys(CLUSTER_IDS)) {
    await generateCorrectionQuestions(slug);
  }

  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
