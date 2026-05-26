/**
 * Builds lexicon_verb_forms for all verbs that don't have them yet.
 *
 * Three-tier strategy (cheapest first):
 *
 *  1. IRREGULAR  — looks up past_simple + past_participle from irregular_verbs table.
 *                  Computes present forms algorithmically. Zero API calls.
 *
 *  2. MODAL      — hardcoded table (can/could, will/would, …). Zero API calls.
 *
 *  3. REGULAR    — algorithmically derives all five forms. Zero API calls.
 *                  Verbs where the doubling rule is ambiguous (2-syllable CVC ending)
 *                  are batched into one small OpenAI call per 20 verbs.
 *
 * Usage:
 *   npx tsx scripts/build-verb-forms.ts
 *   npx tsx scripts/build-verb-forms.ts --dry-run
 *   npx tsx scripts/build-verb-forms.ts --limit=50
 *   npx tsx scripts/build-verb-forms.ts --cefr A1,A2   # prioritise by CEFR
 */

import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  callOpenAIWithRetry,
  stripJsonFence,
  sleep,
  requiredEnv,
} from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const DELAY_MS = 200;
const OPENAI_BATCH = 20; // verbs per OpenAI call for edge-case doubling

// ─── Types ────────────────────────────────────────────────────────────────────

type VerbForms = {
  present_simple_i: string;
  present_simple_you: string;
  present_simple_he_she_it: string;
  past_simple: string;
  past_participle: string;
};

type VerbEntry = {
  entry_id: string;
  lemma: string;
  lemma_norm: string;
  cefr_level: string | null;
};

// ─── Modal hardcodes ──────────────────────────────────────────────────────────

const MODALS: Record<string, VerbForms> = {
  can:    { present_simple_i: "can",    present_simple_you: "can",    present_simple_he_she_it: "can",    past_simple: "could",      past_participle: "—"       },
  could:  { present_simple_i: "could",  present_simple_you: "could",  present_simple_he_she_it: "could",  past_simple: "could",      past_participle: "—"       },
  will:   { present_simple_i: "will",   present_simple_you: "will",   present_simple_he_she_it: "will",   past_simple: "would",      past_participle: "—"       },
  would:  { present_simple_i: "would",  present_simple_you: "would",  present_simple_he_she_it: "would",  past_simple: "would",      past_participle: "—"       },
  shall:  { present_simple_i: "shall",  present_simple_you: "shall",  present_simple_he_she_it: "shall",  past_simple: "should",     past_participle: "—"       },
  should: { present_simple_i: "should", present_simple_you: "should", present_simple_he_she_it: "should", past_simple: "should",     past_participle: "—"       },
  may:    { present_simple_i: "may",    present_simple_you: "may",    present_simple_he_she_it: "may",    past_simple: "might",      past_participle: "—"       },
  might:  { present_simple_i: "might",  present_simple_you: "might",  present_simple_he_she_it: "might",  past_simple: "might",      past_participle: "—"       },
  must:   { present_simple_i: "must",   present_simple_you: "must",   present_simple_he_she_it: "must",   past_simple: "had to",     past_participle: "—"       },
  ought:  { present_simple_i: "ought",  present_simple_you: "ought",  present_simple_he_she_it: "ought",  past_simple: "ought",      past_participle: "—"       },
  dare:   { present_simple_i: "dare",   present_simple_you: "dare",   present_simple_he_she_it: "dares",  past_simple: "dared",      past_participle: "dared"   },
  need:   { present_simple_i: "need",   present_simple_you: "need",   present_simple_he_she_it: "needs",  past_simple: "needed",     past_participle: "needed"  },
  "used to": { present_simple_i: "used to",  present_simple_you: "used to",  present_simple_he_she_it: "used to",  past_simple: "used to",   past_participle: "—"      },
  "cannot":  { present_simple_i: "cannot",   present_simple_you: "cannot",   present_simple_he_she_it: "cannot",   past_simple: "could not", past_participle: "—"      },
  "have to": { present_simple_i: "have to",  present_simple_you: "have to",  present_simple_he_she_it: "has to",   past_simple: "had to",    past_participle: "had to" },
  "ought to":{ present_simple_i: "ought to", present_simple_you: "ought to", present_simple_he_she_it: "ought to", past_simple: "ought to",  past_participle: "—"      },
};

// Special-case present forms (irregular verbs where he/she/it is non-standard)
const SPECIAL_PRESENT: Record<string, { i: string; you: string; he: string }> = {
  be:   { i: "am",  you: "are", he: "is"  },
  have: { i: "have", you: "have", he: "has" },
  do:   { i: "do",  you: "do",  he: "does" },
  go:   { i: "go",  you: "go",  he: "goes" },
};

