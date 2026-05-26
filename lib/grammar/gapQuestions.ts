import { createSupabaseServerClient } from "@/lib/supabase/server";

export type GapQuestion = {
  id: string;
  slug: string;
  prompt: string;
  base_hint: string | null;
  expected_answer: string;
  accepted_answers: string[];
};

export async function fetchGapQuestions(slug: string): Promise<GapQuestion[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("grammar_gap_questions")
    .select("id, slug, prompt, base_hint, expected_answer, accepted_answers")
    .eq("slug", slug)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[fetchGapQuestions] Supabase error:", error);
    return [];
  }

  return (data ?? []) as GapQuestion[];
}
