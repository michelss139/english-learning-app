import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type Mode = "daily" | "precise";
type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

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
    model: "gpt-4.1";
    generatedAt: string;
  };
  items: NounItem[];
};

const ALLOWED_LEVELS = new Set<Level>(["A1", "A2", "B1", "B2", "C1", "C2"]);
const MAX_ITEMS = 20;

function getCliArgs(): { category: string; subcategory: string; mode: Mode } {
  const [, , categoryArg, subcategoryArg, modeArg] = process.argv;

  if (!categoryArg || !subcategoryArg || !modeArg) {
    throw new Error(
      'Usage: npm run generate:nouns <category> <subcategory> <mode>\nExample: npm run generate:nouns garden plants daily',
    );
  }

  const mode = modeArg.toLowerCase();
  if (mode !== "daily" && mode !== "precise") {
    throw new Error('Invalid mode. Allowed values: "daily" | "precise".');
  }

  return {
    category: categoryArg.trim(),
    subcategory: subcategoryArg.trim(),
    mode,
  };
}

function buildPrompt(category: string, subcategory: string, mode: Mode): string {
  const levelInstruction =
    mode === "daily"
      ? "Prefer CEFR A1-B1."
      : "Prefer CEFR B2-C2.";

  return [
    "Generate a maximum of 20 English nouns.",
    `Context category: "${category}".`,
    `Context subcategory: "${subcategory}".`,
    levelInstruction,
    "Each item must be a noun.",
    "Each lemma must have at most 3 words, no punctuation.",
    "translation_pl: max 3 words, no punctuation.",
    "definition_en: exactly 1 simple sentence (plain, not academic, no semicolons).",
    "example_en: exactly 1 natural, everyday sentence (no quotes).",
    "Return only a strict JSON array (no markdown, no explanation).",
    "Each object must contain exactly these fields:",
    '- "lemma": string',
    '- "pos": "noun"',
    '- "translation_pl": string',
    '- "definition_en": string (1 simple sentence)',
    '- "example_en": string (1 natural sentence)',
    '- "level": one of A1,A2,B1,B2,C1,C2',
    "",
    "QUALITY CONTROL STEP:",
    "After generating the full list of items, carefully proofread every \"definition_en\" and \"example_en\".",
    "For each item:",
    "- Ensure the example sentence is grammatically correct.",
    "- Ensure correct singular/plural agreement.",
    "- Ensure correct use of articles (a, an, the).",
    "- Ensure verb agreement.",
    "- Ensure the sentence sounds natural and fluent in everyday English.",
    "- Ensure the example matches the lemma meaning.",
    "",
    "If any sentence contains a grammar mistake, awkward phrasing, or incorrect article usage, fix it before producing the final output.",
    "",
    "Only return the corrected final JSON array.",
    "Do not explain corrections.",
    "Do not add comments.",
    "Return JSON only.",
  ].join("\n");
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content:
            "You generate lexical datasets for editorial use. Follow output format exactly.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      text: {
        format: {
          type: "text",
        },
      },
    }),
  });

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch {
      details = "Could not read error response body.";
    }
    throw new Error(`OpenAI API error ${response.status}: ${details}`);
  }

  const data = (await response.json()) as unknown;
  const extractedText = extractResponseText(data);
  if (!extractedText) {
    console.error(
      "OpenAI response did not contain extractable text. Raw response JSON:\n" +
        JSON.stringify(data, null, 2),
    );
    throw new Error("OpenAI API returned no extractable text.");
  }

  return extractedText;
}

