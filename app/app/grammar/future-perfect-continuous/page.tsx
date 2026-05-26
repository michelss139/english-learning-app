import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function FuturePerfectContinuousPage() {
  const tense = getGrammarTenseBySlug("future-perfect-continuous");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
