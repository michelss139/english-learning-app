/**
 * generate-article-content.ts
 * Generates glossary and conversation questions for an article.
 * Run: npx tsx scripts/generate-article-content.ts <slug>
 *
 * Example: npx tsx scripts/generate-article-content.ts comfort-vs-privacy
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

async function callClaude(prompt: string, maxTokens = 4000): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt + "\n\nIMPORTANT: Return ONLY raw JSON — no markdown fences, no explanation." }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
  console.log("  [tokens:", msg.usage.output_tokens, "]");
  return text;
}

function extractJson<T>(text: string): T {
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" || text[i] === "[") { start = i; break; }
  }
  if (start === -1) throw new Error(`No JSON: ${text.slice(0, 200)}`);
  const openChar = text[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === openChar) depth++;
    if (c === closeChar) { depth--; if (depth === 0) return JSON.parse(text.slice(start, i + 1)) as T; }
  }
  throw new Error("Unbalanced JSON");
}

async function main() {
  const slug = process.argv[2];
  if (!slug) { console.error("Usage: npx tsx scripts/generate-article-content.ts <slug>"); process.exit(1); }

  // Load article
  const { data: article, error } = await supabase
    .from("articles")
    .select("id, title, category")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !article) { console.error("Article not found:", slug); process.exit(1); }

  // Load article levels text
  const { data: levels } = await supabase
    .from("article_levels")
    .select("level, body_text")
    .eq("article_id", article.id)
    .order("level");

  if (!levels?.length) { console.error("No article levels found"); process.exit(1); }

  // Check existing data
  const { data: existingGlossary } = await supabase.from("article_glossary").select("id").eq("article_id", article.id);
  const { data: existingQuestions } = await supabase.from("article_conversation_questions").select("id").eq("article_id", article.id);
  if ((existingGlossary?.length ?? 0) > 0 || (existingQuestions?.length ?? 0) > 0) {
    console.log(`Article already has ${existingGlossary?.length} glossary entries and ${existingQuestions?.length} questions.`);
    console.log("Delete existing entries first if you want to regenerate.");
    process.exit(0);
  }

  for (const levelData of levels) {
    const level = levelData.level;
    const bodyText = levelData.body_text;
    console.log(`\nProcessing level ${level}...`);

    // Generate glossary
    console.log("  Generating glossary…");
    const glossaryRaw = await callClaude(`
You are preparing educational materials for Polish adults (B2 level English learners) reading the following article.

Article title: "${article.title}"
Level: ${level}
Article text:
---
${bodyText.slice(0, 3000)}
---

Generate a glossary of 12-18 important vocabulary items from this article. Choose words and phrases that:
- Are genuinely useful for B2+ learners
- Appear in or are closely related to the article
- Have clear, concise English definitions (not Polish translations)
- Include phrasal verbs, collocations, and key terms

Return a JSON array. Each object:
{
  "term": "the word or phrase exactly as in text",
  "definition": "Clear English definition, 1-2 sentences max. Include example of use if helpful."
}
`);
    const glossary = extractJson<{ term: string; definition: string }[]>(glossaryRaw);

    const glossaryRows = glossary.map((g, i) => ({
      article_id: article.id,
      level,
      term: g.term,
      definition: g.definition,
      sort_order: i + 1,
    }));

    const { error: gErr } = await supabase.from("article_glossary").insert(glossaryRows);
    if (gErr) throw new Error(`Glossary insert (${level}): ${gErr.message}`);
    console.log(`  ✓ ${glossaryRows.length} glossary entries`);

    // Generate conversation questions
    console.log("  Generating conversation questions…");
    const questionsRaw = await callClaude(`
You are preparing discussion questions for Polish adults (${level} English learners) who have just read this article.

Article title: "${article.title}"
Level: ${level}
Article text:
---
${bodyText.slice(0, 3000)}
---

Generate 5 conversation/discussion questions that:
- Are thought-provoking and open-ended
- Connect the article topic to students' real lives and opinions
- Are appropriate for the ${level} level (language complexity)
- Would work well in a 1-on-1 lesson with a teacher
- Progress from factual recall to personal opinion/analysis

Return a JSON array. Each object:
{
  "question": "The discussion question in English."
}
`);
    const questions = extractJson<{ question: string }[]>(questionsRaw);

    const questionRows = questions.map((q, i) => ({
      article_id: article.id,
      level,
      question: q.question,
      sort_order: i + 1,
    }));

    const { error: qErr } = await supabase.from("article_conversation_questions").insert(questionRows);
    if (qErr) throw new Error(`Questions insert (${level}): ${qErr.message}`);
    console.log(`  ✓ ${questionRows.length} conversation questions`);
  }

  console.log(`\n✅ Article content generated for: ${slug}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
