import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function PresentContinuousPage() {
  const tense = getGrammarTenseBySlug("present-continuous");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
