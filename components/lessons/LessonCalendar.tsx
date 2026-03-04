"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LessonDay from "@/components/lessons/LessonDay";

type CalendarLesson = {
  id: string;
  lesson_date: string;
  topic: string;
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

export default function LessonCalendar() {
  const router = useRouter();
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [lessons, setLessons] = useState<CalendarLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingForDate, setCreatingForDate] = useState<string | null>(null);
  const [error, setError] = useState("");

  const monthKey = useMemo(() => toMonthKey(monthDate), [monthDate]);

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

        const data = (await res.json()) as CalendarLesson[];
        setLessons(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się pobrać kalendarza.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [monthKey]);

  const lessonsByDate = useMemo(() => {
    const map = new Map<string, CalendarLesson>();
    for (const lesson of lessons) {
      if (!map.has(lesson.lesson_date)) {
        map.set(lesson.lesson_date, lesson);
      }
    }
    return map;
  }, [lessons]);

  const monthTitle = useMemo(
    () => monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [monthDate]
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

  const onDayClick = async (dateIso: string) => {
    const existing = lessonsByDate.get(dateIso);
    if (existing) {
      router.push(`/app/lessons/${existing.id}`);
      return;
    }

    try {
      setCreatingForDate(dateIso);
      setError("");

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        throw new Error("Musisz być zalogowany.");
      }

      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lesson_date: dateIso,
          topic: "",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || "Nie udało się utworzyć lekcji.");
      }

      const data = await res.json();
      if (!data?.ok || !data?.lesson?.id) {
        throw new Error("Nieprawidłowa odpowiedź serwera.");
      }

      router.push(`/app/lessons/${data.lesson.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się utworzyć lekcji.");
    } finally {
      setCreatingForDate(null);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrevMonth}
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ←
        </button>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{monthTitle}</h2>
        <button
          type="button"
          onClick={goNextMonth}
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          →
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-1 py-1 text-center text-xs font-semibold text-slate-500">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((date) => {
          const dateIso = toIsoDate(date);
          const lesson = lessonsByDate.get(dateIso);
          return (
            <LessonDay
              key={dateIso}
              dayNumber={date.getDate()}
              dateIso={dateIso}
              isCurrentMonth={date.getMonth() === monthDate.getMonth()}
              isToday={dateIso === todayIso}
              hasLesson={Boolean(lesson)}
              lessonTopic={lesson?.topic}
              vocabCount={lesson?.vocab_count ?? 0}
              assignmentCount={lesson?.assignment_count ?? 0}
              topicType={lesson?.topic_type ?? "none"}
              disabled={loading || creatingForDate === dateIso}
              onClick={onDayClick}
            />
          );
        })}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-500">Loading…</p> : null}
    </section>
  );
}
