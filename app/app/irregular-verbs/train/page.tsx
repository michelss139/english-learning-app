import IrregularVerbsTrainClient from "./TrainClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ assignmentId?: string }>;
};

export default async function IrregularVerbsTrainPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const assignmentId = sp.assignmentId ?? "";

  return <IrregularVerbsTrainClient assignmentId={assignmentId} />;
}
