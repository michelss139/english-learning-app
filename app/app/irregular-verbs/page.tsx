import { createSupabaseServerClient } from "@/lib/supabase/server";
import IrregularVerbsClient, { type IrregularVerbDto } from "./IrregularVerbsClient";

export default async function IrregularVerbsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: verbs, error: verbsErr } = await supabase
    .from("irregular_verbs")
    .select("id, base, base_norm, past_simple, past_simple_variants, past_participle, past_participle_variants")
    .order("base_norm");

  if (verbsErr) {
    return (
      <main className="space-y-6">
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
          Nie udało się wczytać czasowników.
        </div>
      </main>
    );
  }

  const { data: pinnedRows, error: pinnedErr } = await supabase
    .from("user_irregular_verbs")
    .select("irregular_verb_id")
    .eq("student_id", user!.id);

  if (pinnedErr) {
    // Fail soft: render list without pins.
  }

  const pinnedSet = new Set((pinnedRows ?? []).map((r) => r.irregular_verb_id));

  const payload: IrregularVerbDto[] = (verbs ?? []).map((v) => ({
    id: v.id,
    base: v.base,
    past_simple: v.past_simple,
    past_simple_variants: v.past_simple_variants ?? [],
    past_participle: v.past_participle,
    past_participle_variants: v.past_participle_variants ?? [],
    pinned: pinnedSet.has(v.id),
  }));

  return <IrregularVerbsClient verbs={payload} />;
}
