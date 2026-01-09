import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Course = {
  id: string;
  title: string;
  slug: string;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  slug: string | null;
  content: string | null;
  video_url: string | null;
  is_free_preview: boolean;
  is_published: boolean;
  position: number;
};

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Brak NEXT_PUBLIC_SUPABASE_URL lub NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>;
}) {
  const { slug, lessonSlug } = await params;
  const supabase = getSupabaseServer();

  // Kurs po slug
  const courseRes = await supabase
    .from("courses")
    .select("id,title,slug")
    .eq("slug", slug)
    .single();

  if (courseRes.error || !courseRes.data) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold">Nie znaleziono kursu</h1>
          <Link className="underline" href="/courses">
            ← Wróć do listy kursów
          </Link>
        </div>
      </main>
    );
  }

  const course = courseRes.data as Course;

  // Lekcja po slug w ramach kursu (RLS zdecyduje co można zobaczyć)
  const lessonRes = await supabase
    .from("lessons")
    .select(
      "id,course_id,title,slug,content,video_url,is_free_preview,is_published,position"
    )
    .eq("course_id", course.id)
    .eq("slug", lessonSlug)
    .single();

  if (lessonRes.error || !lessonRes.data) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold">Ta lekcja jest dostępna w wersji premium</h1>
          <p className="opacity-80">
            Zaloguj się i wykup subskrypcję, aby zobaczyć pełną treść.
          </p>

          <div className="flex gap-4 text-sm">
            <Link className="underline" href={`/courses/${course.slug}`}>
              ← Wróć do kursu
            </Link>
            <Link className="underline" href="/login">
              Zaloguj
            </Link>
            <Link className="underline" href="/pricing">
              Subskrypcja
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const lesson = lessonRes.data as Lesson;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="space-y-1">
          <p className="text-sm opacity-70">
            <Link className="underline" href="/courses">
              Kursy
            </Link>{" "}
            /{" "}
            <Link className="underline" href={`/courses/${course.slug}`}>
              {course.title}
            </Link>
          </p>

          <h1 className="text-2xl font-semibold">{lesson.title}</h1>

          <p className="text-sm opacity-70">
            {lesson.is_free_preview ? "Darmowy preview" : "Premium"} •{" "}
            {lesson.is_published ? "Opublikowana" : "Szkic"}
          </p>
        </div>

        {lesson.video_url ? (
          <div className="rounded-xl border p-4">
            <p className="text-sm opacity-80">Wideo:</p>
            <a
              className="underline break-all"
              href={lesson.video_url}
              target="_blank"
              rel="noreferrer"
            >
              {lesson.video_url}
            </a>
          </div>
        ) : null}

        {lesson.content ? (
          <article className="rounded-xl border p-4 whitespace-pre-wrap leading-relaxed">
            {lesson.content}
          </article>
        ) : (
          <div className="rounded-xl border p-4">
            <p className="opacity-80">Brak treści w tej lekcji.</p>
          </div>
        )}

        <div className="flex gap-4 text-sm">
          <Link className="underline" href={`/courses/${course.slug}`}>
            ← Wróć do kursu
          </Link>
        </div>
      </div>
    </main>
  );
}
