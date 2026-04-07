/**
 * Orchestrates full vocabulary pack creation for one top-level category.
 * Uses existing CLI: import:nouns, build:pack. Generates nouns locally with lexicon-aware prompts.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const MAX_DAILY_ITEMS = 20;
const MAX_PRECISE_ITEMS = 20;
const MODEL = "gpt-4.1";

type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
const ALLOWED_LEVELS = new Set<Level>(["A1", "A2", "B1", "B2", "C1", "C2"]);

type Mode = "daily" | "precise";

type NounItem = {
  lemma: string;
  pos: "noun";
  translation_pl: string;
  definition_en: string;
  example_en: string;
  level: Level;
};

type GeneratedOutput = {
  meta: {
    category: string;
    subcategory: string;
    mode: Mode;
    pos: "noun";
    model: string;
    generatedAt: string;
  };
  items: NounItem[];
};

type SubcategoryRow = { slug: string; label: string };

type PreciseDecision = { create_precise: boolean; reason: string };

type SubReport = {
  subSlug: string;
  subLabel: string;
  daily: "OK" | "FAIL" | "SKIPPED";
  precise: "YES" | "NO" | "SKIP" | "FAIL" | "N/A";
  preciseReason: string;
  errors: string[];
};

function getArgv(): { category: string; dryRun: boolean } {
  const raw = process.argv.slice(2).filter((a) => a !== "--dry-run");
  const dryRun = process.argv.includes("--dry-run");
  const category = raw[0]?.trim().toLowerCase();
  if (!category || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) {
    throw new Error(
      'Usage: npm run generate:category <category> [--dry-run]\nExample: npm run generate:category garden',
    );
  }
  return { category, dryRun };
}

function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "OPENAI_API_KEY"): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

async function fetchExistingLemmaNorms(category: string): Promise<string[]> {
  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("lexicon_senses")
    .select("entry_id, domain, lexicon_entries(lemma_norm)")
    .like("domain", `${category}:%`)
    .limit(50);

  if (error) throw new Error(`Lexicon fetch failed: ${error.message}`);

  const out = new Set<string>();
  for (const row of data ?? []) {
    const e = row.lexicon_entries as { lemma_norm?: string } | null;
    const ln = e?.lemma_norm?.trim().toLowerCase();
    if (ln) out.add(ln);
  }
  return [...out].sort();
}

function buildSubcategoryPrompt(category: string): string {
  return [
    `List 4 to 8 practical vocabulary subcategories for "${category}".`,
    "",
    "Rules:",
    "- must be clearly different from each other",
    "- must be useful for learning nouns",
    "- avoid overlap",
    "- avoid very broad or very niche topics",
    "",
    "Return only strict JSON (no markdown):",
    '[{ "slug": "short-url-safe-lowercase", "label": "Human label in English" }]',
  ].join("\n");
}

function buildDailyPrompt(category: string, subcategory: string, existingWords: string[]): string {
  const existingBlock =
    existingWords.length > 0 ? existingWords.join(", ") : "(none yet for this domain)";

  return [
    "Generate 20 English nouns.",
    "",
    `Category: ${category}`,
    `Subcategory: ${subcategory}`,
    "",
    "Existing vocabulary (do not repeat or overlap):",
    existingBlock,
    "",
    "Rules:",
    "- common, practical words",
    "- everyday usage",
    "- level A1–B1",
    "- no technical or rare words",
    "- no duplicates",
    "- avoid similar meanings",
    "",
    "Each lemma must have at most 3 words. Hyphens allowed.",
    "translation_pl: max 5 words, no punctuation.",
    "definition_en: exactly 1 simple sentence (no semicolons).",
    "example_en: exactly 1 natural sentence (no quotes in output).",
    "",
    "Return only a strict JSON array (no markdown). Each object:",
    '{ "lemma": "...", "pos": "noun", "translation_pl": "...", "definition_en": "...", "example_en": "...", "level": "A1"|"A2"|"B1"|"B2"|"C1"|"C2" }',
  ].join("\n");
}

function buildPreciseDecisionPrompt(category: string, subcategory: string, dailyWords: string[]): string {
  const dailyBlock = dailyWords.length > 0 ? dailyWords.join(", ") : "(none — decide from topic only)";
  return [
    "Decide if this topic needs a separate 'precise' vocabulary set.",
    "",
    `Category: ${category}`,
    `Subcategory: ${subcategory}`,
    "",
    "Daily words:",
    dailyBlock,
    "",
    "Create 'precise' ONLY if:",
    "- there are clearly more specific or technical words",
    "- they are useful for learners",
    "- they are not just rare synonyms",
    "",
    "Return only strict JSON (no markdown):",
    '{ "create_precise": true, "reason": "..." }',
  ].join("\n");
}

function buildPrecisePrompt(
  category: string,
  subcategory: string,
  dailyWordsLines: string[],
  existingWords: string[],
): string {
  return [
    "Generate 15–20 more specific English nouns.",
    "",
    `Category: ${category}`,
    `Subcategory: ${subcategory}`,
    "",
    "Daily words (do not repeat):",
    dailyWordsLines.length > 0 ? dailyWordsLines.join("\n") : "(none)",
    "",
    "Existing vocabulary (do not repeat):",
    existingWords.length > 0 ? existingWords.join(", ") : "(none)",
    "",
    "Rules:",
    "- more specific than daily",
    "- level B1–C1",
    "- still useful in real life",
    "- no rare or obscure words",
    "- no duplicates",
    "- no overlap with daily",
    "",
    "Each lemma must have at most 3 words. Hyphens allowed.",
    "translation_pl: max 5 words, no punctuation.",
    "definition_en: exactly 1 simple sentence (no semicolons).",
    "example_en: exactly 1 natural sentence.",
    "",
    "Return only a strict JSON array (no markdown). Each object:",
    '{ "lemma": "...", "pos": "noun", "translation_pl": "...", "definition_en": "...", "example_en": "...", "level": "A1"|"A2"|"B1"|"B2"|"C1"|"C2" }',
  ].join("\n");
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [
        {
          role: "system",
          content: "You generate lexical datasets for editorial use. Follow output format exactly. JSON only.",
        },
        { role: "user", content: prompt },
      ],
      text: { format: { type: "text" } },
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`OpenAI API error ${response.status}: ${details}`);
  }

  const data = (await response.json()) as unknown;
  const text = extractResponseText(data);
  if (!text) throw new Error("OpenAI returned no extractable text.");
  return text;
}

function extractResponseText(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const response = raw as {
    output?: Array<{ content?: Array<{ type?: unknown; text?: unknown }> }>;
  };
  if (!Array.isArray(response.output)) return "";
  const chunks: string[] = [];
  for (const outputItem of response.output) {
    if (!outputItem?.content) continue;
    for (const contentItem of outputItem.content) {
      if (!contentItem || typeof contentItem !== "object") continue;
      const textValue = contentItem.text;
      if (typeof textValue === "string" && textValue.length > 0) {
        chunks.push(textValue);
        continue;
      }
      if (textValue && typeof textValue === "object" && "value" in textValue) {
        const value = (textValue as { value?: unknown }).value;
        if (typeof value === "string" && value.length > 0) chunks.push(value);
      }
    }
  }
  return chunks.join("").trim();
}

function stripJsonFence(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : t;
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function countWords(value: string): number {
  if (!value) return 0;
  return normalizeWhitespace(value).split(" ").filter(Boolean).length;
}

function hasPunctuation(value: string): boolean {
  return /[^\p{L}\p{N}\s]/u.test(value);
}

function hasInvalidPunctuationInLemma(value: string): boolean {
  return /[^\p{L}\p{N}\s-]/u.test(value);
}

function looksLikeOneSentence(value: string): boolean {
  const s = normalizeWhitespace(value);
  if (!s || s.length < 10) return false;
  if (s.includes(";")) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  return true;
}

function validateNounItems(raw: unknown, maxItems: number): NounItem[] {
  if (!Array.isArray(raw)) {
    throw new Error("Model output must be a JSON array.");
  }
  if (raw.length > maxItems) {
    throw new Error(`Array length ${raw.length} exceeds max ${maxItems}.`);
  }

  const unique = new Map<string, NounItem>();
  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Item at index ${index} must be an object.`);
    }
    const entry = item as Record<string, unknown>;
    const lemmaRaw = typeof entry.lemma === "string" ? normalizeWhitespace(entry.lemma) : "";
    const posRaw = entry.pos;
    const translationRaw =
      typeof entry.translation_pl === "string" ? normalizeWhitespace(entry.translation_pl) : "";
    const definitionRaw =
      typeof entry.definition_en === "string" ? normalizeWhitespace(entry.definition_en) : "";
    const exampleRaw =
      typeof entry.example_en === "string" ? normalizeWhitespace(entry.example_en) : "";
    const levelRaw = entry.level;

    if (!lemmaRaw) throw new Error(`Item at index ${index}: missing lemma.`);
    if (posRaw !== "noun") throw new Error(`"${lemmaRaw}": pos must be "noun".`);
    if (countWords(lemmaRaw) > 3) throw new Error(`"${lemmaRaw}": lemma too long.`);
    if (hasInvalidPunctuationInLemma(lemmaRaw)) throw new Error(`"${lemmaRaw}": invalid lemma punctuation.`);
    if (!translationRaw) throw new Error(`"${lemmaRaw}": missing translation_pl.`);
    if (countWords(translationRaw) > 5) throw new Error(`"${lemmaRaw}": translation too long.`);
    if (hasPunctuation(translationRaw)) throw new Error(`"${lemmaRaw}": punctuation in translation.`);
    if (!definitionRaw || !looksLikeOneSentence(definitionRaw)) {
      throw new Error(`"${lemmaRaw}": invalid definition_en.`);
    }
    if (!exampleRaw || !looksLikeOneSentence(exampleRaw)) {
      throw new Error(`"${lemmaRaw}": invalid example_en.`);
    }
    if (typeof levelRaw !== "string" || !ALLOWED_LEVELS.has(levelRaw as Level)) {
      throw new Error(`"${lemmaRaw}": invalid level.`);
    }

    const key = lemmaRaw.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, {
        lemma: lemmaRaw,
        pos: "noun",
        translation_pl: translationRaw,
        definition_en: definitionRaw,
        example_en: exampleRaw,
        level: levelRaw as Level,
      });
    }
  });

  return Array.from(unique.values());
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function fileSafeSlug(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
  const safe = normalized.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  return safe.replace(/^-|-$/g, "") || "unknown";
}

async function saveGenerated(category: string, subSlug: string, mode: Mode, items: NounItem[]): Promise<string> {
  const targetDir = path.join(process.cwd(), "content", "generated");
  await mkdir(targetDir, { recursive: true });
  const date = todayIsoDate();
  const fileName = `${date}_${fileSafeSlug(category)}_${fileSafeSlug(subSlug)}_${mode}.json`;
  const filePath = path.join(targetDir, fileName);

  const output: GeneratedOutput = {
    meta: {
      category,
      subcategory: subSlug,
      mode,
      pos: "noun",
      model: MODEL,
      generatedAt: new Date().toISOString(),
    },
    items,
  };

  await writeFile(filePath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`  → wrote ${filePath} (${items.length} items)`);
  return filePath;
}

function runNpmScript(script: string, args: string[]): void {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const fullArgs = ["run", script, "--", ...args];
  const r = spawnSync(npm, fullArgs, {
    stdio: "inherit",
    cwd: process.cwd(),
    shell: process.platform === "win32",
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`Command failed: ${npm} ${fullArgs.join(" ")} (exit ${r.status})`);
  }
}

function parseSubcategories(raw: string): SubcategoryRow[] {
  const parsed = JSON.parse(stripJsonFence(raw)) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Subcategories must be a JSON array.");
  const out: SubcategoryRow[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const slug = typeof r.slug === "string" ? fileSafeSlug(r.slug) : "";
    const label = typeof r.label === "string" ? r.label.trim() : "";
    if (!slug || !label) continue;
    out.push({ slug, label });
  }
  if (out.length < 4) {
    throw new Error(`Expected at least 4 subcategories, got ${out.length}.`);
  }
  return out;
}

function parsePreciseDecision(raw: string): PreciseDecision {
  const parsed = JSON.parse(stripJsonFence(raw)) as Record<string, unknown>;
  const create_precise = Boolean(parsed.create_precise);
  const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";
  return { create_precise, reason: reason || "(no reason)" };
}

async function main(): Promise<void> {
  const { category, dryRun } = getArgv();

  console.log(`\n=== generate:category "${category}"${dryRun ? " [DRY-RUN]" : ""} ===\n`);

  let existingPreview: string[] = [];
  if (!dryRun) {
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    existingPreview = await fetchExistingLemmaNorms(category);
    console.log(`Lexicon sample (up to 50, domain ${category}:*): ${existingPreview.length} lemmas\n`);
  }

  console.log("Fetching subcategories (LLM)…");
  const subRaw = await callOpenAI(buildSubcategoryPrompt(category));
  const subcategories = parseSubcategories(subRaw);
  console.log(`Subcategories (${subcategories.length}):`);
  for (const s of subcategories) {
    console.log(`  • ${s.slug} — ${s.label}`);
  }

  const report: SubReport[] = [];
  let packsCreated = 0;
  let preciseCount = 0;
  let skippedPrecise = 0;
  let errorCount = 0;

  if (dryRun) {
    console.log("\n[DRY-RUN] Precise preview (topic-only; no daily word list):\n");
    for (const s of subcategories) {
      const decRaw = await callOpenAI(buildPreciseDecisionPrompt(category, s.label, []));
      const dec = parsePreciseDecision(decRaw);
      console.log(`  ${s.slug}: precise=${dec.create_precise ? "likely YES" : "likely NO"} — ${dec.reason}`);
      report.push({
        subSlug: s.slug,
        subLabel: s.label,
        daily: "SKIPPED",
        precise: dec.create_precise ? "YES" : "NO",
        preciseReason: dec.reason,
        errors: [],
      });
      if (dec.create_precise) preciseCount += 1;
      else skippedPrecise += 1;
    }
    printFinalReport(category, report, {
      subs: subcategories.length,
      packs: 0,
      precise: preciseCount,
      skipped: skippedPrecise,
      errors: 0,
      dryRun: true,
    });
    return;
  }

  for (const s of subcategories) {
    const row: SubReport = {
      subSlug: s.slug,
      subLabel: s.label,
      daily: "FAIL",
      precise: "N/A",
      preciseReason: "",
      errors: [],
    };
    console.log(`\n--- ${s.slug} (${s.label}) ---`);

    let dailyItems: NounItem[] = [];
    try {
      const existing = await fetchExistingLemmaNorms(category);
      const dailyPrompt = buildDailyPrompt(category, s.label, existing);
      const dailyText = await callOpenAI(dailyPrompt);
      dailyItems = validateNounItems(JSON.parse(stripJsonFence(dailyText)), MAX_DAILY_ITEMS);
      if (dailyItems.length === 0) throw new Error("Daily generation returned no items.");

      const dailyPath = await saveGenerated(category, s.slug, "daily", dailyItems);
      runNpmScript("import:nouns", [dailyPath]);
      const importedDaily = path.join(process.cwd(), "content", "imported", path.basename(dailyPath));
      runNpmScript("build:pack", [category, s.slug, "daily", importedDaily, "--publish"]);
      row.daily = "OK";
      packsCreated += 1;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      row.errors.push(`daily: ${msg}`);
      console.error(`  DAILY FAILED: ${msg}`);
      errorCount += 1;
      report.push(row);
      continue;
    }

    try {
      const dailyForDecision = dailyItems.map((i) => `${i.lemma} (${i.translation_pl})`);
      const decRaw = await callOpenAI(buildPreciseDecisionPrompt(category, s.label, dailyForDecision));
      const dec = parsePreciseDecision(decRaw);
      row.preciseReason = dec.reason;

      if (!dec.create_precise) {
        row.precise = "NO";
        skippedPrecise += 1;
        console.log(`  Precise: NO — ${dec.reason}`);
        report.push(row);
        continue;
      }

      row.precise = "YES";
      const existingForPrecise = await fetchExistingLemmaNorms(category);
      const dailyLines = dailyItems.map((i) => `- ${i.lemma} — ${i.translation_pl}`);
      const precisePrompt = buildPrecisePrompt(category, s.label, dailyLines, existingForPrecise);
      const preciseText = await callOpenAI(precisePrompt);
      const preciseItems = validateNounItems(JSON.parse(stripJsonFence(preciseText)), MAX_PRECISE_ITEMS);
      if (preciseItems.length === 0) throw new Error("Precise generation returned no items.");

      const precisePath = await saveGenerated(category, s.slug, "precise", preciseItems);
      runNpmScript("import:nouns", [precisePath]);
      const importedPrecPath = path.join(process.cwd(), "content", "imported", path.basename(precisePath));
      runNpmScript("build:pack", [category, s.slug, "precise", importedPrecPath, "--publish"]);
      packsCreated += 1;
      preciseCount += 1;
      console.log(`  Precise: OK — ${dec.reason}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      row.precise = "FAIL";
      row.errors.push(`precise: ${msg}`);
      console.error(`  PRECISE FAILED: ${msg}`);
      errorCount += 1;
    }

    report.push(row);
  }

  printFinalReport(category, report, {
    subs: subcategories.length,
    packs: packsCreated,
    precise: preciseCount,
    skipped: skippedPrecise,
    errors: errorCount,
    dryRun: false,
  });
}

function printFinalReport(
  category: string,
  report: SubReport[],
  summary: { subs: number; packs: number; precise: number; skipped: number; errors: number; dryRun: boolean },
): void {
  console.log(`\n========== REPORT: ${category} ==========\n`);
  for (const r of report) {
    console.log(`${r.subSlug} (${r.subLabel})`);
    console.log(`  daily: ${r.daily}`);
    console.log(`  precise: ${r.precise}${r.preciseReason ? ` — ${r.preciseReason}` : ""}`);
    if (r.errors.length > 0) {
      for (const err of r.errors) console.log(`  ERROR: ${err}`);
    }
    console.log("");
  }
  console.log("Summary:");
  console.log(`  total subcategories: ${summary.subs}`);
  console.log(`  total packs created: ${summary.packs}`);
  console.log(`  total precise packs: ${summary.precise}`);
  console.log(`  precise skipped (NO): ${summary.skipped}`);
  console.log(`  total errors: ${summary.errors}`);
  if (summary.dryRun) console.log("  (dry-run — no files/import/build)");
  console.log("==========================================\n");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
