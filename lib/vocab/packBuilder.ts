import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { normLemma } from "@/lib/lexicon/lookupOrCreateLexiconEntry";

const IN_CHUNK = 150;

type RawTranslation = { translation_pl?: string } | Array<{ translation_pl?: string }> | null;

type EntrySenseRow = {
  id?: string;
  sense_order?: number;
  created_at?: string;
  definition_en?: string;
  lexicon_translations?: RawTranslation;
};

type EntryRow = {
  id?: string;
  lemma?: string;
  lemma_norm?: string;
  pos?: string;
  lexicon_senses?: EntrySenseRow[] | EntrySenseRow | null;
};

export type NormalizedWordsResult = {
  normalized: string[];
  duplicates: string[];
  totalInput: number;
};

export type ReadyPackLemma = {
  word: string;
  lemma_norm: string;
  entry_id: string;
  lemma: string;
  pos: string;
  sense_id: string;
  translation_pl: string | null;
  definition_en: string;
};

export type AmbiguousPackLemma = {
  word: string;
  lemma_norm: string;
  entry_count: number;
  total_senses: number;
  multiple_entries_found: boolean;
  pos_options: string[];
  reason: "multiple_entries" | "multiple_senses";
};

export type PackLexiconAnalysis = {
  ready: ReadyPackLemma[];
  ambiguous: AmbiguousPackLemma[];
  missing: string[];
};

function pickTranslationPl(value: RawTranslation): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.translation_pl?.trim() || null;
  return value.translation_pl?.trim() || null;
}

function toSenseArray(value: EntryRow["lexicon_senses"]): EntrySenseRow[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function normalizeWordsInput(words: unknown): NormalizedWordsResult | null {
  if (!Array.isArray(words)) return null;

  const seen = new Set<string>();
  const duplicateSeen = new Set<string>();
  const normalized: string[] = [];
  const duplicates: string[] = [];

  for (const raw of words) {
    if (typeof raw !== "string") return null;
    const normalizedWord = normLemma(raw);
    if (!normalizedWord) continue;

    if (seen.has(normalizedWord)) {
      if (!duplicateSeen.has(normalizedWord)) {
        duplicateSeen.add(normalizedWord);
        duplicates.push(normalizedWord);
      }
      continue;
    }

    seen.add(normalizedWord);
    normalized.push(normalizedWord);
  }

  return {
    normalized,
    duplicates,
    totalInput: words.length,
  };
}

async function fetchEntriesByLemmaNorm(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lemmaNorms: string[]
): Promise<Map<string, EntryRow[]>> {
  const grouped = new Map<string, EntryRow[]>();

  for (let i = 0; i < lemmaNorms.length; i += IN_CHUNK) {
    const chunk = lemmaNorms.slice(i, i + IN_CHUNK);
    const { data, error } = await supabase
      .from("lexicon_entries")
      .select(
        `
        id,
        lemma,
        lemma_norm,
        pos,
        lexicon_senses(
          id,
          sense_order,
          created_at,
          definition_en,
          lexicon_translations(translation_pl)
        )
      `
      )
      .in("lemma_norm", chunk);

    if (error) {
      throw new Error(`Failed to fetch lexicon entries: ${error.message}`);
    }

    for (const row of (data ?? []) as EntryRow[]) {
      const lemmaNorm = normLemma(row.lemma_norm ?? "");
      if (!lemmaNorm) continue;
      if (!grouped.has(lemmaNorm)) grouped.set(lemmaNorm, []);
      grouped.get(lemmaNorm)!.push(row);
    }
  }

  return grouped;
}

export async function analyzePackWordsAgainstLexicon(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  normalizedWords: string[]
): Promise<PackLexiconAnalysis> {
  const entriesByLemmaNorm = await fetchEntriesByLemmaNorm(supabase, normalizedWords);
  const ready: ReadyPackLemma[] = [];
  const ambiguous: AmbiguousPackLemma[] = [];
  const missing: string[] = [];

  for (const word of normalizedWords) {
    const entries = entriesByLemmaNorm.get(word) ?? [];
    if (entries.length === 0) {
      missing.push(word);
      continue;
    }

    const normalizedEntries = entries.map((entry) => {
      const senses = toSenseArray(entry.lexicon_senses)
        .map((sense) => ({
          id: String(sense.id ?? ""),
          sense_order: Number(sense.sense_order ?? 0),
          created_at: String(sense.created_at ?? ""),
          definition_en: String(sense.definition_en ?? "").trim(),
          translation_pl: pickTranslationPl(sense.lexicon_translations ?? null),
        }))
        .filter((sense) => sense.id && sense.definition_en)
        .sort((a, b) => {
          if (a.sense_order !== b.sense_order) return a.sense_order - b.sense_order;
          return a.created_at.localeCompare(b.created_at);
        });

      return {
        entry_id: String(entry.id ?? ""),
        lemma: String(entry.lemma ?? "").trim(),
        lemma_norm: normLemma(entry.lemma_norm ?? ""),
        pos: String(entry.pos ?? "").trim(),
        senses,
      };
    });

    const totalSenses = normalizedEntries.reduce((sum, entry) => sum + entry.senses.length, 0);
    const usableEntries = normalizedEntries.filter((entry) => entry.entry_id && entry.lemma && entry.pos && entry.senses.length > 0);

    if (usableEntries.length === 1 && usableEntries[0].senses.length === 1) {
      const entry = usableEntries[0];
      const sense = entry.senses[0];
      ready.push({
        word,
        lemma_norm: word,
        entry_id: entry.entry_id,
        lemma: entry.lemma,
        pos: entry.pos,
        sense_id: sense.id,
        translation_pl: sense.translation_pl,
        definition_en: sense.definition_en,
      });
      continue;
    }

    ambiguous.push({
      word,
      lemma_norm: word,
      entry_count: usableEntries.length,
      total_senses: totalSenses,
      multiple_entries_found: usableEntries.length > 1,
      pos_options: Array.from(new Set(usableEntries.map((entry) => entry.pos).filter(Boolean))),
      reason: usableEntries.length > 1 ? "multiple_entries" : "multiple_senses",
    });
  }

  return { ready, ambiguous, missing };
}
