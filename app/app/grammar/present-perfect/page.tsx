import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function PresentPerfectPage() {
  const tense = getGrammarTenseBySlug("present-perfect");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