// ─── Algorithm: 3rd person singular ──────────────────────────────────────────

function thirdPerson(verb: string): string {
  if (SPECIAL_PRESENT[verb]) return SPECIAL_PRESENT[verb].he;
  // -s/-sh/-ch/-tch/-x/-z/-o → -es
  if (/(?:s|sh|ch|tch|x|z|o)$/.test(verb)) return verb + "es";
  // consonant + y → -ies
  if (/[bcdfghjklmnpqrstvwxyz]y$/.test(verb)) return verb.slice(0, -1) + "ies";
  return verb + "s";
}

// ─── Algorithm: past simple / past participle (regular) ──────────────────────

/** Rough syllable count — good enough for doubling heuristic. */
function syllableCount(word: string): number {
  const matches = word.toLowerCase().match(/[aeiouy]+/g);
  return matches ? matches.length : 1;
}

/**
 * Returns past form for a regular verb.
 * Returns null when doubling is ambiguous (2-syllable CVC ending) → caller should use OpenAI.
 */
function regularPast(verb: string): string | null {
  // ends in -e (but not -ee) → add -d
  if (/[^e]e$/.test(verb)) return verb + "d";
  if (/ee$/.test(verb)) return verb + "d"; // agree→agreed

  // ends in consonant + y → -ied
  if (/[bcdfghjklmnpqrstvwxyz]y$/.test(verb)) return verb.slice(0, -1) + "ied";

  // CVC pattern: single consonant + SINGLE vowel + single consonant (not w/x/y)
  // Must NOT have a vowel before the vowel (e.g. "look", "rain", "wait" should NOT double)
  const cvcMatch = verb.match(/[^aeiou]([aeiou])([bcdfghjklmnprstvz])$/);
  if (cvcMatch) {
    const syllables = syllableCount(verb);
    if (syllables === 1) {
      // Definitely double: stop→stopped, plan→planned, beg→begged, run→ran (irreg anyway)
      return verb + cvcMatch[2] + "ed";
    }
    // 2+ syllables: stress-dependent — ambiguous, let OpenAI decide
    return null;
  }

  return verb + "ed";
}

/** Build full forms for a regular verb (returns null forms array if ambiguous). */
function buildRegularForms(lemma: string): VerbForms | null {
  // Multi-word or compound verbs (e.g. "have to", "go on") — send to OpenAI
  if (lemma.includes(" ")) return null;

  const past = regularPast(lemma);
  if (past === null) return null; // ambiguous → OpenAI

  return {
    present_simple_i: lemma,
    present_simple_you: lemma,
    present_simple_he_she_it: thirdPerson(lemma),
    past_simple: past,
    past_participle: past,
  };
}

/** Build present forms for irregular verb (past comes from DB). */
function buildIrregularForms(lemma: string, past_simple: string, past_participle: string): VerbForms {
  const special = SPECIAL_PRESENT[lemma];
  return {
    present_simple_i: special?.i ?? lemma,
    present_simple_you: special?.you ?? lemma,
    present_simple_he_she_it: special?.he ?? thirdPerson(lemma),
    past_simple,
    past_participle,
  };
}

// ─── OpenAI: batch resolve ambiguous regular verbs ───────────────────────────

