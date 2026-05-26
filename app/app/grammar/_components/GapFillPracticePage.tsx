import { fetchGapQuestions } from "@/lib/grammar/gapQuestions";
import { GapFillPracticeClient } from "./GapFillPracticeClient";

export async function GapFillPracticePage({
  exerciseSlug,
  title,
  mapHref,
  mapLabel,
}: {
  exerciseSlug: string;
  title: string;
  mapHref: string;
  mapLabel: string;
}) {
  const questions = await fetchGapQuestions(exerciseSlug);

  return (
    <GapFillPracticeClient
      exerciseSlug={exerciseSlug}
      title={title}
      mapHref={mapHref}
      mapLabel={mapLabel}
      initialQuestions={questions}
    />
  );
}
