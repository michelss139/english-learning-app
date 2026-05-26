/**
 * Compares the Oxford 3000 wordlist (scripts/data/oxford3000.json) against
 * the lexicon_entries in Supabase and produces a gap report.
 *
 * For each Oxford 3000 entry it categorises:
 *   MISSING       – lemma+pos not in our database at all
 *   NO_CEFR       – lemma+pos exists but sense has no cefr_level
 *   WRONG_CEFR    – lemma+pos exists with a different cefr_level
 *   OK            – already in the database with correct cefr_level
 *
 * Existing entries are NEVER modified. The report is the input you feed
 * to the next enrichment script that generates SQL migrations for missing words.
 *
 * Usage:
 *   npx tsx scripts/diff-oxford3000.ts
 *   npx tsx scripts/diff-oxford3000.ts --level A1        # filter by CEFR level
 *   npx tsx scripts/diff-oxford3000.ts --status MISSING  # filter by status
 *   npx tsx scripts/diff-oxford3000.ts --level A1 --status MISSING --json
 */

import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { OxfordEntry } from "./fetch-oxford3000";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const OXFORD_PATH = path.resolve(process.cwd(), "scripts/data/oxford3000.json");
const REPORT_PATH = path.resolve(process.cwd(), "scripts/data/oxford3000-diff-report.json");

type Status = "OK" | "MISSING" | "NO_CEFR" | "WRONG_CEFR";

type DiffRow = OxfordEntry & {
  status: Status;
  db_cefr?: string | null;        // what we currently have in DB (if any)
  db_entry_id?: string | null;    // existing lexicon_entries.id (if any)
  db_sense_id?: string | null;    // existing lexicon_senses.id (if any)
  has_translation: boolean;
  has_example: boolean;
  has_pattern: boolean;
};

