/**
 * Downloads the Oxford 3000 wordlist from a public GitHub dataset and saves it
 * to scripts/data/oxford3000.json in our canonical format.
 *
 * Source: winterdl/oxford-5000-vocabulary-audio-definition (GitHub)
 * Each entry: lemma, pos (normalised to our schema), cefr_level
 *
 * Usage:
 *   npx tsx scripts/fetch-oxford3000.ts
 */

import fs from "node:fs";
import path from "node:path";

const SOURCE_URL =
  "https://raw.githubusercontent.com/winterdl/oxford-5000-vocabulary-audio-definition/master/data/oxford_3000.json";

const OUTPUT_PATH = path.resolve(process.cwd(), "scripts/data/oxford3000.json");

export type OxfordEntry = {
  lemma: string;
  pos: string;
  cefr_level: "A1" | "A2" | "B1" | "B2";
};

// Map the dataset's "type" field to the pos values we use in lexicon_entries
const POS_MAP: Record<string, string> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  pronoun: "pronoun",
  preposition: "preposition",
  conjunction: "conjunction",
  determiner: "determiner",
  number: "numeral",
  "ordinal number": "numeral",
  "modal verb": "modal",
  "auxiliary verb": "verb",
  "linking verb": "verb",
  exclamation: "exclamation",
  "indefinite article": "article",
  "definite article": "article",
  "infinitive marker": "particle",
};

function normalizePos(raw: string): string {
  return POS_MAP[raw.toLowerCase().trim()] ?? raw.toLowerCase().trim();
}

function normalizeCefr(raw: string): "A1" | "A2" | "B1" | "B2" | null {
  const upper = raw.toUpperCase().trim();
  if (["A1", "A2", "B1", "B2"].includes(upper)) return upper as "A1" | "A2" | "B1" | "B2";
  return null;
}

async function main() {
  console.log("Downloading Oxford 3000 wordlist…");
  console.log(`Source: ${SOURCE_URL}\n`);

  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

  const raw: Record<string, { word: string; type: string; cefr: string }> =
    await res.json();

  const entries: OxfordEntry[] = [];
  let skipped = 0;

  for (const item of Object.values(raw)) {
    const cefr_level = normalizeCefr(item.cefr);
    if (!cefr_level) { skipped++; continue; }

    entries.push({
      lemma: item.word.toLowerCase().trim(),
      pos: normalizePos(item.type),
      cefr_level,
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2), "utf8");

  const byLevel = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.cefr_level] = (acc[e.cefr_level] ?? 0) + 1;
    return acc;
  }, {});

  const byPos = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.pos] = (acc[e.pos] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Saved ${entries.length} entries (${skipped} skipped) → ${OUTPUT_PATH}`);
  console.log("\nBy CEFR level:", byLevel);
  console.log("\nBy POS (top 10):");
  Object.entries(byPos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([pos, count]) => console.log(`  ${String(count).padStart(4)}  ${pos}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
