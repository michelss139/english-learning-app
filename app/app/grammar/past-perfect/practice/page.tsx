import { InputPracticeClient } from "../../_components/InputPracticeClient";

export default async function PastPerfectPracticePage() {
  return (
    <InputPracticeClient
      exerciseSlug="past-perfect"
      title="Past Perfect"
      mapHref="/app/grammar/past-perfect"
      mapLabel="Mapa Past Perfect"
    />
  );
}