type DbRow = {
  entry_id: string;
  sense_id: string;
  lemma_norm: string;
  pos: string;
  cefr_level: string | null;
  has_translation: boolean;
  has_example: boolean;
  has_pattern: boolean;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normalizeLemma(word: string): string {
  return word.toLowerCase().trim().replace(/\s+/g, " ");
}

// Oxford uses "modal" and "exclamation" — map to what we store
const POS_ALIASES: Record<string, string[]> = {
  verb: ["verb", "modal"],
  noun: ["noun"],
  adjective: ["adjective"],
  adverb: ["adverb"],
  preposition: ["preposition"],
  conjunction: ["conjunction"],
  pronoun: ["pronoun"],
  determiner: ["determiner"],
  numeral: ["numeral", "number"],
  exclamation: ["exclamation", "interjection"],
  particle: ["particle"],
};

function posMatches(oxfordPos: string, dbPos: string): boolean {
  const group = POS_ALIASES[oxfordPos] ?? [oxfordPos];
  return group.includes(dbPos);
}

async function loadDbLexicon(supabase: ReturnType<typeof createClient>): Promise<DbRow[]> {
  // Pull all entries + their primary sense data in one query
  const { data, error } = await supabase.rpc("get_lexicon_diff_data").select("*");
  if (!error && data) return data as DbRow[];

  // Fallback: manual join (slower but always works)
  console.log("  (RPC not available, using manual query — may take a moment…)");

  const PAGE = 1000;
  const rows: DbRow[] = [];
  let from = 0;

  while (true) {
    const { data: page, error: err } = await supabase
      .from("lexicon_entries")
      .select(
        `id, lemma_norm, pos,
         lexicon_senses(id, cefr_level,
           lexicon_translations(id),
           lexicon_examples(id),
           lexicon_patterns(id)
         )`
      )
      .range(from, from + PAGE - 1);

    if (err) throw new Error(`Supabase error: ${err.message}`);
    if (!page || page.length === 0) break;

    for (const entry of page as any[]) {
      const senses: any[] = entry.lexicon_senses ?? [];
      if (senses.length === 0) {
        rows.push({
          entry_id: entry.id,
          sense_id: "",
          lemma_norm: entry.lemma_norm,
          pos: entry.pos,
          cefr_level: null,
          has_translation: false,
          has_example: false,
          has_pattern: false,
        });
      }
      for (const sense of senses) {
        rows.push({
          entry_id: entry.id,
          sense_id: sense.id,
          lemma_norm: entry.lemma_norm,
          pos: entry.pos,
          cefr_level: sense.cefr_level ?? null,
          has_translation: (sense.lexicon_translations?.length ?? 0) > 0,
          has_example: (sense.lexicon_examples?.length ?? 0) > 0,
          has_pattern: (sense.lexicon_patterns?.length ?? 0) > 0,
        });
      }
    }

    from += PAGE;
    if (page.length < PAGE) break;
  }

  return rows;
}

async function main() {
  // ── CLI args ─────────────────────────────────────────────────────────────
  const args = process.argv.slice(2);
  const filterLevel = args.includes("--level")
    ? args[args.indexOf("--level") + 1]
    : null;
  const filterStatus = args.includes("--status")
    ? args[args.indexOf("--status") + 1]
    : null;
  const outputJson = args.includes("--json");

  // ── Load Oxford 3000 ─────────────────────────────────────────────────────
  if (!fs.existsSync(OXFORD_PATH)) {
    console.error(
      `Oxford 3000 data not found at ${OXFORD_PATH}\n` +
        "Run: npx tsx scripts/fetch-oxford3000.ts"
    );
    process.exit(1);
  }
  const oxford: OxfordEntry[] = JSON.parse(fs.readFileSync(OXFORD_PATH, "utf8"));
  console.log(`Oxford 3000: ${oxford.length} entries loaded`);

  // ── Connect to Supabase ──────────────────────────────────────────────────
  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  console.log("Loading lexicon from database…");
  const dbRows = await loadDbLexicon(supabase);
  console.log(`Database: ${dbRows.length} sense-rows loaded`);

  // ── Build lookup: lemma_norm+pos → best DbRow ────────────────────────────
  // "best" = has cefr_level set, then has most data
  const dbMap = new Map<string, DbRow>();

  for (const row of dbRows) {
    const key = `${row.lemma_norm}::${row.pos}`;
    const existing = dbMap.get(key);
    if (
      !existing ||
      (row.cefr_level && !existing.cefr_level) ||
      (row.has_translation && !existing.has_translation)
    ) {
      dbMap.set(key, row);
    }
  }

  // ── Also build a broader lookup ignoring pos (for fuzzy matching) ─────────
  const dbByLemma = new Map<string, DbRow[]>();
  for (const row of dbRows) {
    const existing = dbByLemma.get(row.lemma_norm) ?? [];
    existing.push(row);
    dbByLemma.set(row.lemma_norm, existing);
  }

  // ── Diff ─────────────────────────────────────────────────────────────────
  const report: DiffRow[] = [];

  for (const entry of oxford) {
    const lemma_norm = normalizeLemma(entry.lemma);

    // 1. Exact match: lemma_norm + pos
    let dbRow = dbMap.get(`${lemma_norm}::${entry.pos}`);

    // 2. Fuzzy match: same lemma, compatible pos (handles modal→verb, etc.)
    if (!dbRow) {
      const candidates = dbByLemma.get(lemma_norm) ?? [];
      dbRow = candidates.find((r) => posMatches(entry.pos, r.pos));
    }

    let status: Status;

    if (!dbRow) {
      status = "MISSING";
    } else if (!dbRow.cefr_level) {
      status = "NO_CEFR";
    } else if (dbRow.cefr_level !== entry.cefr_level) {
      status = "WRONG_CEFR";
    } else {
      status = "OK";
    }

    report.push({
      ...entry,
      status,
      db_cefr: dbRow?.cefr_level ?? null,
      db_entry_id: dbRow?.entry_id ?? null,
      db_sense_id: dbRow?.sense_id ?? null,
      has_translation: dbRow?.has_translation ?? false,
      has_example: dbRow?.has_example ?? false,
      has_pattern: dbRow?.has_pattern ?? false,
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const byStatus = report.reduce<Record<Status, number>>(
    (acc, r) => { acc[r.status]++; return acc; },
    { OK: 0, MISSING: 0, NO_CEFR: 0, WRONG_CEFR: 0 }
  );

  const byLevelAndStatus: Record<string, Record<Status, number>> = {};
  for (const r of report) {
    const lvl = r.cefr_level;
    byLevelAndStatus[lvl] ??= { OK: 0, MISSING: 0, NO_CEFR: 0, WRONG_CEFR: 0 };
    byLevelAndStatus[lvl][r.status]++;
  }

  console.log("\n══════════════════════════════════════");
  console.log("  Oxford 3000 vs Database — Gap Report");
  console.log("══════════════════════════════════════\n");

  console.log("Overall:");
  for (const [status, count] of Object.entries(byStatus)) {
    const pct = ((count / oxford.length) * 100).toFixed(1);
    console.log(`  ${status.padEnd(12)} ${String(count).padStart(4)}  (${pct}%)`);
  }

  console.log("\nBy CEFR level:");
  for (const level of ["A1", "A2", "B1", "B2"]) {
    const lvl = byLevelAndStatus[level] ?? { OK: 0, MISSING: 0, NO_CEFR: 0, WRONG_CEFR: 0 };
    console.log(
      `  ${level}  OK:${lvl.OK}  MISSING:${lvl.MISSING}  NO_CEFR:${lvl.NO_CEFR}  WRONG_CEFR:${lvl.WRONG_CEFR}`
    );
  }

  // ── Missing verbs/adverbs/prepositions at A1/A2 (most critical) ──────────
  const criticalMissing = report.filter(
    (r) =>
      r.status === "MISSING" &&
      ["A1", "A2"].includes(r.cefr_level) &&
      ["verb", "adverb", "preposition", "conjunction", "pronoun", "determiner"].includes(r.pos)
  );

  if (criticalMissing.length > 0) {
    console.log(`\n⚠  Critical missing (A1/A2 functional words): ${criticalMissing.length}`);
    for (const r of criticalMissing.slice(0, 30)) {
      console.log(`   ${r.cefr_level}  ${r.pos.padEnd(14)} ${r.lemma}`);
    }
    if (criticalMissing.length > 30) {
      console.log(`   … and ${criticalMissing.length - 30} more`);
    }
  }

  // ── Apply CLI filters for display ────────────────────────────────────────
  let filtered = report;
  if (filterLevel) filtered = filtered.filter((r) => r.cefr_level === filterLevel.toUpperCase());
  if (filterStatus) filtered = filtered.filter((r) => r.status === filterStatus.toUpperCase());

  if (outputJson && filtered.length > 0) {
    console.log("\nFiltered entries (JSON):");
    console.log(JSON.stringify(filtered, null, 2));
  } else if (filtered.length > 0 && filtered.length !== report.length) {
    console.log(`\nFiltered (${filterLevel ?? "all"} / ${filterStatus ?? "all"}): ${filtered.length} entries`);
    for (const r of filtered.slice(0, 50)) {
      const dbInfo = r.db_cefr ? ` [DB: ${r.db_cefr}]` : "";
      const enrichment = [
        r.has_translation ? "T" : "-",
        r.has_example ? "E" : "-",
        r.has_pattern ? "P" : "-",
      ].join("");
      console.log(
        `  ${r.cefr_level}  ${r.status.padEnd(12)} ${r.pos.padEnd(14)} ${r.lemma}${dbInfo}  [${enrichment}]`
      );
    }
    if (filtered.length > 50) console.log(`  … and ${filtered.length - 50} more`);
  }

  // ── Save full report ─────────────────────────────────────────────────────
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nFull report saved → ${REPORT_PATH}`);
  console.log(
    "Next step: feed MISSING entries into an enrichment script to generate SQL migrations."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
