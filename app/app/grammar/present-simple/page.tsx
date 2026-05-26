import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function PresentSimplePage() {
  const tense = getGrammarTenseBySlug("present-simple");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
