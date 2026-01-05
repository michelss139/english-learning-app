"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  intro_video_url: string;
  is_published: boolean;
  created_at: string;
};

export default function AdminCoursesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string>("");

  const publishedCount = useMemo(
    () => courses.filter((c) => c.is_published).length,
    [courses]
  );

  useEffect(() => {
    const run = async () => {
      try {
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

        const { data, error } = await supabase
          .from("courses")
          .select("id,title,slug,description,intro_video_url,is_published,created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCourses((data ?? []) as Course[]);
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router]);

  if (loading) return <main className="min-h-screen p-8">Ładuję…</main>;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Admin — Kursy</h1>
            <p className="text-sm opacity-80">
              Opublikowane: {publishedCount} / {courses.length}
            </p>
          </div>

          <a
            className="rounded-lg border px-4 py-2 font-medium"
            href="/admin/courses/new"
          >
            + Nowy kurs
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
                <th className="p-3 text-left">Tytuł</th>
                <th className="p-3 text-left">Slug</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td className="p-3" colSpan={4}>
                    Brak kursów. Dodaj pierwszy kurs.
                  </td>
                </tr>
              ) : (
                courses.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0">
                    <td className="p-3">
                      <div className="font-medium">{c.title}</div>
                      <div className="opacity-70">{c.description}</div>
                    </td>
                    <td className="p-3">{c.slug}</td>
                    <td className="p-3">
                      {c.is_published ? "Opublikowany" : "Szkic"}
                    </td>
                    <td className="p-3">
                      <a
                        className="underline"
                        href={`/admin/courses/${c.id}/lessons`}
                      >
                        Lekcje →
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4 text-sm">
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
