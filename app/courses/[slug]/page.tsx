import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  intro_video_url: string | null;
};

type Lesson = {
  id: string;
  title: string;
  slug: string | null;
  is_free_preview: boolean;
  is_published: boolean;
  position: number;
};

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Brak konfiguracji Supabase (env vars).");
  }

  return createClient(url, anon);
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // ⬅️ KLUCZOWA LINIA (NOWY NEXT)
  const { slug } = await params;

  const supabase = getSupabaseServer();

  // 1️⃣ Kurs po slug
  const courseRes = await supabase
    .from("courses")
    .select("id,title,slug,description,intro_video_url")
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

  // 2️⃣ Lekcje (RLS decyduje co widać)
  const lessonsRes = await supabase
    .from("lessons")
    .select("id,title,slug,is_free_preview,is_published,position")
    .eq("course_id", course.id)
    .eq("is_published", true)
    .order("position", { ascending: true });

  const lessons = (lessonsRes.data ?? []) as Lesson[];

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm opacity-70">
            <Link className="underline" href="/courses">
              Kursy
            </Link>
          </p>

          <h1 className="text-3xl font-semibold">{course.title}</h1>

          {course.description && (
            <p className="opacity-80">{course.description}</p>
          )}
        </div>

        {course.intro_video_url && (
          <div className="rounded-xl border p-4">
            <p className="text-sm opacity-80">Intro wideo:</p>
            <a
              className="underline break-all"
              href={course.intro_video_url}
              target="_blank"
              rel="noreferrer"
            >
              {course.intro_video_url}
            </a>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Lekcje</h2>

          {lessons.length === 0 ? (
            <p className="opacity-80">Brak opublikowanych lekcji.</p>
          ) : (
            <ul className="space-y-2">
              {lessons.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <Link
                    className="underline"
                    href={`/courses/${course.slug}/lessons/${l.slug}`}
                  >
                    {l.title}
                  </Link>
                  <span className="text-sm opacity-70">
                    {l.is_free_preview ? "Darmowa" : "Premium"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
