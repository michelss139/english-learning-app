"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

type LessonItem = {
  id: string;
  lesson_date: string;
  topic: string;
  summary: string | null;
  assignment_counts?: {
    assigned: number;
    done: number;
  };
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function LessonsListPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [studentId, setStudentId] = useState("");

  const [lessonDate, setLessonDate] = useState(todayISO());
  const [lessonTopic, setLessonTopic] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [creatingLesson, setCreatingLesson] = useState(false);

  const refreshLessons = async (token: string, role: string, studentIdParam?: string) => {
    const query = new URLSearchParams();
    if (role === "admin" && studentIdParam) {
      query.set("student_id", studentIdParam);
    }
    const res = await fetch(`/api/lessons${query.toString() ? `?${query.toString()}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(errorData.error || "Nie udało się pobrać lekcji.");
    }
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Nie udało się pobrać lekcji.");
    setLessons((data.lessons ?? []) as LessonItem[]);
  };

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;

        const p = await getOrCreateProfile();
        if (!p) {
          setError("Nie udało się wczytać profilu.");
          setLoading(false);
          return;
        }

        setProfile(p);
        await refreshLessons(token, p.role, studentId);
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router, studentId]);

  const createLesson = async () => {
    if (!profile?.id) {
      setError("Brak profilu. Zaloguj się ponownie.");
      return;
    }
    if (!lessonDate) {
      setError("Wybierz datę lekcji.");
      return;
    }
    if (!lessonTopic.trim()) {
      setError("Wpisz temat lekcji.");
      return;
    }
    if (profile.role === "admin" && !studentId.trim()) {
      setError("Podaj student_id ucznia.");
      return;
    }

    setCreatingLesson(true);
    setError("");

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError("Musisz być zalogowany");
        return;
      }

      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: profile.role === "admin" ? studentId.trim() : undefined,
          lesson_date: lessonDate,
          topic: lessonTopic.trim(),
          summary: lessonSummary.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || "Nie udało się utworzyć lekcji.");
      }

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Nie udało się utworzyć lekcji.");

      setLessonTopic("");
      setLessonSummary("");
      await refreshLessons(token, profile.role, studentId);
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się utworzyć lekcji.");
    } finally {
      setCreatingLesson(false);
    }
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="text-sm text-slate-600">Ładuję lekcje…</div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Lista lekcji</h1>
            <p className="text-base text-slate-600/80">Twórz i przeglądaj lekcje.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="tile-frame"
              href="/app/lessons"
            >
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Lekcje
              </span>
            </a>
            <a
              className="tile-frame"
              href="/app"
            >
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Panel ucznia
              </span>
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Dodaj lekcję</h2>
          <p className="text-sm text-slate-900/75">Utwórz lekcję i przypisz zadania.</p>
        </div>

        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 space-y-3">
          {profile?.role === "admin" ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-900/85">Student ID</label>
              <input
                className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-slate-900 placeholder:text-slate-900/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="uuid ucznia"
              />
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-900/85">Data</label>
              <input
                className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-slate-900 placeholder:text-slate-900/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium text-slate-900/85">Temat</label>
              <input
                className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-slate-900 placeholder:text-slate-900/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                value={lessonTopic}
                onChange={(e) => setLessonTopic(e.target.value)}
                placeholder="np. Past Simple + słownictwo"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-900/85">Podsumowanie (opcjonalnie)</label>
            <textarea
              className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-slate-900 placeholder:text-slate-900/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              value={lessonSummary}
              onChange={(e) => setLessonSummary(e.target.value)}
              placeholder="krótki opis lub notatki z lekcji..."
              rows={2}
            />
          </div>
          <button
            className="tile-frame disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={createLesson}
            disabled={creatingLesson}
          >
            <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
              {creatingLesson ? "Tworzę…" : "Utwórz lekcję"}
            </span>
          </button>
        </div>

        {lessons.length === 0 ? (
          <p className="text-sm text-slate-900/75">Na razie nie masz jeszcze żadnych lekcji.</p>
        ) : (
          <ul className="space-y-2">
            {lessons.map((l) => (
              <li
                key={l.id}
                className="rounded-2xl border-2 border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{l.topic}</div>
                  <div className="text-xs text-slate-900/60">{l.lesson_date}</div>
                </div>
                <div className="flex gap-2">
                  <div className="hidden sm:flex items-center text-xs text-slate-900/70">
                    {l.assignment_counts?.done ?? 0}/{l.assignment_counts?.assigned ?? 0} wykonane
                  </div>
                  <a
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-slate-900/90 hover:bg-white/10 hover:text-slate-900 transition"
                    href={`/app/lessons/${l.id}`}
                  >
                    Otwórz →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
