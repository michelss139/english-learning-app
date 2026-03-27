import IrregularVerbsTrainClient from "./TrainClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    assignmentId?: string;
    mode?: string;
    startMode?: string;
    targets?: string;
    lessonVerbs?: string;
    lessonId?: string;
  }>;
};

export default async function IrregularVerbsTrainPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const assignmentId = sp.assignmentId ?? "";
  const lessonVerbs = sp.lessonVerbs ?? "";
  const returnLessonId = (sp.lessonId ?? "").trim();
  const mode =
    sp.mode === "past_simple" || sp.mode === "past_participle" || sp.mode === "both"
      ? sp.mode
      : "both";
  const startMode =
    sp.startMode === "targeted" || sp.mode === "targeted" || !!sp.targets ? "targeted" : "manual";

  return (
    <IrregularVerbsTrainClient
      assignmentId={assignmentId}
      mode={mode}
      startMode={startMode}
      lessonVerbs={lessonVerbs}
      returnLessonId={returnLessonId || undefined}
    />
  );
}
