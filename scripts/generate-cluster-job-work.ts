/**
 * generate-cluster-job-work.ts
 * Creates the "job / work / career" cluster from scratch.
 * Run: npx tsx scripts/generate-cluster-job-work.ts
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

const CLUSTER = {
  slug: "job-work-career",
  title: "job / work / career",
  verbs: ["job", "work", "career"],
  entryIds: {
    job:    "8dde664f-754a-4f9b-8c6e-697f0213bbbd",
    work:   "99580141-6a36-426d-9892-857814a061a7",
    career: "c365e436-a33f-4f71-9eea-d077b4732eee",
  },
};

async function callClaude(prompt: string, maxTokens = 6000): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
}

function extractJson<T>(text: string): T {
  const match = text.match(/[\[{][\s\S]*[\]}]/);
  if (!match) throw new Error("No JSON found");
  return JSON.parse(match[0]) as T;
}

async function main() {
  // ── 1. Theory ────────────────────────────────────────────────────────────────
  console.log("Generating theory…");
  const theoryText = await callClaude(`
Generate theory content for a Polish learner studying the English vocabulary cluster: "job / work / career".

Key distinctions:
- job = konkretna posada/stanowisko (policzalne: a job, my job, get a job, lose a job)
- work = praca jako czynność lub pojęcie ogólne (niepoliczalne: go to work, at work, hard work, out of work)
- career = kariera zawodowa, droga zawodowa przez lata (a career in medicine, career goals)

Common Polish mistakes: Polacy mówią "I go to a work" zamiast "I go to work", albo "I have a work" zamiast "I have a job".

Return ONLY a JSON object:
{
  "theory_md": "Full theory in Polish, plain text ~180 words. Explain job vs work vs career, key grammar rules (work is uncountable), typical collocations, common mistakes Poles make.",
  "theory_summary": "One sentence in Polish, max 25 words, core rule.",
  "learning_goal": "One sentence in Polish, max 20 words, what student will be able to do."
}
`);
  const theory = extractJson<{ theory_md: string; theory_summary: string; learning_goal: string }>(theoryText);

  // ── 2. Create cluster ─────────────────────────────────────────────────────────
  console.log("Creating cluster…");
  const { data: clusterData, error: clusterErr } = await supabase
    .from("vocab_clusters")
    .insert({
      slug: CLUSTER.slug,
      title: CLUSTER.title,
      theory_md: theory.theory_md,
      theory_summary: theory.theory_summary,
      learning_goal: theory.learning_goal,
      is_recommended: true,
      is_unlockable: false,
      display_order: 11,
    })
    .select("id")
    .single();

  if (clusterErr) throw new Error(`Cluster create: ${clusterErr.message}`);
  const clusterId = (clusterData as { id: string }).id;
  console.log(`  ✓ Cluster: ${clusterId}`);

  // ── 3. Cluster entries ────────────────────────────────────────────────────────
  const { error: entriesErr } = await supabase.from("vocab_cluster_entries").insert(
    Object.values(CLUSTER.entryIds).map((entryId) => ({ cluster_id: clusterId, entry_id: entryId }))
  );
  if (entriesErr) console.warn("Entries warning:", entriesErr.message);
  console.log("  ✓ Entries");

  // ── 4. Patterns ───────────────────────────────────────────────────────────────
  console.log("Generating patterns…");
  const patternsText = await callClaude(`
Generate 6 core usage patterns for the English vocabulary cluster "job / work / career".

Focus on the most common and most confused patterns Poles encounter.

Return ONLY a JSON array. Each object:
{
  "title": "Short title in Polish (5-8 words)",
  "pattern_en": "key pattern with examples, e.g. 'get a job / find a job / lose a job'",
  "pattern_pl": "Polish equivalent",
  "usage_note": "One sentence in Polish explaining this pattern."
}
`);
  const patterns = extractJson<{ title: string; pattern_en: string; pattern_pl: string; usage_note: string }[]>(patternsText);
  const { error: pErr } = await supabase.from("vocab_cluster_patterns").insert(
    patterns.map((p, i) => ({ cluster_id: clusterId, ...p, sort_order: i + 1 }))
  );
  if (pErr) throw new Error(`Patterns: ${pErr.message}`);
  console.log(`  ✓ ${patterns.length} patterns`);

  // ── 5. Examples ───────────────────────────────────────────────────────────────
  console.log("Generating examples…");
  const examplesText = await callClaude(`
Generate 21 natural English sentence examples for the vocabulary cluster "job / work / career".

Distribute: 8 × job, 8 × work (noun), 5 × career.

Rules:
- Level A2-B1, everyday situations
- Show WHY this word is correct (not the others)
- Polish translation must be natural

Return ONLY a JSON array. Each object:
{
  "example_en": "She got a new job at a marketing agency.",
  "example_pl": "Dostała nową pracę w agencji marketingowej.",
  "focus_term": "job",
  "note": "job = konkretna posada (policzalne)"
}
`);
  const examples = extractJson<{ example_en: string; example_pl: string; focus_term: string; note: string }[]>(examplesText);
  const { error: exErr } = await supabase.from("vocab_cluster_examples").insert(
    examples.map((e, i) => ({ cluster_id: clusterId, ...e, source: "ai", sort_order: i + 1 }))
  );
  if (exErr) throw new Error(`Examples: ${exErr.message}`);
  console.log(`  ✓ ${examples.length} examples`);

  // ── 6. Questions ──────────────────────────────────────────────────────────────
  console.log("Generating questions…");
  const questionsText = await callClaude(`
Generate 35 practice questions for the vocabulary cluster "job / work / career".

Mix:
- 18 × choice: fill-in-the-blank, choose correct word (job/work/career)
- 10 × translation: Polish sentence → English using correct word
- 7 × correction: sentence with WRONG word, student rewrites

Rules:
- Explanations in Polish
- Natural everyday situations
- "work" as noun only (not verb) in this cluster

For choice:
{
  "task_type": "choice",
  "prompt": "She's been looking for a ___ for three months.",
  "correct_choice": "job",
  "choices": ["job", "work"],
  "explanation": "job = konkretna posada (policzalne), work = praca ogólnie (niepoliczalne)"
}

For translation:
{
  "task_type": "translation",
  "prompt": "Przetłumacz zdanie",
  "source_text": "Moja mama ma wymagającą pracę.",
  "correct_choice": "My mum has a demanding job.",
  "choices": ["My mum has a demanding job.", "__text__"],
  "explanation": "job = konkretna posada — tutaj policzalne z przymiotnikiem"
}

For correction:
{
  "task_type": "correction",
  "prompt": "Popraw błąd w zdaniu:",
  "source_text": "I go to a work every day by bus.",
  "correct_choice": "I go to work every day by bus.",
  "choices": ["I go to work every day by bus.", "__text__"],
  "explanation": "work jest niepoliczalne — nie używamy przedimka 'a' przed work."
}

Return ONLY a JSON array.
`, 7000);
  const questions = extractJson<{
    task_type: string;
    prompt: string;
    source_text?: string;
    correct_choice: string;
    choices: string[];
    explanation: string;
  }[]>(questionsText);

  // Fetch cluster entry IDs for correct_entry_id
  const { data: clusterEntries } = await supabase
    .from("vocab_cluster_entries")
    .select("id, entry_id")
    .eq("cluster_id", clusterId);

  const fallbackEntryId = (clusterEntries?.[0] as { id: string } | undefined)?.id ?? CLUSTER.entryIds.job;

  const rows = questions.map((q, i) => ({
    cluster_id: clusterId,
    slot: q.task_type === "correction" ? "correction" : q.task_type === "translation" ? "translation" : "choice",
    prompt: q.prompt,
    source_text: q.source_text ?? null,
    correct_choice: q.correct_choice,
    choices: q.choices,
    expected_answer: q.task_type !== "choice" ? q.correct_choice : null,
    accepted_answers: q.task_type !== "choice" ? [q.correct_choice] : null,
    target_tokens: q.task_type === "translation"
      ? (["job", "work", "career"].find((w) => q.correct_choice.toLowerCase().includes(w)) ? [["job","work","career"].find((w) => q.correct_choice.toLowerCase().includes(w))!] : ["job"])
      : null,
    explanation: q.explanation,
    task_type: q.task_type,
    correct_entry_id: fallbackEntryId,
    is_active: true,
    sort_order: i + 1,
  }));

  for (let i = 0; i < rows.length; i += 25) {
    const { error } = await supabase.from("vocab_cluster_questions").insert(rows.slice(i, i + 25));
    if (error) throw new Error(`Questions batch: ${error.message}`);
  }
  console.log(`  ✓ ${rows.length} questions`);

  console.log("\n✅ job / work / career cluster created!");
  console.log(`   ID: ${clusterId}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
