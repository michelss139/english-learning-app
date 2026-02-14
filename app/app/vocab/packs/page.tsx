import { Suspense } from "react";
import PacksSection from "../PacksSection";

export const dynamic = "force-dynamic";

export default function VocabPacksPage() {
  return (
    <Suspense fallback={<main>Ładuję…</main>}>
      <main className="space-y-6">
        <PacksSection />
      </main>
    </Suspense>
  );
}
