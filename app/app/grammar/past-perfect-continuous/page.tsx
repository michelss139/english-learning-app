import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function PastPerfectContinuousPage() {
  const tense = getGrammarTenseBySlug("past-perfect-continuous");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
