"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

type CourseMini = {
  id: string;
  title: string;
  slug: string;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  slug: string | null;
  is_published: boolean;
  is_free_preview: boolean;
  position: number;
  created_at: string;
};

export default function AdminCourseLessonsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = (params?.courseId as string) || "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseMini | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [error, setError] = useState<string>("");

  const publishedCount = useMemo(
    () => lessons.filter((l) => l.is_published).length,
    [lessons]
  );

  useEffect(() => {
    const run = async () => {
      try {
        if (!courseId) {
          setError("Brak courseId w URL.");
          return;
        }

        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const p = await getOrCreateProfile();
        if (!p) {
          router.push("/login");
          return;
        }
        if (p.role !== "admin") {
          router.push("/app");
          return;
        }
        setProfile(p);

        // Kurs (tytuł do nagłówka)
        const courseRes = await supabase
          .from("courses")
          .select("id,title,slug")
          .eq("id", courseId)
          .single();

        if (courseRes.error) throw courseRes.error;
        setCourse(courseRes.data as CourseMini);

        // Lekcje w kursie
        const lessonsRes = await supabase
          .from("lessons")
          .select("id,course_id,title,slug,is_published,is_free_preview,position,created_at")
          .eq("course_id", courseId)
          .order("position", { ascending: true })
          .order("created_at", { ascending: true });

        if (lessonsRes.error) throw lessonsRes.error;
        setLessons((lessonsRes.data ?? []) as Lesson[]);
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router, courseId]);

  if (loading) return <main className="min-h-screen p-8">Ładuję…</main>;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Admin — Lekcje</h1>
            <p className="text-sm opacity-80">
              Kurs: <span className="font-medium">{course?.title ?? "—"}</span>
            </p>
            <p className="text-sm opacity-80">
              Opublikowane: {publishedCount} / {lessons.length}
            </p>
          </div>

          {/* W kolejnym kroku zrobimy /new */}
          <a
            className="rounded-lg border px-4 py-2 font-medium"
            href={`/admin/courses/${courseId}/lessons/new`}
          >
            + Nowa lekcja
          </a>
        </div>

        {error ? (
          <div className="rounded-xl border p-4">
            <p className="text-sm">
              <span className="font-semibold">Błąd: </span>
              {error}
            </p>
          </div>
        ) : null}

        <div className="rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left">Pozycja</th>
                <th className="p-3 text-left">Tytuł</th>
                <th className="p-3 text-left">Slug</th>
                <th className="p-3 text-left">Dostęp</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {lessons.length === 0 ? (
                <tr>
                  <td className="p-3" colSpan={5}>
                    Brak lekcji w tym kursie.
                  </td>
                </tr>
              ) : (
                lessons.map((l) => (
                  <tr key={l.id} className="border-b last:border-b-0">
                    <td className="p-3">{l.position}</td>
                    <td className="p-3">
                      <div className="font-medium">{l.title}</div>
                    </td>
                    <td className="p-3">{l.slug ?? "—"}</td>
                    <td className="p-3">
                      {l.is_free_preview ? "Preview (darmowe)" : "Premium"}
                    </td>
                    <td className="p-3">{l.is_published ? "Opublikowana" : "Szkic"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4 text-sm">
          <a className="underline" href="/admin/courses">
            ← Kursy
          </a>
          <a className="underline" href="/admin">
            ← Panel admina
          </a>
          <a className="underline" href="/logout">
            Wyloguj
          </a>
        </div>
      </div>
    </main>
  );
}
