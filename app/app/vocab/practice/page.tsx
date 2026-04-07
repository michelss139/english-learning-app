import { Suspense } from "react";
import VocabSensePracticeClient from "./VocabSensePracticeClient";

export default function VocabPracticePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-6">
          <p className="text-sm text-slate-500">Ładowanie…</p>
        </main>
      }
    >
      <VocabSensePracticeClient />
    </Suspense>
  );
}
