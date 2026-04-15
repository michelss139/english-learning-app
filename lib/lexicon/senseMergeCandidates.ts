import type { SupabaseClient } from "@supabase/supabase-js";

/** Max groups (entry + same PL) returned in one response. */
export const SENSE_MERGE_MAX_GROUPS = 50;

const LEVENSHTEIN_SIMILARITY_MIN = 0.8;

export type HighConfidenceDuplicateGroup = {
  entry_id: string;
  lemma: string;
  /** Representative PL (trimmed) for this duplicate bucket. */
  translation_pl: string;
  senses: { sense_id: string; definition_en: string }[];
};

export function normalizeText(s: string | null | undefined): string {
  if (s == null) return "";
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** trim + lower; empty → null (skip grouping on missing PL). */
export function normalizedTranslationPl(s: string | null | undefined): string | null {
  const t = s?.trim().toLowerCase() ?? "";
  return t.length > 0 ? t : null;
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

/** 1 − distance / max(len); identical empty strings → 1. */
export function levenshteinSimilarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

/**
 * Obvious duplicate definitions: substring (after normalize) or strong string similarity.
 */
export function definitionsMatchHighConfidence(def1: string, def2: string): boolean {
  const a = normalizeText(def1);
  const b = normalizeText(def2);
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return levenshteinSimilarity(a, b) >= LEVENSHTEIN_SIMILARITY_MIN;
}

function allPairsDefinitionsMatch(senses: { definition_en: string }[]): boolean {
  const n = senses.length;
  if (n < 2) return false;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!definitionsMatchHighConfidence(senses[i].definition_en, senses[j].definition_en)) {
        return false;
      }
    }
  }
  return true;
}

function pickTranslationPl(embed: unknown): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return embed[0]?.translation_pl ?? null;
  }
  if (typeof embed === "object" && embed !== null && "translation_pl" in embed) {
    const v = (embed as { translation_pl?: string }).translation_pl;
    return typeof v === "string" ? v : null;
  }
  return null;
}

function entryLemma(embed: unknown): string {
  if (!embed) return "";
  const e = embed as { lemma?: string } | { lemma?: string }[];
  if (Array.isArray(e)) return e[0]?.lemma ?? "";
  return e.lemma ?? "";
}

type RawSenseRow = {
  id: string;
  entry_id: string;
  definition_en: string | null;
  lexicon_entries: { lemma: string } | { lemma: string }[] | null;
  lexicon_translations: unknown;
};

type SenseLite = {
  sense_id: string;
  translation_pl: string | null;
  definition_en: string;
};

async function loadAllSenseRows(supabase: SupabaseClient): Promise<RawSenseRow[]> {
  const page = 1000;
  const all: RawSenseRow[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from("lexicon_senses")
      .select(
        `
        id,
        entry_id,
        definition_en,
        sense_order,
        lexicon_entries ( lemma ),
        lexicon_translations ( translation_pl )
      `,
      )
      .order("entry_id", { ascending: true })
      .order("sense_order", { ascending: true })
      .range(from, from + page - 1);

    if (error) throw new Error(`lexicon_senses: ${error.message}`);
    const batch = (data ?? []) as RawSenseRow[];
    all.push(...batch);
    if (batch.length < page) break;
  }
  return all;
}

function toSenseLite(row: RawSenseRow): SenseLite {
  return {
    sense_id: row.id,
    translation_pl: pickTranslationPl(row.lexicon_translations),
    definition_en: row.definition_en ?? "",
  };
}

/**
 * Same entry + same normalized PL, ≥2 senses, and every pair of definitions passes
 * substring / Levenshtein ≥ 0.8 check. Read-only data source.
 */
export async function findHighConfidenceDuplicateSenseGroups(
  supabase: SupabaseClient,
  options?: { maxGroups?: number },
): Promise<HighConfidenceDuplicateGroup[]> {
  const maxGroups = options?.maxGroups ?? SENSE_MERGE_MAX_GROUPS;
  const rows = await loadAllSenseRows(supabase);

  const byEntry = new Map<string, { lemma: string; senses: SenseLite[] }>();
  for (const row of rows) {
    const lemma = entryLemma(row.lexicon_entries) || "(unknown)";
    const s = toSenseLite(row);
    let g = byEntry.get(row.entry_id);
    if (!g) {
      g = { lemma, senses: [] };
      byEntry.set(row.entry_id, g);
    }
    g.senses.push(s);
  }

  const out: HighConfidenceDuplicateGroup[] = [];

  for (const [entry_id, { lemma, senses }] of byEntry) {
    if (senses.length < 2) continue;

    const byPl = new Map<string, SenseLite[]>();
    for (const s of senses) {
      const nk = normalizedTranslationPl(s.translation_pl);
      if (nk == null) continue;
      const list = byPl.get(nk) ?? [];
      list.push(s);
      byPl.set(nk, list);
    }

    for (const [normPl, bucket] of byPl) {
      if (bucket.length < 2) continue;
      if (!allPairsDefinitionsMatch(bucket)) continue;

      const displayPl =
        bucket.find((x) => x.translation_pl?.trim())?.translation_pl?.trim() ?? normPl;

      out.push({
        entry_id,
        lemma,
        translation_pl: displayPl,
        senses: [...bucket]
          .sort((a, b) => a.sense_id.localeCompare(b.sense_id))
          .map((x) => ({ sense_id: x.sense_id, definition_en: x.definition_en })),
      });
    }
  }

  out.sort((a, b) => {
    const l = a.lemma.localeCompare(b.lemma, "pl");
    if (l !== 0) return l;
    return a.translation_pl.localeCompare(b.translation_pl, "pl");
  });

  return out.slice(0, maxGroups);
}