async function resolveAmbiguousBatch(verbs: string[]): Promise<Map<string, VerbForms>> {
  const prompt = `For each English verb below, provide the correct past simple and past participle forms.
These are regular verbs — the question is whether the final consonant doubles before -ed.

Verbs: ${verbs.join(", ")}

Return ONLY a JSON object (no markdown) where keys are the base verb forms:
{
  "prefer": { "past_simple": "preferred", "past_participle": "preferred" },
  "visit":  { "past_simple": "visited",   "past_participle": "visited" }
}`;

  const raw = await callOpenAIWithRetry(prompt);
  const parsed = JSON.parse(stripJsonFence(raw)) as Record<
    string,
    { past_simple: string; past_participle: string }
  >;

  const result = new Map<string, VerbForms>();
  for (const [lemma, forms] of Object.entries(parsed)) {
    result.set(lemma.toLowerCase().trim(), {
      present_simple_i: lemma,
      present_simple_you: lemma,
      present_simple_he_she_it: thirdPerson(lemma),
      past_simple: forms.past_simple,
      past_participle: forms.past_participle,
    });
  }
  return result;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function loadIrregularMap(
  supabase: SupabaseClient
): Promise<Map<string, { past_simple: string; past_participle: string }>> {
  const { data, error } = await supabase
    .from("irregular_verbs")
    .select("base_norm, past_simple, past_participle");
  if (error) throw new Error(`irregular_verbs: ${error.message}`);

  const map = new Map<string, { past_simple: string; past_participle: string }>();
  for (const row of data ?? []) {
    const r = row as { base_norm: string; past_simple: string; past_participle: string };
    if (r.base_norm && r.past_simple && r.past_participle) {
      map.set(r.base_norm, {
        past_simple: r.past_simple,
        past_participle: r.past_participle,
      });
    }
  }
  return map;
}

async function loadVerbsWithoutForms(supabase: SupabaseClient): Promise<VerbEntry[]> {
  // Load entry_ids that already have forms
  const { data: existingForms, error: efErr } = await supabase
    .from("lexicon_verb_forms")
    .select("entry_id");
  if (efErr) throw new Error(`lexicon_verb_forms: ${efErr.message}`);
  const alreadyDone = new Set((existingForms ?? []).map((r: any) => r.entry_id as string));

  // Pull all verb entries
  const PAGE = 1000;
  const out: VerbEntry[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("lexicon_entries")
      .select(`id, lemma, lemma_norm, lexicon_senses(cefr_level)`)
      .in("pos", ["verb", "modal"])
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`lexicon_entries: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data as any[]) {
      if (alreadyDone.has(row.id)) continue;
      const senses: any[] = row.lexicon_senses ?? [];
      const cefr_level = senses.find((s: any) => s.cefr_level)?.cefr_level ?? null;
      out.push({
        entry_id: row.id,
        lemma: row.lemma,
        lemma_norm: row.lemma_norm,
        cefr_level,
      });
    }

    from += PAGE;
    if (data.length < PAGE) break;
  }

  return out;
}

async function insertVerbForms(
  supabase: SupabaseClient,
  entry_id: string,
  forms: VerbForms,
  dryRun: boolean
): Promise<void> {
  if (dryRun) return;

  const { error } = await supabase.from("lexicon_verb_forms").insert({
    entry_id,
    ...forms,
  });

  // Ignore duplicate key (might already exist if script was re-run)
  if (error && error.code !== "23505") {
    throw new Error(`lexicon_verb_forms insert: ${error.message}`);
  }
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

type Args = {
  limit: number | null;
  dryRun: boolean;
  cefrFilter: Set<string> | null;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  const cefrArg = argv.find((a) => a.startsWith("--cefr=")) ??
    (argv.includes("--cefr") ? `--cefr=${argv[argv.indexOf("--cefr") + 1]}` : undefined);

  return {
    limit: limitArg
      ? (() => { const n = Number(limitArg.split("=")[1]); return Number.isFinite(n) && n > 0 ? Math.floor(n) : null; })()
      : null,
    dryRun: argv.includes("--dry-run"),
    cefrFilter: cefrArg
      ? new Set(cefrArg.replace("--cefr=", "").toUpperCase().split(",").map((s) => s.trim()))
      : null,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  console.log("Loading irregular verbs from DB…");
  const irregularMap = await loadIrregularMap(supabase);
  console.log(`  ${irregularMap.size} irregular verbs loaded`);

  console.log("Loading verbs without forms…");
  let verbs = await loadVerbsWithoutForms(supabase);

  // CEFR filter
  if (args.cefrFilter) {
    verbs = verbs.filter((v) => v.cefr_level && args.cefrFilter!.has(v.cefr_level));
  }

  // Sort: CEFR A1 → A2 → B1 → B2 → rest
  const cefrOrder: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3 };
  verbs.sort((a, b) => {
    const oa = cefrOrder[a.cefr_level ?? ""] ?? 9;
    const ob = cefrOrder[b.cefr_level ?? ""] ?? 9;
    return oa !== ob ? oa - ob : a.lemma_norm.localeCompare(b.lemma_norm);
  });

  if (args.limit) verbs = verbs.slice(0, args.limit);

  console.log(`\nBuild verb forms`);
  console.log(`  verbs to process: ${verbs.length}`);
  if (args.dryRun) console.log(`  DRY RUN — no writes`);
  console.log();

  // ── First pass: categorise each verb ────────────────────────────────────
  type Pending = { verb: VerbEntry; forms: VerbForms | null; tier: string };
  const ready: Pending[] = [];
  const ambiguous: VerbEntry[] = []; // need OpenAI

  for (const verb of verbs) {
    const norm = verb.lemma_norm;

    // Modal?
    const modalForms = MODALS[norm];
    if (modalForms) {
      ready.push({ verb, forms: modalForms, tier: "modal" });
      continue;
    }

    // Irregular?
    const irregular = irregularMap.get(norm);
    if (irregular) {
      ready.push({
        verb,
        forms: buildIrregularForms(verb.lemma, irregular.past_simple, irregular.past_participle),
        tier: "irregular",
      });
      continue;
    }

    // Regular — try algorithm
    const regularForms = buildRegularForms(norm);
    if (regularForms) {
      ready.push({ verb, forms: regularForms, tier: "regular" });
    } else {
      ambiguous.push(verb);
    }
  }

  // ── Resolve ambiguous via OpenAI (batched) ───────────────────────────────
  const resolvedMap = new Map<string, VerbForms>();

  if (ambiguous.length > 0) {
    console.log(`Resolving ${ambiguous.length} ambiguous verbs via OpenAI (${Math.ceil(ambiguous.length / OPENAI_BATCH)} call(s))…\n`);

    for (let i = 0; i < ambiguous.length; i += OPENAI_BATCH) {
      const batch = ambiguous.slice(i, i + OPENAI_BATCH);
      const lemmas = batch.map((v) => v.lemma_norm);
      process.stdout.write(`  batch ${Math.floor(i / OPENAI_BATCH) + 1}: [${lemmas.join(", ")}] … `);
      try {
        const batchResult = await resolveAmbiguousBatch(lemmas);
        for (const [norm, forms] of batchResult) {
          resolvedMap.set(norm, forms);
        }
        console.log("ok");
      } catch (e) {
        console.log(`ERROR: ${(e as Error).message}`);
        // Fallback: use simple -ed (wrong for some, but better than nothing)
        for (const verb of batch) {
          resolvedMap.set(verb.lemma_norm, {
            present_simple_i: verb.lemma_norm,
            present_simple_you: verb.lemma_norm,
            present_simple_he_she_it: thirdPerson(verb.lemma_norm),
            past_simple: verb.lemma_norm + "ed",
            past_participle: verb.lemma_norm + "ed",
          });
        }
      }
      if (i + OPENAI_BATCH < ambiguous.length) await sleep(DELAY_MS);
    }

    // Add resolved to ready list
    for (const verb of ambiguous) {
      const forms = resolvedMap.get(verb.lemma_norm) ?? null;
      ready.push({ verb, forms, tier: "openai" });
    }
  }

  // ── Insert all ───────────────────────────────────────────────────────────
  console.log(`\nInserting ${ready.length} verb forms…\n`);

  const stats = { modal: 0, irregular: 0, regular: 0, openai: 0, skipped: 0, errors: 0 };

  for (const { verb, forms, tier } of ready) {
    const label = `${(verb.cefr_level ?? "??").padEnd(2)}  ${verb.lemma_norm}`;

    if (!forms) {
      console.log(`  [skip] ${label} — no forms resolved`);
      stats.skipped++;
      continue;
    }

    if (args.dryRun) {
      console.log(
        `  [${tier.padEnd(9)}] ${label}` +
        `  I:${forms.present_simple_i}  he:${forms.present_simple_he_she_it}` +
        `  past:${forms.past_simple}  pp:${forms.past_participle}`
      );
      stats[tier as keyof typeof stats] = (stats[tier as keyof typeof stats] as number) + 1;
      continue;
    }

    try {
      await insertVerbForms(supabase, verb.entry_id, forms, args.dryRun);
      console.log(
        `  [${tier.padEnd(9)}] ${label}` +
        `  → ${forms.present_simple_i} / ${forms.present_simple_he_she_it} / ${forms.past_simple} / ${forms.past_participle}`
      );
      stats[tier as keyof typeof stats] = (stats[tier as keyof typeof stats] as number) + 1;
    } catch (e) {
      console.error(`  [error]     ${label} — ${(e as Error).message}`);
      stats.errors++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════");
  console.log("  Summary");
  console.log("══════════════════════════");
  console.log(`  total processed: ${ready.length + stats.skipped}`);
  console.log(`  modal:           ${stats.modal}`);
  console.log(`  irregular:       ${stats.irregular}`);
  console.log(`  regular:         ${stats.regular}`);
  console.log(`  openai resolved: ${stats.openai}`);
  console.log(`  skipped:         ${stats.skipped}`);
  console.log(`  errors:          ${stats.errors}`);
  if (args.dryRun) console.log("\n  (dry run — no changes written)");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
