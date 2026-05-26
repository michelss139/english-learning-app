import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function FutureContinuousPage() {
  const tense = getGrammarTenseBySlug("future-continuous");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
