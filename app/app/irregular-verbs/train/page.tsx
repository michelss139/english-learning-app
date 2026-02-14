import { Suspense } from "react";
import IrregularVerbsTrainClient from "./TrainClient";

export const dynamic = "force-dynamic";

export default function IrregularVerbsTrainPage() {
  return (
    <Suspense fallback={<main>Ładuję…</main>}>
      <IrregularVerbsTrainClient />
    </Suspense>
  );
}
