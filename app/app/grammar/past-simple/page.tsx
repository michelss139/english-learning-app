import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function PastSimplePage() {
  const tense = getGrammarTenseBySlug("past-simple");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
