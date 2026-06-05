import type { SupabaseClient } from "@supabase/supabase-js";

export type VerbMeta = {
  cefr_level: string | null;
  translation_pl: string | null;
};

/** Fetch CEFR level and Polish translation for a single lexicon entry_id. */
export async function fetchVerbMeta(
  entryId: string | null | undefined,
  supabase: SupabaseClient
): Promise<VerbMeta> {
  if (!entryId) return { cefr_level: null, translation_pl: null };
  const map = await batchFetchVerbMeta([entryId], supabase);
  return map.get(entryId) ?? { cefr_level: null, translation_pl: null };
}

/** Batch fetch CEFR + translation for multiple entry_ids. Returns a Map keyed by entry_id. */
export async function batchFetchVerbMeta(
  entryIds: (string | null | undefined)[],
  supabase: SupabaseClient
): Promise<Map<string, VerbMeta>> {
  const ids = entryIds.filter((id): id is string => Boolean(id));
  if (ids.length === 0) return new Map();

  const { data } = await supabase
    .from("lexicon_senses")
    .select("entry_id, cefr_level, lexicon_translations(translation_pl)")
    .in("entry_id", ids);

  const result = new Map<string, VerbMeta>();
  for (const row of data ?? []) {
    const r = row as { entry_id: string; cefr_level?: string | null; lexicon_translations?: { translation_pl: string | null }[] };
    if (!result.has(r.entry_id)) {
      result.set(r.entry_id, {
        cefr_level: r.cefr_level ?? null,
        translation_pl: r.lexicon_translations?.[0]?.translation_pl ?? null,
      });
    }
  }
  return result;
}
