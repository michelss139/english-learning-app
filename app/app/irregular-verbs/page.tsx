import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import IrregularVerbsClient, { type IrregularVerbDto } from "./IrregularVerbsClient";

export default async function IrregularVerbsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: verbs, error: verbsErr } = await supabase
    .from("irregular_verbs")
    .select("id, base, base_norm, past_simple, past_simple_variants, past_participle, past_participle_variants")
    .order("base_norm");

  if (verbsErr) {
    // Keep it simple: show login page rather than a global loader.
    // (We avoid adding global error boundaries in this refactor.)
    redirect("/login");
  }

  const { data: pinnedRows, error: pinnedErr } = await supabase
    .from("user_irregular_verbs")
    .select("irregular_verb_id")
    .eq("student_id", user.id);

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
