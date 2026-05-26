import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function PastContinuousPage() {
  const tense = getGrammarTenseBySlug("past-continuous");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
