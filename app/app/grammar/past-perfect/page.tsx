import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function PastPerfectPage() {
  const tense = getGrammarTenseBySlug("past-perfect");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
