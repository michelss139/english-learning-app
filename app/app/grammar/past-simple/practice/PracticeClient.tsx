"use client";

import { GrammarPracticeClient } from "../../_components/GrammarPracticeClient";

export function PracticeClient({ exerciseSlug }: { exerciseSlug: string }) {
  return (
    <GrammarPracticeClient
      exerciseSlug={exerciseSlug}
      title="Past Simple"
      mapHref="/app/grammar/past-simple"
      mapLabel="Mapa Past Simple"
    />
  );
}

