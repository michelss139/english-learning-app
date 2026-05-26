import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function FuturePerfectSimplePage() {
  const tense = getGrammarTenseBySlug("future-perfect-simple");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
