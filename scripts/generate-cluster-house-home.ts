/**
 * generate-cluster-house-home.ts
 * Creates the "house / home" cluster.
 * Run: npx tsx scripts/generate-cluster-house-home.ts
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
  slug: "house-home",
  title: "house / home",
  words: ["house", "home"],
  entryIds: {
    house: "ea4ec004-ae11-40ae-9d7c-0b7104e08c9b",
    home:  "b927ba16-3136-494a-8731-c3c750a337fc",
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

async function callClaudeJson<T>(prompt: string, maxTokens = 6000): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const text = await callClaude(prompt + "\n\nIMPORTANT: Return ONLY raw JSON — no markdown fences, no explanation. All double-quote characters inside string values MUST be escaped as \\\".", maxTokens);
    try {
      const start = text.indexOf("{") !== -1 ? (text.indexOf("[") !== -1 ? Math.min(text.indexOf("{"), text.indexOf("[")) : text.indexOf("{")) : text.indexOf("[");
      if (start === -1) throw new Error("No JSON start");
      return JSON.parse(text.slice(start, text.lastIndexOf(text[start] === "{" ? "}" : "]") + 1)) as T;
    } catch {
      try {
        const fence = text.replace(/```(?:json)?/gi, "").trim();
        const s2 = fence.indexOf("{") !== -1 ? (fence.indexOf("[") !== -1 ? Math.min(fence.indexOf("{"), fence.indexOf("[")) : fence.indexOf("{")) : fence.indexOf("[");
        if (s2 === -1) throw new Error("No JSON");
        const e2 = text[s2] === "{" ? fence.lastIndexOf("}") : fence.lastIndexOf("]");
        return JSON.parse(fence.slice(s2, e2 + 1)) as T;
      } catch {
        if (attempt === 3) throw new Error(`JSON parse failed after 3 attempts. Raw: ${text.slice(0, 400)}`);
        console.warn(`  Attempt ${attempt} failed, retrying…`);
      }
    }
  }
  throw new Error("unreachable");
}

async function main() {
  // ── 1. Theory ──────────────────────────────────────────────────────────────
  console.log("Generating theory…");
  const theory = await callClaudeJson<{ theory_md: string; theory_summary: string; learning_goal: string }>(`
Generate theory content for a Polish learner studying the English vocabulary cluster: "house / home".

Key distinctions:
- house = fizyczny budynek mieszkalny (policzalne: a house, a big house, buy a house, a three-bedroom house). Dom jako obiekt.
- home = miejsce gdzie się mieszka, skąd się pochodzi — emocjonalne, abstrakcyjne pojęcie (often no article: go home, stay at home, feel at home, work from home, home country, make yourself at home). Dom jako miejsce przynależności.

Ważne: "home" często używane bez przedimka (go home, not go to home). "house" zawsze z przedimkiem lub określeniem (a house, the house, my house).

Common Polish mistakes: Polacy używają "house" tam gdzie powinni użyć "home" (np. "I go to house" zamiast "I go home") oraz "home" zamiast "house" przy opisie fizycznego budynku.

Return a JSON object with keys: theory_md, theory_summary, learning_goal.
`);

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
      display_order: 72,
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
  const patterns = await callClaudeJson<{ title: string; pattern_en: string; pattern_pl: string; usage_note: string }[]>(`
Generate 6 core usage patterns for the English vocabulary cluster "house / home".

Focus on the most common and most confused patterns Poles encounter.

Return a JSON array. Each object: title (Polish 5-8 words), pattern_en, pattern_pl, usage_note (one Polish sentence).
`);
  const { error: pErr } = await supabase.from("vocab_cluster_patterns").insert(
    patterns.map((p, i) => ({ cluster_id: clusterId, ...p, sort_order: i + 1 }))
  );
  if (pErr) throw new Error(`Patterns: ${pErr.message}`);
  console.log(`  ✓ ${patterns.length} patterns`);

  // ── 5. Examples ─────────────────────────────────────────────────────────────
  console.log("Generating examples…");
  const examples = await callClaudeJson<{ example_en: string; example_pl: string; focus_term: string; note: string }[]>(`
Generate 21 natural English sentence examples for the vocabulary cluster "house / home". Distribute: 10 x house, 11 x home. Level A2-B1. Show WHY this word is correct. Polish translation must be natural.

Return a JSON array. Each object: example_en, example_pl, focus_term (house or home), note (short Polish explanation).
`);
  const { error: exErr } = await supabase.from("vocab_cluster_examples").insert(
    examples.map((e, i) => ({ cluster_id: clusterId, ...e, source: "ai", sort_order: i + 1 }))
  );
  if (exErr) throw new Error(`Examples: ${exErr.message}`);
  console.log(`  ✓ ${examples.length} examples`);

  // ── 6. Questions ─────────────────────────────────────────────────────────────
  console.log("Generating questions…");
  const questions = await callClaudeJson<{
    task_type: string;
    prompt: string;
    source_text?: string;
    correct_choice: string;
    choices: string[];
    explanation: string;
  }[]>(`
Generate 35 practice questions for the vocabulary cluster "house / home". Mix: 18 choice (fill-in-blank, house/home options), 10 translation (Polish to English), 7 correction (wrong word → rewrite). Explanations in Polish.

Choice format: { "task_type": "choice", "prompt": "..._...", "correct_choice": "home", "choices": ["home","house"], "explanation": "..." }
Translation format: { "task_type": "translation", "prompt": "Przetłumacz zdanie", "source_text": "Polish sentence.", "correct_choice": "English answer.", "choices": ["English answer.", "__text__"], "explanation": "..." }
Correction format: { "task_type": "correction", "prompt": "Popraw błąd:", "source_text": "Wrong sentence.", "correct_choice": "Correct sentence.", "choices": ["Correct sentence.", "__text__"], "explanation": "..." }

Return a JSON array.
`, 7000);

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
      ? (CLUSTER.words.find((w) => q.correct_choice.toLowerCase().includes(w)) ? [CLUSTER.words.find((w) => q.correct_choice.toLowerCase().includes(w))!] : ["home"])
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

  console.log("\n✅ house / home cluster created!");
  console.log(`   ID: ${clusterId}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
