import { Suspense } from "react";
import GrammarCompareClient from "./GrammarCompareClient";

export const dynamic = "force-dynamic";

export default function GrammarComparePage() {
  return (
    <Suspense fallback={<main>Ładuję…</main>}>
      <GrammarCompareClient />
    </Suspense>
  );
}
