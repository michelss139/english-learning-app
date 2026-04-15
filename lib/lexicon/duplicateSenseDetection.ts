import type { SupabaseClient } from "@supabase/supabase-js";

/** PostgREST often types nested FK rows as T | T[] — normalize with pickSense(). */
type LexiconSenseEmbed = {
  id: string;
  entry_id: string;
  definition_en: string | null;
  lexicon_entries: { lemma: string } | { lemma: string }[] | null;
};

type TranslationJoinRow = {
  translation_pl: string | null;
  sense_id: string;
  lexicon_senses: LexiconSenseEmbed | LexiconSenseEmbed[] | null;
};

export type DuplicateSenseGroup = {
  entry_id: string;
  lemma: string;
  translation_pl: string;
  senses: { sense_id: string; definition_en: string }[];
  likely_duplicate: boolean;
  /** Set when includeReason is true (e.g. CLI script). */
  reason?: string;
};

const MIN_SUBSTRING_LEN = 8;
const LEVENSHTEIN_RATIO_LIKELY = 0.88;

function pickSense(embed: LexiconSenseEmbed | LexiconSenseEmbed[] | null | undefined): LexiconSenseEmbed | null {
  if (embed == null) return null;
  return Array.isArray(embed) ? embed[0] ?? null : embed;
}

function normTranslation(s: string | null): string | null {
  if (s == null) return null;
  const t = s.trim().toLowerCase();
  return t.length ? t : null;
}

function normDefinition(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function stringSimilarityRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

function pairLikelyDuplicate(d1: string, d2: string): { hit: boolean; note: string } {
  const a = normDefinition(d1);
  const b = normDefinition(d2);
  if (!a && !b) return { hit: true, note: "both definitions empty" };
  if (!a || !b) return { hit: false, note: "one definition empty" };
  if (a === b) return { hit: true, note: "definitions equal (normalized)" };

  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (short.length >= MIN_SUBSTRING_LEN && long.includes(short)) {
    return { hit: true, note: "one definition contains the other" };
  }

  const ratio = stringSimilarityRatio(a, b);
  if (ratio >= LEVENSHTEIN_RATIO_LIKELY) {
    return { hit: true, note: `levenshtein-like ratio ${ratio.toFixed(3)}` };
  }

  return { hit: false, note: `ratio ${ratio.toFixed(3)}` };
}

function groupLikelyDuplicate(definitions: string[]): { likely: boolean; reason: string } {
  const notes: string[] = [];
  for (let i = 0; i < definitions.length; i++) {
    for (let j = i + 1; j < definitions.length; j++) {
      const { hit, note } = pairLikelyDuplicate(definitions[i] ?? "", definitions[j] ?? "");
      if (hit) {
        notes.push(`pair ${i + 1}–${j + 1}: ${note}`);
      }
    }
  }
  if (!notes.length) return { likely: false, reason: "no similar pairs" };
  return { likely: true, reason: notes.join("; ") };
}

function entryLemma(embed: LexiconSenseEmbed): string {
  if (!embed.lexicon_entries) return "";
  const e = embed.lexicon_entries;
  return Array.isArray(e) ? (e[0]?.lemma ?? "") : e.lemma ?? "";
}

async function loadAllTranslationRows(supabase: SupabaseClient): Promise<TranslationJoinRow[]> {
  const page = 1000;
  const all: TranslationJoinRow[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from("lexicon_translations")
      .select(
        `
        translation_pl,
        sense_id,
        lexicon_senses!inner (
          id,
          entry_id,
          definition_en,
          lexicon_entries ( lemma )
        )
      `,
      )
      .range(from, from + page - 1);
    if (error) throw new Error(`lexicon_translations: ${error.message}`);
    const batch = (data ?? []) as TranslationJoinRow[];
    all.push(...batch);
    if (batch.length < page) break;
  }
  return all;
}

function groupKey(entryId: string, normTrans: string): string {
  return `${entryId}\t${normTrans}`;
}

type Acc = {
  entry_id: string;
  lemma: string;
  normTrans: string;
  displayTrans: string;
  senses: Map<string, string>;
};

/**
 * Same entry + same normalized PL translation, ≥2 senses — possible duplicates.
 * Sorted by lemma (pl), then normalized translation.
 */
export async function findDuplicateSenseGroups(
  supabase: SupabaseClient,
  options?: { maxGroups?: number; includeReason?: boolean },
): Promise<DuplicateSenseGroup[]> {
  const maxGroups = options?.maxGroups ?? 50;
  const includeReason = options?.includeReason ?? false;

  const rows = await loadAllTranslationRows(supabase);
  const buckets = new Map<string, Acc>();

  for (const row of rows) {
    const nt = normTranslation(row.translation_pl);
    const sense = pickSense(row.lexicon_senses);
    if (!nt || !sense?.entry_id || !sense.id) continue;

    const key = groupKey(sense.entry_id, nt);
    let acc = buckets.get(key);
    if (!acc) {
      acc = {
        entry_id: sense.entry_id,
        lemma: entryLemma(sense) || "(unknown)",
        normTrans: nt,
        displayTrans: row.translation_pl?.trim() ?? nt,
        senses: new Map(),
      };
      buckets.set(key, acc);
    }
    acc.senses.set(sense.id, sense.definition_en ?? "");
  }

  const multi = [...buckets.values()].filter((b) => b.senses.size >= 2);
  multi.sort((a, b) => {
    const la = a.lemma.localeCompare(b.lemma, "pl");
    if (la !== 0) return la;
    return a.normTrans.localeCompare(b.normTrans, "pl");
  });

  const limited = multi.slice(0, maxGroups);
  const out: DuplicateSenseGroup[] = [];

  for (const b of limited) {
    const senses = [...b.senses.entries()].map(([sense_id, definition_en]) => ({
      sense_id,
      definition_en,
    }));
    senses.sort((x, y) => x.sense_id.localeCompare(y.sense_id));

    const defs = senses.map((s) => s.definition_en);
    const { likely, reason } = groupLikelyDuplicate(defs);

    const item: DuplicateSenseGroup = {
      entry_id: b.entry_id,
      lemma: b.lemma,
      translation_pl: b.displayTrans,
      senses,
      likely_duplicate: likely,
    };
    if (includeReason && likely) {
      item.reason = reason;
    }
    out.push(item);
  }

  return out;
}
