/**
 * generate-cluster-travel-trip-journey.ts
 * Creates the "travel / trip / journey" cluster.
 * Run: npx tsx scripts/generate-cluster-travel-trip-journey.ts
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
  slug: "travel-trip-journey",
  title: "travel / trip / journey",
  words: ["travel", "trip", "journey"],
  entryIds: {
    travel: "d8de272a-204c-4e3e-be26-4d5ad16d1562",
    trip:   "b0c97ac9-dec3-459b-b2d0-65756d8339fd",
    journey: "c5128ebb-830f-4845-930e-e7fc7684c919",
  },
};

async function callClaude(prompt: string, maxTokens = 6000): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
  console.log("  [stop_reason:", msg.stop_reason, "output_tokens:", msg.usage.output_tokens, "]");
  return text;
}

function extractJson<T>(text: string): T {
  let start = -1;
  let openChar = "";
  let closeChar = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") { start = i; openChar = "{"; closeChar = "}"; break; }
    if (text[i] === "[") { start = i; openChar = "["; closeChar = "]"; break; }
  }
  if (start === -1) throw new Error(`No JSON found in: ${text.slice(0, 200)}`);
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === openChar) depth++;
    if (c === closeChar) { depth--; if (depth === 0) return JSON.parse(text.slice(start, i + 1)) as T; }
  }
  throw new Error(`Unbalanced JSON. Start: ${start}, Final depth: ${depth}, inString: ${inString}. Text slice: ${text.slice(start, start + 300)}`);
}

async function main() {
  // ── 1. Theory ──────────────────────────────────────────────────────────────
  console.log("Generating theory…");
  const theoryText = await callClaude(`
Generate theory content for a Polish learner studying the English vocabulary cluster: "travel / trip / journey".

Key distinctions:
- travel = podróżowanie jako czynność lub zjawisko ogólne (niepoliczalne jako rzeczownik: I love travel. Travel is tiring. Ale też: a travel agency)
- trip = konkretna, zazwyczaj krótka wycieczka z powrotem do punktu wyjścia (policzalne: a day trip, a business trip, a road trip, go on a trip)
- journey = konkretna, często długa podróż z punktu A do B, skupiona na samej drodze (policzalne: a long journey, a journey by train, the journey home)

Common Polish mistakes: Polacy mówią "I made a long travel" zamiast "I went on a long trip" albo "I had a long journey". Słowo "travel" jako rzeczownik jest rzadkie i niepoliczalne — prawie zawsze lepiej użyć "trip" lub "journey".

Return ONLY a JSON object:
{
  "theory_md": "Full theory in Polish, plain text ~200 words. Explain travel vs trip vs journey, key grammar rules (travel is uncountable as noun), typical collocations (go on a trip, have a journey), common mistakes Poles make.",
  "theory_summary": "One sentence in Polish, max 25 words, core rule.",
  "learning_goal": "One sentence in Polish, max 20 words, what student will be able to do."
}
`);
  const theory = extractJson<{ theory_md: string; theory_summary: string; learning_goal: string }>(theoryText);

  // ── 2. Create cluster ───────────────────────────────────────────────────────
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
      display_order: 71,
    })
    .select("id")
    .single();

  if (clusterErr) throw new Error(`Cluster create: ${clusterErr.message}`);
  const clusterId = (clusterData as { id: string }).id;
  console.log(`  ✓ Cluster: ${clusterId}`);

  // ── 3. Cluster entries ──────────────────────────────────────────────────────
  const { error: entriesErr } = await supabase.from("vocab_cluster_entries").insert(
    Object.values(CLUSTER.entryIds).map((entryId) => ({ cluster_id: clusterId, entry_id: entryId }))
  );
  if (entriesErr) console.warn("Entries warning:", entriesErr.message);
  console.log("  ✓ Entries");

  // ── 4. Patterns ─────────────────────────────────────────────────────────────
  console.log("Generating patterns…");
  const patternsText = await callClaude(`
Generate 6 core usage patterns for the English vocabulary cluster "travel / trip / journey".

Focus on the most common and most confused patterns Poles encounter.

Return ONLY a JSON array. Each object:
{
  "title": "Short title in Polish (5-8 words)",
  "pattern_en": "key pattern with examples, e.g. 'go on a trip / take a trip / a business trip'",
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

  // ── 5. Examples ─────────────────────────────────────────────────────────────
  console.log("Generating examples…");
  const examplesText = await callClaude(`
Generate 21 natural English sentence examples for the vocabulary cluster "travel / trip / journey".

Distribute: 5 × travel (noun/general), 8 × trip, 8 × journey.

Rules:
- Level A2-B1, everyday situations
- Show WHY this word is correct (not the others)
- Polish translation must be natural

Return ONLY a JSON array. Each object:
{
  "example_en": "We went on a three-day trip to the mountains.",
  "example_pl": "Pojechaliśmy na trzydniową wycieczkę w góry.",
  "focus_term": "trip",
  "note": "trip = konkretna krótka wycieczka z powrotem (policzalne)"
}
`);
  const examples = extractJson<{ example_en: string; example_pl: string; focus_term: string; note: string }[]>(examplesText);
  const { error: exErr } = await supabase.from("vocab_cluster_examples").insert(
    examples.map((e, i) => ({ cluster_id: clusterId, ...e, source: "ai", sort_order: i + 1 }))
  );
  if (exErr) throw new Error(`Examples: ${exErr.message}`);
  console.log(`  ✓ ${examples.length} examples`);

  // ── 6. Questions ─────────────────────────────────────────────────────────────
  console.log("Generating questions…");
  const questionsText = await callClaude(`
Generate 35 practice questions for the vocabulary cluster "travel / trip / journey".

Mix:
- 18 × choice: fill-in-the-blank, choose correct word (travel/trip/journey)
- 10 × translation: Polish sentence → English using correct word
- 7 × correction: sentence with WRONG word, student rewrites

Rules:
- Explanations in Polish
- Natural everyday situations
- "travel" as noun only (not verb) in this cluster

For choice:
{
  "task_type": "choice",
  "prompt": "We're planning a camping ___ for the weekend.",
  "correct_choice": "trip",
  "choices": ["trip", "journey", "travel"],
  "explanation": "trip = krótka wycieczka z powrotem (weekend trip, camping trip)"
}

For translation:
{
  "task_type": "translation",
  "prompt": "Przetłumacz zdanie",
  "source_text": "Podróż pociągiem trwała sześć godzin.",
  "correct_choice": "The journey by train took six hours.",
  "choices": ["The journey by train took six hours.", "__text__"],
  "explanation": "journey = konkretna podróż z A do B, skupiona na samej drodze"
}

For correction:
{
  "task_type": "correction",
  "prompt": "Popraw błąd w zdaniu:",
  "source_text": "I made a long travel to visit my grandparents.",
  "correct_choice": "I went on a long trip to visit my grandparents.",
  "choices": ["I went on a long trip to visit my grandparents.", "__text__"],
  "explanation": "'travel' jako rzeczownik jest niepoliczalne i nie łączy się z 'make'. Użyj 'go on a trip'."
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

  const { data: clusterEntries } = await supabase
    .from("vocab_cluster_entries")
    .select("id, entry_id")
    .eq("cluster_id", clusterId);

  const fallbackEntryId = (clusterEntries?.[0] as { id: string } | undefined)?.id ?? "";

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
      ? (CLUSTER.words.find((w) => q.correct_choice.toLowerCase().includes(w)) ? [CLUSTER.words.find((w) => q.correct_choice.toLowerCase().includes(w))!] : ["trip"])
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

  console.log("\n✅ travel / trip / journey cluster created!");
  console.log(`   ID: ${clusterId}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
