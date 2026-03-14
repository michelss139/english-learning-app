import { getGrammarTensesOnly } from "@/lib/grammar/content";
import { TensesClient } from "./TensesClient";

export default async function GrammarTensesPage() {
  const tenses = getGrammarTensesOnly();

  return <TensesClient tenses={tenses} />;
}
