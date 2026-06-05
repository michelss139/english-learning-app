"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { resolveAvatarUrl } from "@/lib/avatars";
import { subscribeTrainingCompleted } from "@/lib/events/trainingEvents";
import {
  buildDashboardTrainingCards,
  type TrainingSuggestion,
} from "@/lib/suggestions/trainingDisplayCards";
import CalendarDayPanel from "@/components/lessons/CalendarDayPanel";
import NewLessonModal from "@/components/lessons/NewLessonModal";

type StreakInfo = {
  current_streak: number;
  best_streak: number;
  last_activity_date: string | null;
};

type DashboardLesson = {
  id: string;
  lesson_date: string;
  topic: string | null;
  lesson_type: "teacher" | "self";
};


type SuggestionsResponse = {
  top: TrainingSuggestion[];
  list: TrainingSuggestion[];
};

type DashboardClientProps = {
  profile: {
    id: string;
    email: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  initialStreak: StreakInfo | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_FULL_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const WEEKDAY_MINI = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];


// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function startOfGrid(date: Date): Date {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayIndex = (first.getDay() + 6) % 7;
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

function formatDayMonth(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${parseInt(d)} ${MONTHS_FULL_PL[parseInt(m) - 1].slice(0, 3).toLowerCase()}`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Slim navigation tile ─────────────────────────────────────────────────────

function SlimNavTile({
  label,
  href,
  bgClass,
  shadowClass,
  className,
}: {
  label: string;
  href: string;
  bgClass: string;
  shadowClass?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center justify-between overflow-hidden rounded-2xl ${bgClass} px-5 py-[1.125rem] ring-1 ring-inset ring-white/20 transition-all duration-200 hover:scale-[1.015] hover:ring-white/40 hover:shadow-lg ${shadowClass ?? ""} ${className ?? ""}`}
    >
      {/* Biały połysk od góry — efekt źródła światła */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
      {/* Delikatny blask w lewym górnym rogu */}
      <div className="pointer-events-none absolute -top-4 -left-4 h-16 w-16 rounded-full bg-white/10 blur-xl" />

      <span className="relative text-lg font-black tracking-tight drop-shadow-sm" style={{ color: "#fff" }}>
        {label}
      </span>
      <svg
        className="relative shrink-0 transition-all duration-200 group-hover:translate-x-0.5"
        style={{ color: "rgba(255,255,255,0.65)" }}
        width="18" height="18" viewBox="0 0 24 24" fill="none"
      >
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ lessons }: { lessons: DashboardLesson[] }) {
  const router = useRouter();

  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [panelOpen, setPanelOpen]         = useState(false);
  const [panelDateIso, setPanelDateIso]   = useState("");
  const [newLessonOpen, setNewLessonOpen] = useState(false);
  const [newLessonDate, setNewLessonDate] = useState("");

  const today = todayISO();

  // Group lessons by date
  const lessonsByDate = useMemo(() => {
    const map = new Map<string, DashboardLesson[]>();
    for (const l of lessons) {
      const arr = map.get(l.lesson_date) ?? [];
      arr.push(l);
      map.set(l.lesson_date, arr);
    }
    return map;
  }, [lessons]);

  const cells = useMemo(() => {
    const start = startOfGrid(monthDate);
    const result: { iso: string; date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      result.push({
        iso: toIsoDate(d),
        date: d,
        isCurrentMonth: d.getMonth() === monthDate.getMonth(),
      });
    }
    return result;
  }, [monthDate]);

  const nextLesson = useMemo(() => {
    const t = todayISO();
    return (
      lessons
        .filter((l) => l.lesson_date >= t)
        .sort((a, b) => a.lesson_date.localeCompare(b.lesson_date))[0] ?? null
    );
  }, [lessons]);

  const lessonsForPanel = useMemo(() => {
    if (!panelDateIso) return [];
    return (lessonsByDate.get(panelDateIso) ?? []).map((l) => ({
      id: l.id,
      topic: l.topic ?? "",
      student_display: l.lesson_type === "self" ? "Twoja sesja" : "Lekcja",
      lesson_type: l.lesson_type,
    }));
  }, [lessonsByDate, panelDateIso]);

  const monthLabel = `${MONTHS_FULL_PL[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

  function prevMonth() {
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1));
  }
  function nextMonth() {
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));
  }

  function onDayClick(dateIso: string) {
    setPanelDateIso(dateIso);
    setPanelOpen(true);
  }

  function onAddLesson(dateIso: string) {
    setNewLessonDate(dateIso);
    setNewLessonOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Month nav */}
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Poprzedni miesiąc"
        >
          <ChevronLeft />
        </button>
        <span className="text-sm font-semibold text-slate-700">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Następny miesiąc"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="mb-1.5 grid shrink-0 grid-cols-7 gap-1">
        {WEEKDAY_MINI.map((d) => (
          <div key={d} className="py-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells — tall, with topic preview */}
      <div className="grid flex-1 grid-cols-7 gap-1 [grid-template-rows:repeat(5,1fr)]">
        {cells.map((cell) => {
          const dayLessons = lessonsByDate.get(cell.iso) ?? [];
          const hasLesson  = dayLessons.length > 0;
          const count      = dayLessons.length;
          const topic      = dayLessons[0]?.topic ?? "";
          const isToday    = cell.iso === today;
          const isCurrent  = cell.isCurrentMonth;

          // Today: white bg + subtle border ring — the day number gets a dark pill,
          //        not the whole cell.
          // Current month: very slightly off-white → pure white on hover.
          // Other months: muted grey, unchanged.
          let cellCls: string;
          if (isToday) {
            cellCls = hasLesson
              ? "border-slate-900/20 bg-white text-slate-800 ring-1 ring-inset ring-slate-900/10 hover:border-slate-900/30 hover:bg-white group"
              : "border-slate-900/20 bg-white text-slate-800 ring-1 ring-inset ring-slate-900/10 hover:border-slate-900/30 group";
          } else if (hasLesson) {
            cellCls = isCurrent
              ? "border-slate-200/80 bg-slate-50/60 text-slate-800 hover:bg-white hover:border-slate-300 group"
              : "border-slate-100 bg-slate-50/50 text-slate-400 hover:border-slate-200 group";
          } else {
            cellCls = isCurrent
              ? "border-slate-100 bg-slate-50/40 text-slate-500 hover:bg-white hover:border-slate-200 group"
              : "border-slate-100 bg-slate-50/60 text-slate-300 hover:border-slate-200";
          }

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onDayClick(cell.iso)}
              className={`relative flex h-full w-full flex-col rounded-lg border px-1.5 pb-1.5 pt-1 text-left transition-[border-color,background-color,box-shadow] duration-150 focus:outline-none ${cellCls}`}
              title={
                hasLesson
                  ? count > 1
                    ? `${count} lekcji${topic ? ` · ${topic}` : ""}`
                    : topic || "Lekcja"
                  : "Dodaj lekcję"
              }
            >
              {/* Day number — today gets a small dark circle badge */}
              {isToday ? (
                <span
                  className="inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-slate-900 text-[13px] font-bold tabular-nums"
                  style={{ color: "#fff" }}
                >
                  {cell.date.getDate()}
                </span>
              ) : (
                <span className="shrink-0 text-[13px] font-semibold tabular-nums leading-none">
                  {String(cell.date.getDate()).padStart(2, "0")}
                </span>
              )}

              {/* Lesson content */}
              {hasLesson && (
                <div className="mt-1 flex min-h-0 min-w-0 flex-1 flex-col gap-0.5">
                  {count === 1 ? (
                    <>
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        temat
                      </span>
                      {topic ? (
                        <p className="line-clamp-3 break-words text-[11px] font-semibold leading-tight text-slate-700">
                          {topic}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <span className="shrink-0 text-xs font-semibold text-slate-500">
                      {count} lekcje
                    </span>
                  )}
                </div>
              )}

              {/* "+" hint on empty current-month cells */}
              {!hasLesson && isCurrent && (
                <span className="absolute inset-0 flex items-center justify-center text-sm font-light text-slate-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100 select-none">
                  +
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 shrink-0 border-t border-slate-100 pt-2.5">
        {nextLesson ? (
          <Link
            href={`/app/lessons/${nextLesson.id}`}
            className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-800"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
            <span className="truncate">
              Następna:{" "}
              <span className="font-semibold">{formatDayMonth(nextLesson.lesson_date)}</span>
              {nextLesson.topic ? ` — ${nextLesson.topic}` : ""}
            </span>
          </Link>
        ) : (
          <span className="text-xs text-slate-400">Brak zaplanowanych lekcji</span>
        )}
      </div>

      {/* Day panel */}
      <CalendarDayPanel
        open={panelOpen}
        dateIso={panelDateIso}
        lessons={lessonsForPanel}
        showAddButton={true}
        onClose={() => setPanelOpen(false)}
        onAddLesson={(dateIso) => {
          setPanelOpen(false);
          onAddLesson(dateIso);
        }}
      />

      {/* New lesson modal */}
      <NewLessonModal
        open={newLessonOpen}
        dateIso={newLessonDate}
        onClose={() => setNewLessonOpen(false)}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardClient({ profile, initialStreak }: DashboardClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [streak, setStreak] = useState<StreakInfo | null>(initialStreak);
  const [lessons, setLessons] = useState<DashboardLesson[]>([]);
  const [suggestionsTop, setSuggestionsTop] = useState<TrainingSuggestion[]>([]);
  const [suggestionsList, setSuggestionsList] = useState<TrainingSuggestion[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const displayName = profile?.username || profile?.email?.split("@")[0] || "-";
  const avatarSrc = resolveAvatarUrl(profile?.avatar_url, profile?.id ?? profile?.email ?? "");
  const streakCount = streak?.last_activity_date ? streak?.current_streak ?? 0 : 0;

  const topTrainingCard = useMemo(
    () => buildDashboardTrainingCards(suggestionsTop, suggestionsList)[0] ?? null,
    [suggestionsTop, suggestionsList],
  );

  const weekDays = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];
  const weekActivity = useMemo(() => {
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7;
    const completedDays = Math.max(0, Math.min(streakCount, dayIndex + 1));
    return weekDays.map((label, idx) => ({
      label,
      done: idx >= dayIndex - completedDays + 1 && idx <= dayIndex && streakCount > 0,
    }));
  }, [streakCount]);

  const loadDashboardData = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) { setDashboardLoading(false); return; }

      const [lessonsRes, sugRes] = await Promise.all([
        fetch("/api/lessons", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/suggestions", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      ]);

      if (lessonsRes.ok) {
        const lj = await lessonsRes.json().catch(() => null);
        setLessons(lj?.ok && Array.isArray(lj.lessons) ? (lj.lessons as DashboardLesson[]) : []);
      } else {
        setLessons([]);
      }

      const sj = (await sugRes.json().catch(() => null)) as Partial<SuggestionsResponse> | null;
      if (sugRes.ok && sj) {
        setSuggestionsTop(Array.isArray(sj.top) ? sj.top : []);
        setSuggestionsList(Array.isArray(sj.list) ? sj.list : []);
      } else {
        setSuggestionsTop([]);
        setSuggestionsList([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nieznany błąd");
      setLessons([]);
      setSuggestionsTop([]);
      setSuggestionsList([]);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboardData(); }, [loadDashboardData]);

  useEffect(() => {
    const unsubscribe = subscribeTrainingCompleted(() => { void loadDashboardData(); });
    return unsubscribe;
  }, [loadDashboardData]);

  useEffect(() => {
    const run = async () => {
      try {
        const streakRes = await fetch("/api/profile/streak");
        const streakJson = await streakRes.json().catch(() => null);
        if (streakRes.ok && streakJson?.ok) {
          setStreak({
            current_streak: streakJson.current_streak ?? 0,
            best_streak: streakJson.best_streak ?? 0,
            last_activity_date: streakJson.last_activity_date ?? null,
          });
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Nieznany błąd");
      }
    };
    run();
  }, []);

  return (
    <main
      className={`flex flex-col h-[calc(100dvh-9.75rem)] sm:h-[calc(100dvh-9.5rem)] transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
    >
      {/* ── Header ── */}
      <header className="mb-5 flex shrink-0 items-center">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => router.push("/app/profile")}
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 transition-shadow duration-200 hover:shadow-md"
            type="button"
            aria-label="Przejdź do profilu"
          >
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Witaj, {displayName}!
            </h1>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
          <p className="text-sm text-rose-700">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
          <button
            className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => { setError(""); setDashboardLoading(true); void loadDashboardData(); }}
            type="button"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {dashboardLoading ? (
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 md:grid-cols-[3fr_2fr] lg:gap-5">
          <div className="animate-pulse rounded-2xl bg-orange-100/60" />
          <div className="flex flex-col gap-3">
            <div className="h-12 animate-pulse rounded-2xl bg-emerald-100/60" />
            <div className="h-12 animate-pulse rounded-2xl bg-blue-100/60" />
            <div className="h-12 animate-pulse rounded-2xl bg-indigo-100/60" />
            <div className="flex-1 animate-pulse rounded-2xl bg-slate-100/60" />
          </div>
        </div>
      ) : (
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 md:grid-cols-[3fr_2fr] lg:gap-5">

          {/* ── Left: Kalendarz — orange tile ── */}
          <div className="flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_4px_24px_rgba(251,146,60,0.28)]">
            {/* Orange header */}
            <div className="flex shrink-0 items-center justify-between px-5 py-4">
              <h2 className="text-2xl font-black tracking-tight" style={{ color: "#fff" }}>Kalendarz</h2>
              <Link
                href="/app/lessons"
                className="flex items-center gap-1 text-sm font-semibold transition-colors"
                style={{ color: "rgba(255,255,255,0.75)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
              >
                Lekcje <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {/* White inner calendar — 2px orange frame */}
            <div className="mx-[3px] mb-[3px] flex min-h-0 flex-1 flex-col rounded-xl bg-white p-4 overflow-hidden">
              <MiniCalendar lessons={lessons} />
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex h-full flex-col gap-4">

            {/* 3 slim nav tiles — flex-1 each so they share the space above the cards */}
            <SlimNavTile
              label="Gramatyka"
              href="/app/grammar"
              bgClass="bg-gradient-to-br from-emerald-400 to-teal-700"
              shadowClass="shadow-md shadow-emerald-300/40"
              className="flex-1"
            />
            <SlimNavTile
              label="Słownictwo"
              href="/app/vocab"
              bgClass="bg-gradient-to-br from-sky-400 to-blue-700"
              shadowClass="shadow-md shadow-blue-300/40"
              className="flex-1"
            />
            <SlimNavTile
              label="Dodatki Premium"
              href="/app/premium"
              bgClass="bg-gradient-to-br from-indigo-400 to-violet-700"
              shadowClass="shadow-md shadow-indigo-300/40"
              className="flex-1"
            />

            {/* Potrenuj */}
            <div className="shrink-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                Potrenuj
              </h2>
              {topTrainingCard ? (
                <Link
                  href={topTrainingCard.href}
                  className="group flex items-end gap-2 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-200 hover:shadow-md"
                >
                  {/* Tekst + przycisk — lewa strona */}
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold text-slate-900">{topTrainingCard.title}</div>
                    <div className="mt-1 text-sm leading-snug text-slate-500">
                      {topTrainingCard.description}
                    </div>
                    <span
                      className="relative mt-3 inline-flex items-center overflow-hidden rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-bold tracking-wide transition-all duration-200 group-hover:shadow-md group-hover:brightness-110"
                      style={{ color: "#fff" }}
                    >
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                      <span className="relative">Zacznij →</span>
                    </span>
                  </div>
                  {/* Maskotka — prawa strona, wyrównana do dołu */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/mascot-reader.png"
                    alt=""
                    aria-hidden="true"
                    className="h-[100px] w-auto flex-shrink-0 self-end object-contain"
                  />
                </Link>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
                  Brak sugestii treningu
                </div>
              )}
            </div>

            {/* Seria nauki — flat card, natural height */}
            <div className="shrink-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                Seria nauki
              </h2>
              <div className="mb-4 flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-slate-900">{streakCount}</span>
                  <span className="text-base font-medium text-slate-500">
                    {streakCount === 1 ? "dzień" : "dni"}
                  </span>
                </div>
                {(streak?.best_streak ?? 0) > 0 && (
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-400">rekord</div>
                    <div className="text-base font-bold text-slate-700">{streak?.best_streak} dni</div>
                  </div>
                )}
              </div>
              {/* Paski tygodnia */}
              <div className="flex gap-2">
                {weekActivity.map((day) => (
                  <div key={day.label} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={`h-2 w-full rounded-full transition-colors duration-300 ${
                        day.done
                          ? "bg-gradient-to-r from-amber-400 to-orange-500"
                          : "bg-slate-100"
                      }`}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
