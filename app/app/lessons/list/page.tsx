"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, type Profile } from "@/lib/auth/profile";
import type { Lesson } from "@/lib/lessons/types";

type LessonItem = Lesson;

const MONTHS_PL = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

const cardBase =
  "rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatPolishDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate.trim())) return isoDate || "—";
  const [y, m, d] = isoDate.trim().split("-");
  return `${parseInt(d, 10)} ${MONTHS_PL[parseInt(m, 10) - 1]} ${y}`;
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LessonsListPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [studentId, setStudentId] = useState("");

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
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [studentId]);

  const goCreateLesson = () => {
    if (!profile?.id) {
      setError("Brak profilu. Zaloguj się ponownie.");
      return;
    }
    if (profile.role === "admin" && !studentId.trim()) {
      setError("Podaj identyfikator ucznia (UUID).");
      return;
    }
    setError("");
    const q = new URLSearchParams({ date: todayISO() });
    if (profile.role === "admin") {
      q.set("student_id", studentId.trim());
    }
    router.push(`/app/lessons/new?${q.toString()}`);
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100dvh-9rem)] flex-col gap-5">
        <div className={`${cardBase} animate-pulse`}>
          <div className="mb-4 h-10 w-40 rounded-xl bg-slate-100" />
          <div className="h-24 rounded-xl bg-slate-100" />
        </div>
        <div className={`${cardBase} animate-pulse space-y-3`}>
          <div className="h-3 w-32 rounded bg-slate-200" />
          <div className="h-14 rounded-xl bg-slate-100" />
          <div className="h-14 rounded-xl bg-slate-100" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100dvh-9rem)] flex-col gap-5">
      <header>
        <Link
          href="/app"
          className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
        >
          ← Panel
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Lekcje</h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
          <p className="text-sm text-rose-700">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      <section className={cardBase}>
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
          Utwórz lekcję
        </h2>
        <div className="space-y-4">
          {profile?.role === "admin" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500" htmlFor="lessons-admin-student">
                UUID ucznia
              </label>
              <input
                id="lessons-admin-student"
                className="w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Wklej identyfikator ucznia"
              />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => goCreateLesson()}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-slate-300 hover:bg-slate-50"
          >
            Utwórz lekcję
          </button>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Otworzy się formularz z dzisiejszą datą. Lekcja powstanie w bazie dopiero po wpisaniu tematu.
          </p>
        </div>
      </section>

      <section className={cardBase}>
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
          Twoje lekcje
        </h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-slate-400">Nie masz jeszcze żadnych lekcji.</p>
        ) : (
          <ul className="space-y-2">
            {lessons.map((l) => {
              const title = (l.topic ?? "").trim() || "Bez tematu";
              return (
                <li key={l.id}>
                  <Link
                    href={`/app/lessons/${l.id}`}
                    className="group/row flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3.5 py-3 transition-all duration-150 hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">{title}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{formatPolishDate(l.lesson_date)}</div>
                    </div>
                    <ChevronRight className="shrink-0 text-slate-300 transition-colors group-hover/row:text-slate-500" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
