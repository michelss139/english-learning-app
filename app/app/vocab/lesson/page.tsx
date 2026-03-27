import { decodeLessonVocabPairsFromQuery } from "@/lib/lessons/vocabPairs";
import LessonVocabTrainClient from "./LessonVocabTrainClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ pairs?: string | string[] | undefined; lessonId?: string | string[] | undefined }>;
};

export default async function LessonVocabTrainPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = sp.pairs;
  const encoded =
    typeof raw === "string" ? raw : Array.isArray(raw) && raw.length > 0 ? raw[0] : null;
  const initialPairs = decodeLessonVocabPairsFromQuery(encoded);
  const rawLesson = sp.lessonId;
  const returnLessonId =
    typeof rawLesson === "string"
      ? rawLesson.trim()
      : Array.isArray(rawLesson) && rawLesson[0]
        ? String(rawLesson[0]).trim()
        : "";
  return (
    <LessonVocabTrainClient
      initialPairs={initialPairs}
      returnLessonId={returnLessonId || undefined}
    />
  );
}
