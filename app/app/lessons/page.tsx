"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

type StudentLesson = {
  id: string;
  lesson_date: string; // yyyy-mm-dd
  title: string;
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function LessonsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState<StudentLesson[]>([]);

  const [lessonDate, setLessonDate] = useState(todayISO());
  const [lessonNotes, setLessonNotes] = useState("");
  const [creatingLesson, setCreatingLesson] = useState(false);

  const formattedLessons = useMemo(() => {
    return lessons.map((l) => ({
      ...l,
      label: `${l.title} ${l.lesson_date}`,
    }));
  }, [lessons]);

  const refreshLessons = async () => {
    const lessonsRes = await supabase
      .from("student_lessons")
      .select("id,lesson_date,title")
      .order("lesson_date", { ascending: false });

    if (lessonsRes.error) throw lessonsRes.error;
    setLessons((lessonsRes.data ?? []) as StudentLesson[]);
  };

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

        setProfile(p);
        await refreshLessons();
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router]);

  const createLesson = async () => {
    if (!profile?.id) {
      setError("Brak profilu. Zaloguj się ponownie.");
      return;
    }
    if (!lessonDate) {
      setError("Wybierz datę lekcji.");
      return;
    }

    setCreatingLesson(true);
    setError("");

    try {
      const insertRes = await supabase
        .from("student_lessons")
        .insert({
          student_id: profile.id,
          lesson_date: lessonDate,
          title: "Lekcja",
          notes: lessonNotes.trim() || null,
        })
        .select("id,lesson_date,title");

      if (insertRes.error) throw insertRes.error;

      setLessonNotes("");
      await refreshLessons();
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się utworzyć lekcji.");
    } finally {
      setCreatingLesson(false);
    }
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
          <div className="text-sm text-white/70">Ładuję lekcje…</div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Moje lekcje</h1>
            <p className="text-sm text-white/75">Lekcje z datą i notatkami.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/app")}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
          >
            ← Wróć do strony głównej
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4">
          <p className="text-sm text-rose-100">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Lekcje (daty)</h2>
          <p className="text-sm text-white/75">Utwórz „Lekcja + data”, a potem dodaj do niej słówka.</p>
        </div>

        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/85">Data</label>
              <input
                className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium text-white/85">Notatki (opcjonalnie)</label>
              <input
                className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                value={lessonNotes}
                onChange={(e) => setLessonNotes(e.target.value)}
                placeholder="np. temat lekcji, co robiliśmy..."
              />
            </div>
          </div>

          <button
            className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
            onClick={createLesson}
            disabled={creatingLesson}
          >
            {creatingLesson ? "Tworzę…" : "Utwórz lekcję"}
          </button>
        </div>

        {formattedLessons.length === 0 ? (
          <p className="text-sm text-white/75">Na razie nie masz jeszcze żadnych lekcji.</p>
        ) : (
          <ul className="space-y-2">
            {formattedLessons.map((l) => (
              <li
                key={l.id}
                className="rounded-2xl border-2 border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">{l.label}</div>
                </div>
                <div className="flex gap-2">
                  <a
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition"
                    href={`/app/vocab/lesson/${l.id}`}
                  >
                    Otwórz →
                  </a>
                  <button
                    className="rounded-xl border-2 border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-200 hover:bg-rose-400/20 transition"
                    onClick={async () => {
                      if (!confirm(`Czy na pewno chcesz usunąć lekcję "${l.label}"?`)) return;

                      try {
                        const session = await supabase.auth.getSession();
                        const token = session?.data?.session?.access_token;
                        if (!token) {
                          setError("Musisz być zalogowany");
                          return;
                        }

                        const res = await fetch("/api/vocab/delete-lesson", {
                          method: "DELETE",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ lesson_id: l.id }),
                        });

                        if (!res.ok) {
                          const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                          throw new Error(errorData.error || `HTTP ${res.status}`);
                        }

                        await refreshLessons();
                      } catch (e: any) {
                        setError(e?.message ?? "Nie udało się usunąć lekcji.");
                      }
                    }}
                  >
                    Usuń
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