function extractResponseText(raw: unknown): string {
  if (!raw || typeof raw !== "object") {
    return "";
  }

  const response = raw as {
    output?: Array<{
      content?: Array<{ type?: unknown; text?: unknown }>;
    }>;
  };

  if (!Array.isArray(response.output)) {
    return "";
  }

  const chunks: string[] = [];
  for (const outputItem of response.output) {
    if (!outputItem || !Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (!contentItem || typeof contentItem !== "object") {
        continue;
      }

      const hasOutputTextType = contentItem.type === "output_text";
      const textValue = contentItem.text;

      if (typeof textValue === "string" && (hasOutputTextType || textValue.length > 0)) {
        chunks.push(textValue);
        continue;
      }

      if (textValue && typeof textValue === "object" && "value" in textValue) {
        const value = (textValue as { value?: unknown }).value;
        if (typeof value === "string" && (hasOutputTextType || value.length > 0)) {
          chunks.push(value);
        }
      }
    }
  }

  return chunks.join("").trim();
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

function looksLikeOneSentence(value: string): boolean {
  const s = normalizeWhitespace(value);
  if (!s || s.length < 10) return false;
  if (s.includes(";")) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  return true;
}

function validateAndDeduplicate(raw: unknown): NounItem[] {
  if (!Array.isArray(raw)) {
    throw new Error("Model output must be a JSON array.");
  }

  if (raw.length > MAX_ITEMS) {
    throw new Error(`Array length is ${raw.length}. Maximum allowed is ${MAX_ITEMS}.`);
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

    if (!lemmaRaw) {
      throw new Error(`Item at index ${index} has missing or empty lemma.`);
    }
    if (posRaw !== "noun") {
      throw new Error(`Item "${lemmaRaw}" has invalid pos "${String(posRaw)}". Expected "noun".`);
    }
    if (countWords(lemmaRaw) > 3) {
      throw new Error(`Item "${lemmaRaw}" exceeds 3 words in lemma.`);
    }
    if (hasPunctuation(lemmaRaw)) {
      throw new Error(`Item "${lemmaRaw}" contains punctuation in lemma.`);
    }
    if (!translationRaw) {
      throw new Error(`Item "${lemmaRaw}" has missing or empty translation_pl.`);
    }
    if (countWords(translationRaw) > 3) {
      throw new Error(`Item "${lemmaRaw}" has translation_pl longer than 3 words.`);
    }
    if (hasPunctuation(translationRaw)) {
      throw new Error(`Item "${lemmaRaw}" contains punctuation in translation_pl.`);
    }
    if (!definitionRaw) {
      throw new Error(`Item "${lemmaRaw}" has missing or empty definition_en.`);
    }
    if (!looksLikeOneSentence(definitionRaw)) {
      throw new Error(`Item "${lemmaRaw}" has invalid definition_en (must be 1 simple sentence, no semicolons).`);
    }
    if (!exampleRaw) {
      throw new Error(`Item "${lemmaRaw}" has missing or empty example_en.`);
    }
    if (!looksLikeOneSentence(exampleRaw)) {
      throw new Error(`Item "${lemmaRaw}" has invalid example_en (must be 1 natural sentence, no semicolons).`);
    }
    if (typeof levelRaw !== "string" || !ALLOWED_LEVELS.has(levelRaw as Level)) {
      throw new Error(`Item "${lemmaRaw}" has invalid level "${String(levelRaw)}".`);
    }

    const normalizedKey = lemmaRaw.toLowerCase();
    if (!unique.has(normalizedKey)) {
      unique.set(normalizedKey, {
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

async function saveOutput(payload: GeneratedOutput): Promise<string> {
  const targetDir = path.join(process.cwd(), "content", "generated");
  await mkdir(targetDir, { recursive: true });

  const date = todayIsoDate();
  const fileName = `${date}_${fileSafeSlug(payload.meta.category)}_${fileSafeSlug(payload.meta.subcategory)}_${payload.meta.mode}.json`;
  const filePath = path.join(targetDir, fileName);

  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filePath;
}

async function main(): Promise<void> {
  const { category, subcategory, mode } = getCliArgs();
  const prompt = buildPrompt(category, subcategory, mode);
  const rawText = await callOpenAI(prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("Invalid JSON returned by model.");
    console.error(rawText.slice(0, 500));
    process.exit(1);
  }

  const items = validateAndDeduplicate(parsed);
  const generatedAt = new Date().toISOString();

  const output: GeneratedOutput = {
    meta: {
      category,
      subcategory,
      mode,
      pos: "noun",
      model: "gpt-4.1",
      generatedAt,
    },
    items,
  };

  const outputPath = await saveOutput(output);
  console.log(`Generated ${items.length} nouns -> ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to generate nouns: ${message}`);
  process.exit(1);
});
