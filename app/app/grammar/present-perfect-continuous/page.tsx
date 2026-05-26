import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function PresentPerfectContinuousPage() {
  const tense = getGrammarTenseBySlug("present-perfect-continuous");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
