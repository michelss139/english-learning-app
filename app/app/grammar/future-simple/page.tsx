import { getGrammarTenseBySlug } from "@/lib/grammar/content";
import { TenseDetailClient } from "../_components/TenseDetailClient";

export default async function FutureSimplePage() {
  const tense = getGrammarTenseBySlug("future-simple");
  if (!tense) return null;
  return <TenseDetailClient tense={tense} />;
}
