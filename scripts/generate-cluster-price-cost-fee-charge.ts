/**
 * generate-cluster-price-cost-fee-charge.ts
 * Creates the "price / cost / fee / charge" cluster.
 * Run: npx tsx scripts/generate-cluster-price-cost-fee-charge.ts
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
  slug: "price-cost-fee-charge",
  title: "price / cost / fee / charge",
  words: ["price", "cost", "fee", "charge"],
  entryIds: {
    price:  "1c75531f-f6f8-4cf1-9b28-b638c31ff8d2",
    cost:   "218be662-08ad-4732-a179-26a7095084f1",
    fee:    "25ef7b17-efcd-426c-8cb6-6d25f0c07cfb",
    charge: "6f54c8a0-dfb9-45c8-aad9-abb17ba6a4ac",
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
Generate theory content for a Polish learner studying the English vocabulary cluster: "price / cost / fee / charge".

Key distinctions:
- price = cena produktu lub usługi widoczna dla kupującego (what you pay for something in a shop/market: the price of milk, ticket price, price tag, price list, raise/lower the price)
- cost = koszt — ile coś kosztuje w sensie ogólnym lub całościowym, często w liczbie mnogiej (the cost of living, production costs, at a cost of £500, cost-effective). Może być niematerialne (the human cost).
- fee = opłata za profesjonalną usługę lub członkostwo (tuition fee, lawyer's fee, entrance fee, membership fee, registration fee). Zwykle związane z zawodem lub instytucją.
- charge = opłata naliczana za konkretną usługę lub użycie czegoś (bank charge, service charge, delivery charge, extra charge, free of charge). Często używane przez firmy/usługodawców.

Common Polish mistakes: Polacy używają "price" do wszystkiego — "the price of the lawyer" zamiast "the lawyer's fee", albo "price of delivery" zamiast "delivery charge".

Return a JSON object with keys: theory_md (Polish ~220 words, plain text), theory_summary (Polish, max 25 words), learning_goal (Polish, max 20 words).
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
      display_order: 73,
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
Generate 8 core usage patterns for the English vocabulary cluster "price / cost / fee / charge". Cover all four words. Focus on most confused patterns Poles encounter.

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
Generate 24 natural English sentence examples for "price / cost / fee / charge". Distribute evenly: 6 each. Level A2-B1. Show WHY this word is correct. Polish translation must be natural.

Return a JSON array. Each object: example_en, example_pl, focus_term (price/cost/fee/charge), note (short Polish explanation).
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
Generate 35 practice questions for "price / cost / fee / charge". Mix: 18 choice (fill-in-blank, options price/cost/fee/charge), 10 translation (Polish to English), 7 correction (wrong word rewrite). Cover all 4 words proportionally. Explanations in Polish.

Choice: { "task_type": "choice", "prompt": "..._...", "correct_choice": "fee", "choices": ["fee","price","charge","cost"], "explanation": "..." }
Translation: { "task_type": "translation", "prompt": "Przetłumacz zdanie", "source_text": "Polish.", "correct_choice": "English.", "choices": ["English.", "__text__"], "explanation": "..." }
Correction: { "task_type": "correction", "prompt": "Popraw błąd:", "source_text": "Wrong.", "correct_choice": "Correct.", "choices": ["Correct.", "__text__"], "explanation": "..." }

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
      ? (CLUSTER.words.find((w) => q.correct_choice.toLowerCase().includes(w)) ? [CLUSTER.words.find((w) => q.correct_choice.toLowerCase().includes(w))!] : ["cost"])
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

  console.log("\n✅ price / cost / fee / charge cluster created!");
  console.log(`   ID: ${clusterId}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
