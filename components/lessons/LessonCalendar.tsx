"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, type Profile } from "@/lib/auth/profile";
import LessonDay from "@/components/lessons/LessonDay";
import CalendarDayPanel from "@/components/lessons/CalendarDayPanel";

type CalendarLesson = {
  id: string;
  lesson_date: string;
  topic: string;
  student_id: string;
  lesson_type: "teacher" | "self";
  student_display: string;
  assignment_count: number;
  vocab_count: number;
  topic_type: "conversation" | "grammar" | "mixed" | "none";
};

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function startOfGrid(date: Date): Date {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const jsDay = first.getDay();
  const mondayIndex = (jsDay + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayIndex);
  return gridStart;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function groupLessonsByDate(lessons: CalendarLesson[]): Map<string, CalendarLesson[]> {
  const map = new Map<string, CalendarLesson[]>();
  for (const lesson of lessons) {
    const key = lesson.lesson_date;
    const arr = map.get(key);
    if (arr) arr.push(lesson);
    else map.set(key, [lesson]);
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => a.id.localeCompare(b.id));
  }
  return map;
}

export default function LessonCalendar() {
  const router = useRouter();
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [lessons, setLessons] = useState<CalendarLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [rosterCount, setRosterCount] = useState(0);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelDateIso, setPanelDateIso] = useState<string>("");

  const monthKey = useMemo(() => toMonthKey(monthDate), [monthDate]);

  const useStudentCalendarShortcuts = Boolean(
    profile && profile.role !== "admin" && rosterCount === 0,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prof = await getOrCreateProfile();
        if (cancelled) return;
        setProfile(prof ?? null);
        if (!prof) {
          setRosterCount(0);
          return;
        }
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) {
          setRosterCount(0);
          return;
        }
        const res = await fetch("/api/teacher/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) {
          if (!cancelled) setRosterCount(0);
          return;
        }
        const data = (await res.json()) as { students?: unknown[] };
        const n = Array.isArray(data.students) ? data.students.length : 0;
        if (!cancelled) setRosterCount(n);
      } catch {
        if (!cancelled) {
          setProfile(null);
          setRosterCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) {
          setLessons([]);
          return;
        }

        const res = await fetch(`/api/lessons/calendar?month=${monthKey}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errorData.error || "Nie udało się pobrać kalendarza.");
        }

        const raw = (await res.json()) as Partial<CalendarLesson>[];
        setLessons(
          Array.isArray(raw)
            ? raw.map((row) => ({
                ...(row as CalendarLesson),
                lesson_type: row.lesson_type === "self" ? "self" : "teacher",
              }))
            : [],
        );
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się pobrać kalendarza.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [monthKey]);

  const lessonsByDate = useMemo(() => groupLessonsByDate(lessons), [lessons]);

  const monthTitle = useMemo(
    () => monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [monthDate],
  );

  const cells = useMemo(() => {
    const start = startOfGrid(monthDate);
    const all: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      all.push(d);
    }
    return all;
  }, [monthDate]);

  const todayIso = toIsoDate(new Date());

  const goPrevMonth = () => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const lessonsForPanel = useMemo(() => {
    if (!panelDateIso) return [];
    return lessonsByDate.get(panelDateIso) ?? [];
  }, [lessonsByDate, panelDateIso]);

  /** Students may add multiple personal lessons per day; teachers always see add. */
  const panelShowAdd = true;

  const onAddLesson = useCallback(
    (dateIso: string) => {
      router.push(`/app/lessons/new?date=${encodeURIComponent(dateIso)}`);
    },
    [router],
  );

  const onDayClick = useCallback(
    (dateIso: string) => {
      const forDay = lessonsByDate.get(dateIso) ?? [];
      if (useStudentCalendarShortcuts && forDay.length === 1) {
        router.push(`/app/lessons/${forDay[0]!.id}`);
        return;
      }
      setPanelDateIso(dateIso);
      setPanelOpen(true);
    },
    [lessonsByDate, router, useStudentCalendarShortcuts],
  );

  return (
    <section
      className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      aria-busy={loading}
    >
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrevMonth}
          className="rounded-lg border border-slate-200/80 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors duration-200 ease-out hover:bg-slate-50"
        >
          ←
        </button>
        <h2 className="text-center text-base font-semibold tracking-tight text-slate-900">{monthTitle}</h2>
        <button
          type="button"
          onClick={goNextMonth}
          className="rounded-lg border border-slate-200/80 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors duration-200 ease-out hover:bg-slate-50"
        >
          →
        </button>
      </div>

      <div className="mb-1.5 grid shrink-0 grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-0.5 text-center text-[11px] font-semibold text-slate-500">
            {label}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-7 gap-1 [grid-template-rows:repeat(6,minmax(0,1fr))]">
        {cells.map((date) => {
          const dateIso = toIsoDate(date);
          const dayLessons = lessonsByDate.get(dateIso) ?? [];
          const lessonCount = dayLessons.length;
          const previewTopic = dayLessons[0]?.topic;
          const previewKind =
            lessonCount === 1 ? (dayLessons[0]?.lesson_type === "self" ? "self" : "teacher") : undefined;
          return (
            <LessonDay
              key={dateIso}
              dayNumber={date.getDate()}
              dateIso={dateIso}
              isCurrentMonth={date.getMonth() === monthDate.getMonth()}
              isToday={dateIso === todayIso}
              lessonCount={lessonCount}
              previewTopic={previewTopic}
              previewKind={previewKind}
              disabled={loading}
              onClick={onDayClick}
            />
          );
        })}
      </div>

      {error ? (
        <p className="mt-2 shrink-0 text-xs leading-snug text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <span className="sr-only">Ładowanie kalendarza…</span> : null}

      <CalendarDayPanel
        open={panelOpen}
        dateIso={panelDateIso}
        lessons={lessonsForPanel.map((l) => ({
          id: l.id,
          topic: l.topic,
          student_display: l.student_display,
          lesson_type: l.lesson_type,
        }))}
        showAddButton={panelShowAdd}
        onClose={() => setPanelOpen(false)}
        onAddLesson={onAddLesson}
      />
    </section>
  );
}
