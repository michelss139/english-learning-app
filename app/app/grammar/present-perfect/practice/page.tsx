import { InputPracticeClient } from "../../_components/InputPracticeClient";

export default async function PresentPerfectPracticePage() {
  return (
    <InputPracticeClient
      exerciseSlug="present-perfect"
      title="Present Perfect"
      mapHref="/app/grammar/present-perfect"
      mapLabel="Mapa Present Perfect"
    />
  );
}
