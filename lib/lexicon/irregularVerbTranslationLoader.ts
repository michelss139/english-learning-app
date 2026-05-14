import type { SupabaseClient } from "@supabase/supabase-js";
import { getFallbackTranslationPl } from "./irregularVerbTranslations";

/**
 * Pairs each irregular verb id with a Polish translation.
 * Strategy:
 *   1) Read translation_pl from the verb's primary lexicon sense (first sense_order).
 *   2) Fallback to the hardcoded map keyed by the verb's base form.
 *   3) Return null when neither is available.
 */
export async function loadTranslationsForIrregularVerbs(
  supabase: SupabaseClient,
  verbs: Array<{ id: string; base: string; entry_id: string | null }>,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const entryIds = [...new Set(verbs.map((v) => v.entry_id).filter(Boolean))] as string[];

  const entryToTranslation = new Map<string, string>();

  if (entryIds.length > 0) {
    const { data: senseRows, error: senseErr } = await supabase
      .from("lexicon_senses")
      .select("id, entry_id, sense_order")
      .in("entry_id", entryIds)
      .order("entry_id", { ascending: true })
      .order("sense_order", { ascending: true });

    if (!senseErr && senseRows?.length) {
      const entryToSenseId = new Map<string, string>();
      for (const s of senseRows) {
        if (!entryToSenseId.has(s.entry_id)) entryToSenseId.set(s.entry_id, s.id);
      }
      const senseIds = [...entryToSenseId.values()];

      if (senseIds.length > 0) {
        const { data: trRows, error: trErr } = await supabase
          .from("lexicon_translations")
          .select("sense_id, translation_pl")
          .in("sense_id", senseIds);

        if (!trErr && trRows?.length) {
          const senseToTr = new Map<string, string>();
          for (const r of trRows) {
            const txt = (r.translation_pl as string)?.trim();
            if (txt) senseToTr.set(r.sense_id as string, txt);
          }
          for (const [eid, sid] of entryToSenseId) {
            const tr = senseToTr.get(sid);
            if (tr) entryToTranslation.set(eid, tr);
          }
        }
      }
    }
  }

  for (const v of verbs) {
    const fromLexicon = v.entry_id ? entryToTranslation.get(v.entry_id) : undefined;
    const fallback = getFallbackTranslationPl(v.base);
    const final = fromLexicon ?? fallback ?? null;
    if (final) out.set(v.id, final);
  }

  return out;
}
