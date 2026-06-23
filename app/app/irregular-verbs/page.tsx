import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadTranslationsForIrregularVerbs } from "@/lib/lexicon/irregularVerbTranslationLoader";
import { batchFetchVerbMeta } from "@/lib/lexicon/verbMeta";
import IrregularVerbsClient, { type IrregularVerbDto } from "./IrregularVerbsClient";

export default async function IrregularVerbsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: verbs, error: verbsErr } = await supabase
    .from("irregular_verbs")
    .select(
      "id, base, base_norm, past_simple, past_simple_variants, past_participle, past_participle_variants, entry_id",
    )
    .order("base_norm");

  if (verbsErr) {
    return (
      <main className="space-y-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Nie udało się wczytać czasowników.
        </div>
      </main>
    );
  }

  const { data: pinnedRows } = await supabase
    .from("user_irregular_verbs")
    .select("irregular_verb_id")
    .eq("student_id", user!.id);

  const pinnedSet = new Set((pinnedRows ?? []).map((r) => r.irregular_verb_id));

  const verbRows = verbs ?? [];
  const entryIds = verbRows.map((v) => v.entry_id).filter(Boolean) as string[];

  const [verbIdToTranslation, metaMap, sensesData] = await Promise.all([
    loadTranslationsForIrregularVerbs(supabase, verbRows),
    batchFetchVerbMeta(verbRows.map((v) => v.entry_id), supabase),
    entryIds.length > 0
      ? supabase
          .from("lexicon_senses")
          .select("id, entry_id, lexicon_examples(example_en)")
          .in("entry_id", entryIds)
      : Promise.resolve({ data: [] }),
  ]);

  const entryIdToExample = new Map<string, string>();
  for (const sense of (sensesData.data ?? []) as Array<{ id: string; entry_id: string; lexicon_examples: Array<{ example_en: string | null }> }>) {
    if (!entryIdToExample.has(sense.entry_id) && sense.lexicon_examples?.[0]?.example_en) {
      entryIdToExample.set(sense.entry_id, sense.lexicon_examples[0].example_en);
    }
  }

  const payload: IrregularVerbDto[] = verbRows.map((v) => {
    const meta = metaMap.get(v.entry_id ?? "") ?? {};
    return {
      id: v.id,
      base: v.base,
      past_simple: v.past_simple,
      past_simple_variants: v.past_simple_variants ?? [],
      past_participle: v.past_participle,
      past_participle_variants: v.past_participle_variants ?? [],
      pinned: pinnedSet.has(v.id),
      translation_pl: verbIdToTranslation.get(v.id) ?? null,
      cefr_level: (meta as { cefr_level?: string | null }).cefr_level ?? null,
      example_en: v.entry_id ? (entryIdToExample.get(v.entry_id) ?? null) : null,
    };
  });

  return <IrregularVerbsClient verbs={payload} />;
}
