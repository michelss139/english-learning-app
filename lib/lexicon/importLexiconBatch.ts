import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { enrichLexiconBatch } from "@/lib/lexicon/enrichLexiconBatch";
import { normLemma, saveToLexicon } from "@/lib/lexicon/lookupOrCreateLexiconEntry";

type EnrichmentMode = "default" | "core";

export type ImportLexiconBatchResult = {
  created: string[];
  failed: Array<{ word: string; error: string }>;
};

export async function importLexiconBatch(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lemmas: string[],
  options?: { mode?: EnrichmentMode; openAiBatchSize?: number }
): Promise<ImportLexiconBatchResult> {
  const mode = options?.mode ?? "default";
  const openAiBatchSize = options?.openAiBatchSize ?? 10;
  const created: string[] = [];
  const failed: Array<{ word: string; error: string }> = [];

  const seen = new Set<string>();
  const normalized = lemmas
    .map((lemma) => normLemma(lemma))
    .filter((lemma) => {
      if (!lemma || seen.has(lemma)) return false;
      seen.add(lemma);
      return true;
    });

  for (let i = 0; i < normalized.length; i += openAiBatchSize) {
    const batch = normalized.slice(i, i + openAiBatchSize);
    let batchResults;

    try {
      batchResults = await enrichLexiconBatch(batch, { mode });
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "Unknown error";
      for (const word of batch) {
        failed.push({ word, error });
      }
      continue;
    }

    for (const result of batchResults) {
      if ("error" in result) {
        failed.push({ word: result.lemma, error: result.error ?? "invalid_or_uncertain" });
        continue;
      }

      try {
        const saveResults = await saveToLexicon(supabase, result.data);
        if (saveResults.length === 0) {
          failed.push({ word: result.lemma, error: "save_failed" });
          continue;
        }
        created.push(result.lemma);
      } catch (e: unknown) {
        failed.push({
          word: result.lemma,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  }

  return { created, failed };
}
