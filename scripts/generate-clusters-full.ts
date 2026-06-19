/**
 * generate-clusters-full.ts
 *
 * Point 3: Complete skeleton clusters (get/take, lend/borrow/rent/hire, say/tell/speak/talk)
 * Point 4: Create new clusters (see/look/watch, know/find-out/learn, go/come)
 *
 * Run: npx tsx scripts/generate-clusters-full.ts
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

// ── Cluster definitions ────────────────────────────────────────────────────────

type ClusterDef = {
  slug: string;
  title: string;
  verbs: string[];           // main verbs to contrast
  existingId?: string;       // set if cluster already exists in DB
  entryIds: Record<string, string>; // lemma → lexicon_entries.id
};

const CLUSTERS: ClusterDef[] = [
  // ── Point 3: complete skeletons ──────────────────────────────────────────────
  {
    slug: "get-take",
    title: "get / take",
    verbs: ["get", "take"],
    existingId: "5ee6a0fb-4bd2-42a4-9d23-744218f050ac",
    entryIds: {
      get:  "42c4e4d4-2d95-427c-b694-124a15b3ddbe",
      take: "010c58bf-0904-4703-8596-a79f9090f7bb",
    },
  },
  {
    slug: "lend-borrow-rent-hire",
    title: "lend / borrow / rent / hire",
    verbs: ["lend", "borrow", "rent", "hire"],
    existingId: "49d16133-3ea3-422e-8bce-6cc8e96e0a5c",
    entryIds: {
      lend:   "e20b73be-d655-456f-afe9-5911e5c0521c",
      borrow: "292683e2-c388-4677-b014-a2586d235653",
      rent:   "c1cf8739-bcda-4300-9a9d-23ad196b0001",
      hire:   "7a5ef22b-1434-4c28-ba03-4f1c7c715be4",
    },
  },
  {
    slug: "say-tell-speak-talk",
    title: "say / tell / speak / talk",
    verbs: ["say", "tell", "speak", "talk"],
    existingId: "0fca45ac-d7e9-4604-bcf9-fe3c09f59251",
    entryIds: {
      say:   "c6c19645-55e9-4f32-aa4c-396565ceffef",
      tell:  "4355622e-6e9a-4331-a4a2-50558f985a1e",
      speak: "57c5c271-f4ef-4471-b264-302cbbb335aa",
      talk:  "41a41df3-3a8a-4e61-8363-9f923fbad7f2",
    },
  },
  // ── Point 4: new clusters ────────────────────────────────────────────────────
  {
    slug: "see-look-watch",
    title: "see / look / watch",
    verbs: ["see", "look", "watch"],
    entryIds: {
      see:   "f404f703-5528-4457-9c2b-b72ea07607bd",
      look:  "25900b6c-ba0a-4635-b374-110663fc14e6",
      watch: "bd1a8ee8-1a3c-4070-a215-f8676c54e6d9",
    },
  },
  {
    slug: "go-come",
    title: "go / come",
    verbs: ["go", "come"],
    entryIds: {
      go:   "2b8092c1-62c6-4bd9-a2c3-40cd9094c55a",
      come: "d899afce-02e3-44ec-9fec-930822aa5b27",
    },
  },
  {
    slug: "know-find-out-learn",
    title: "know / find out / learn",
    verbs: ["know", "find out", "learn"],
    entryIds: {
      know: "06ee75e0-5b99-4c3c-8fc7-22beef391dc5",
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callClaude(prompt: string, maxTokens = 5000): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
}

function extractJson<T>(text: string): T {
  const match = text.match(/[\[{][\s\S]*[\]}]/);
  if (!match) throw new Error("No JSON found in response");
  return JSON.parse(match[0]) as T;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Generate cluster content ──────────────────────────────────────────────────

type ClusterContent = {
  theory_md: string;
  theory_summary: string;
  learning_goal: string;
};

async function generateTheory(c: ClusterDef): Promise<ClusterContent> {
  const verbList = c.verbs.join(", ");
  const text = await callClaude(`
Generate theory content for a Polish learner studying the English vocabulary cluster: "${c.title}".

The cluster contrasts these verbs: ${verbList}

Return ONLY a JSON object (no markdown). Structure:
{
  "theory_md": "Full theory in Polish, plain text paragraphs separated by \\n\\n. Explain the key distinction between the verbs, when to use each, and common mistakes Poles make. Include verb forms (present/past). ~150-200 words.",
  "theory_summary": "One short sentence in Polish summarizing the core rule. Max 25 words.",
  "learning_goal": "One sentence in Polish stating what the student will be able to do after studying this. Max 20 words."
}
`);
  return extractJson<ClusterContent>(text);
}

type PatternRow = {
  title: string;
  pattern_en: string;
  pattern_pl: string;
  usage_note: string;
};

async function generatePatterns(c: ClusterDef): Promise<PatternRow[]> {
  const verbList = c.verbs.join(", ");
  const count = Math.min(c.verbs.length * 2, 6);
  const text = await callClaude(`
Generate ${count} core usage patterns for the English vocabulary cluster "${c.title}" (verbs: ${verbList}).

Each pattern shows a key grammatical or collocational rule for one of the verbs.

Return ONLY a JSON array. Each object:
{
  "title": "Short descriptive title in Polish (5-8 words)",
  "pattern_en": "verb + typical complement, e.g. 'get a taxi / get home / get better'",
  "pattern_pl": "Polish equivalent",
  "usage_note": "One sentence in Polish explaining when/why to use this pattern."
}
`);
  return extractJson<PatternRow[]>(text);
}

type ExampleRow = {
  example_en: string;
  example_pl: string;
  focus_term: string;
  note: string;
};

async function generateExamples(c: ClusterDef): Promise<ExampleRow[]> {
  const verbList = c.verbs.join(", ");
  const perVerb = c.verbs.length <= 2 ? 10 : 6;
  const total = c.verbs.length * perVerb;
  const text = await callClaude(`
Generate ${total} natural English sentence examples for the vocabulary cluster "${c.title}" (verbs: ${verbList}).

Distribute evenly: ~${perVerb} examples per verb.

Rules:
- Level A2-B1, everyday situations
- Each example must clearly show WHY this verb is correct (not the others)
- Polish translation must be natural Polish

Return ONLY a JSON array. Each object:
{
  "example_en": "She got a text from her boss.",
  "example_pl": "Dostała wiadomość od szefa.",
  "focus_term": "got",
  "note": "get = receive/obtain — dostawać/otrzymywać"
}
`);
  return extractJson<ExampleRow[]>(text);
}

type QuestionRow = {
  prompt: string;
  correct_choice: string;
  choices: string[];
  explanation: string;
  task_type: "choice" | "translation" | "correction";
  source_text?: string;
  expected_answer?: string;
};

async function generateQuestions(c: ClusterDef): Promise<QuestionRow[]> {
  const verbList = c.verbs.join(" / ");
  const text = await callClaude(`
Generate 30 practice questions for the vocabulary cluster "${c.title}" (${verbList}).

Mix of 3 types:
- 16 × "choice": fill-in-the-blank, choose the correct verb. "She ___ a taxi to the airport." choices: ["took","got"]
- 9 × "translation": translate a Polish sentence using the correct verb
- 5 × "correction": show a sentence with the WRONG verb, student rewrites with correct verb

Rules:
- Mix of subjects (I, he, she, they, we)
- Explanations in Polish
- Natural everyday situations

Return ONLY a JSON array. Each object for choice/translation:
{
  "task_type": "choice",
  "prompt": "She ___ a taxi to the airport.",
  "correct_choice": "took",
  "choices": ["took", "got"],
  "explanation": "take a taxi to = pojechać taksówką do (konkretne miejsce)"
}

For translation:
{
  "task_type": "translation",
  "prompt": "Przetłumacz zdanie",
  "correct_choice": "Can I borrow your pen?",
  "choices": ["Can I borrow your pen?", "__text__"],
  "explanation": "borrow = pożyczyć od kogoś (do siebie)"
}

For correction:
{
  "task_type": "correction",
  "prompt": "Popraw błąd w zdaniu:",
  "source_text": "Can I lend your pen for a minute?",
  "expected_answer": "Can I borrow your pen for a minute?",
  "correct_choice": "Can I borrow your pen for a minute?",
  "choices": ["Can I borrow your pen for a minute?", "__text__"],
  "explanation": "borrow = pożyczyć od kogoś. lend = pożyczyć komuś."
}
`, 6000);
  return extractJson<QuestionRow[]>(text);
}

// ── Database operations ───────────────────────────────────────────────────────

async function createCluster(c: ClusterDef, content: ClusterContent): Promise<string> {
  const { data, error } = await supabase
    .from("vocab_clusters")
    .insert({
      slug: c.slug,
      title: c.title,
      theory_md: content.theory_md,
      theory_summary: content.theory_summary,
      learning_goal: content.learning_goal,
      is_recommended: true,
      is_unlockable: false,
      display_order: 10,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Create cluster error: ${error.message}`);
  return (data as { id: string }).id;
}

async function updateCluster(id: string, content: ClusterContent): Promise<void> {
  const { error } = await supabase
    .from("vocab_clusters")
    .update({
      theory_md: content.theory_md,
      theory_summary: content.theory_summary,
      learning_goal: content.learning_goal,
      is_recommended: true,
    })
    .eq("id", id);
  if (error) throw new Error(`Update cluster error: ${error.message}`);
}

async function createClusterEntries(clusterId: string, c: ClusterDef): Promise<void> {
  const rows = Object.entries(c.entryIds).map(([, entryId]) => ({
    cluster_id: clusterId,
    entry_id: entryId,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("vocab_cluster_entries").insert(rows);
  if (error && !error.message.includes("duplicate")) throw new Error(`Entries error: ${error.message}`);
}

async function replacePatterns(clusterId: string, patterns: PatternRow[]): Promise<void> {
  await supabase.from("vocab_cluster_patterns").delete().eq("cluster_id", clusterId);
  const rows = patterns.map((p, i) => ({ cluster_id: clusterId, ...p, sort_order: i + 1 }));
  const { error } = await supabase.from("vocab_cluster_patterns").insert(rows);
  if (error) throw new Error(`Patterns error: ${error.message}`);
}

async function insertExamples(clusterId: string, examples: ExampleRow[]): Promise<void> {
  // Delete existing (likely only 2 placeholder examples)
  await supabase.from("vocab_cluster_examples").delete().eq("cluster_id", clusterId);
  const rows = examples.map((e, i) => ({ cluster_id: clusterId, ...e, source: "ai", sort_order: i + 1 }));
  const { error } = await supabase.from("vocab_cluster_examples").insert(rows);
  if (error) throw new Error(`Examples error: ${error.message}`);
}

async function insertQuestions(clusterId: string, questions: QuestionRow[], entryIds: Record<string, string>, verbs: string[]): Promise<void> {
  // Delete existing placeholder questions
  await supabase.from("vocab_cluster_questions").delete().eq("cluster_id", clusterId);

  const firstEntryId = Object.values(entryIds)[0]!;

  // Need to find vocab_cluster_entries.id for correct_entry_id
  const { data: clusterEntries } = await supabase
    .from("vocab_cluster_entries")
    .select("id, entry_id")
    .eq("cluster_id", clusterId);

  const entryToClusterEntryId = new Map(
    (clusterEntries ?? []).map((ce) => [(ce as { entry_id: string; id: string }).entry_id, (ce as { id: string }).id])
  );
  const fallbackClusterEntryId = (clusterEntries ?? [])[0] ? ((clusterEntries![0]) as { id: string }).id : firstEntryId;

  const verbTokens = verbs;

  const rows = questions.map((q, i) => {
    // For translation: target_tokens = verb(s) that appear in the correct answer
    const targetTokens = q.task_type === "translation"
      ? verbTokens.filter((v) => q.correct_choice.toLowerCase().includes(v.toLowerCase()))
          .map((v) => {
            // Find the exact form used in the answer
            const words = q.correct_choice.toLowerCase().split(/\s+/);
            return words.find((w) => w.startsWith(v.toLowerCase())) ?? v;
          })
          .filter(Boolean)
      : null;

    return {
      cluster_id: clusterId,
      slot: q.task_type === "correction" ? "correction" : q.task_type === "translation" ? "translation" : "choice",
      prompt: q.prompt,
      source_text: q.source_text ?? null,
      correct_choice: q.correct_choice,
      choices: q.choices,
      expected_answer: q.task_type !== "choice" ? q.correct_choice : null,
      accepted_answers: q.task_type !== "choice" ? [q.correct_choice] : null,
      target_tokens: targetTokens && targetTokens.length > 0 ? targetTokens : (q.task_type === "translation" ? [verbs[0]!] : null),
      explanation: q.explanation,
      task_type: q.task_type,
      correct_entry_id: entryToClusterEntryId.get(firstEntryId) ?? fallbackClusterEntryId,
      is_active: true,
      sort_order: i + 1,
    };
  });

  for (let i = 0; i < rows.length; i += 25) {
    const { error } = await supabase.from("vocab_cluster_questions").insert(rows.slice(i, i + 25));
    if (error) throw new Error(`Questions batch error: ${error.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function processCluster(c: ClusterDef): Promise<void> {
  console.log(`\n▶ ${c.title}`);

  console.log("  Generating theory…");
  const content = await generateTheory(c);
  await sleep(500);

  let clusterId = c.existingId;

  if (clusterId) {
    await updateCluster(clusterId, content);
    console.log("  ✓ Theory updated");
  } else {
    clusterId = await createCluster(c, content);
    console.log(`  ✓ Cluster created: ${clusterId}`);
  }

  await createClusterEntries(clusterId, c);
  console.log("  ✓ Entries ensured");

  console.log("  Generating patterns…");
  const patterns = await generatePatterns(c);
  await replacePatterns(clusterId, patterns);
  console.log(`  ✓ ${patterns.length} patterns`);
  await sleep(500);

  console.log("  Generating examples…");
  const examples = await generateExamples(c);
  await insertExamples(clusterId, examples);
  console.log(`  ✓ ${examples.length} examples`);
  await sleep(500);

  console.log("  Generating questions…");
  const questions = await generateQuestions(c);
  await insertQuestions(clusterId, questions, c.entryIds, c.verbs);
  console.log(`  ✓ ${questions.length} questions`);
}

async function main(): Promise<void> {
  // get-take already has theory/patterns/examples — only redo questions
  const GET_TAKE_ID = "5ee6a0fb-4bd2-42a4-9d23-744218f050ac";
  const getCluster = CLUSTERS.find((c) => c.slug === "get-take")!;
  console.log("\n▶ get / take — questions only (retry)");
  const questions = await generateQuestions(getCluster);
  await insertQuestions(GET_TAKE_ID, questions, getCluster.entryIds, getCluster.verbs);
  console.log(`  ✓ ${questions.length} questions`);

  // Process remaining clusters fully
  for (const cluster of CLUSTERS.filter((c) => c.slug !== "get-take")) {
    await processCluster(cluster);
    await sleep(1000);
  }

  console.log("\n✅ All clusters done!");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
