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

const GRAMMAR_LINKS = [
  { label: "Czasy", href: "/app/grammar/tenses" },
  { label: "Conditionals", href: "/app/grammar/conditionals" },
  { label: "Modal verbs", href: "/app/grammar/modals" },
  { label: "Czasowniki nieregularne", href: "/app/irregular-verbs" },
];

const VOCAB_LINKS = [
  { label: "Typowe błędy", href: "/app/vocab/clusters" },
  { label: "Fiszki", href: "/app/vocab/packs" },
  { label: "Pula słówek", href: "/app/vocab/pool" },
  { label: "Artykuły", href: "/app/vocab/articles" },
];

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

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ lessons }: { lessons: DashboardLesson[] }) {
  const router = useRouter();

  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [panelOpen, setPanelOpen]     = useState(false);
  const [panelDateIso, setPanelDateIso] = useState("");

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
    for (let i = 0; i < 42; i++) {
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
    router.push(`/app/lessons/new?date=${encodeURIComponent(dateIso)}`);
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
      <div className="grid flex-1 grid-cols-7 gap-1 [grid-template-rows:repeat(6,1fr)]">
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
                      <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">
                        {dayLessons[0]?.lesson_type === "self" ? "sesja" : "lekcja"}
                      </span>
                      {topic ? (
                        <p className="line-clamp-3 break-words text-xs font-medium leading-tight text-slate-600">
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
      <div className="mt-3 flex shrink-0 items-center justify-between border-t border-slate-100 pt-2.5">
        {nextLesson ? (
          <Link
            href={`/app/lessons/${nextLesson.id}`}
            className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-800"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
            <span className="truncate">
              Następna:{" "}
              <span className="font-semibold">{formatDayMonth(nextLesson.lesson_date)}</span>
              {nextLesson.topic ? ` — ${nextLesson.topic}` : ""}
            </span>
          </Link>
        ) : (
          <span className="text-xs text-slate-400">Brak zaplanowanej lekcji</span>
        )}
        <Link
          href="/app/lessons"
          className="ml-3 shrink-0 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
        >
          Wszystkie →
        </Link>
      </div>

      {/* Day panel (same as /app/lessons) */}
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
    </div>
  );
}

// ─── Nav section (Grammar / Vocab) ────────────────────────────────────────────

function NavSection({
  label,
  href,
  links,
  dot,
  hoverAccent = "hover:bg-white",
}: {
  label: string;
  href: string;
  links: { label: string; href: string }[];
  /** Tailwind bg class for the colored dot, e.g. "bg-blue-400" */
  dot: string;
  /** Tailwind hover-bg for each link row */
  hoverAccent?: string;
}) {
  return (
    <div>
      {/* Section header — clickable, navigates to hub */}
      <Link
        href={href}
        className="group mb-2 flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-150 hover:bg-white/70"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <span className="flex-1 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 transition-colors group-hover:text-slate-700">
          {label}
        </span>
        <ChevronRight className="text-slate-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500" />
      </Link>

      {/* Link tiles */}
      <div className="space-y-0.5">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group/item flex items-center justify-between rounded-xl border border-transparent bg-white/50 px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:border-slate-200/80 ${hoverAccent} hover:text-slate-900 hover:shadow-[0_1px_6px_rgba(15,23,42,0.07)]`}
          >
            {item.label}
            <ChevronRight className="text-slate-200 transition-all duration-150 group-hover/item:translate-x-0.5 group-hover/item:text-slate-400" />
          </Link>
        ))}
      </div>
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

  const topTrainingCard = useMemo(
    () => buildDashboardTrainingCards(suggestionsTop, suggestionsList)[0] ?? null,
    [suggestionsTop, suggestionsList],
  );

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
      className={`transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
    >
      {/* ── Header ── */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => router.push("/app/profile")}
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 transition-shadow duration-200 hover:shadow-md"
            type="button"
            aria-label="Przejdź do profilu"
          >
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          </button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              Witaj, {displayName}!
            </h1>
            <div className="mt-0.5 flex items-center gap-3">
              <span
                className="text-xs font-medium text-slate-500"
                title="Seria aktualizuje się po zakończeniu przynajmniej jednego ćwiczenia danego dnia."
              >
                {streakCount} {streakCount === 1 ? "dzień" : "dni"} serii
              </span>
              <div className="flex items-center gap-1">
                {weekActivity.map((day) => (
                  <div
                    key={day.label}
                    className={`h-2 w-2 rounded-full transition-colors ${day.done ? "bg-slate-800" : "bg-slate-200"}`}
                    title={day.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/app/profile"
            className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            Profil
          </Link>
          <Link
            href="/app/settings"
            className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            Ustawienia
          </Link>
          <a href="/logout" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700">
            Wyloguj
          </a>
        </nav>
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_400px] lg:gap-6">
          <div className="h-80 animate-pulse rounded-2xl border border-slate-200/70 bg-white/85" />
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl border border-slate-100/90 bg-white/55" />
            <div className="h-48 animate-pulse rounded-2xl border border-slate-100/90 bg-white/55" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_400px] lg:gap-6">

          {/* ── Left: calendar ── */}
          <div className="flex min-h-[490px] flex-col rounded-2xl border border-slate-800/22 bg-slate-50/90 p-5 backdrop-blur-sm">
            <h2 className="mb-3 shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Lekcje
            </h2>
            <div className="flex min-h-0 flex-1 flex-col">
              <MiniCalendar lessons={lessons} />
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4">

            {/* Potrenuj dziś */}
            <div className="rounded-2xl border border-slate-800/22 bg-white/80 p-5 backdrop-blur-sm">
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                Potrenuj dziś
              </h2>
              {topTrainingCard ? (
                <Link
                  href={topTrainingCard.href}
                  className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 transition-all duration-200 hover:border-slate-800/25 hover:shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{topTrainingCard.title}</div>
                    <div className="mt-0.5 text-xs leading-snug text-slate-500">
                      {topTrainingCard.description}
                    </div>
                  </div>
                  <span className="shrink-0 pt-0.5 text-xs font-semibold text-slate-400 transition-colors group-hover:text-slate-700">
                    Zacznij →
                  </span>
                </Link>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
                  Brak sugestii treningu
                </div>
              )}
            </div>

            {/* Nawigacja: Gramatyka + Słownictwo + Sentence Builder */}
            <div className="flex-1 rounded-2xl border border-slate-800/22 bg-white/80 p-5 backdrop-blur-sm">
              <NavSection
                label="Gramatyka"
                href="/app/grammar"
                links={GRAMMAR_LINKS}
                dot="bg-blue-400"
                hoverAccent="hover:bg-blue-50/60"
              />

              <div className="my-4 border-t border-slate-100" />

              <NavSection
                label="Słownictwo"
                href="/app/vocab"
                links={VOCAB_LINKS}
                dot="bg-emerald-400"
                hoverAccent="hover:bg-emerald-50/60"
              />

              <div className="my-4 border-t border-slate-100" />

              {/* Sentence Builder — osobna tile z fioletowym akcentem */}
              <Link
                href="/app/grammar/sentence-builder"
                className="group/sb flex items-center gap-2.5 rounded-xl border border-transparent bg-white/50 px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:border-slate-200/80 hover:bg-violet-50/60 hover:text-slate-900 hover:shadow-[0_1px_6px_rgba(15,23,42,0.07)]"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                <span className="flex-1">Sentence Builder</span>
                <ChevronRight className="text-slate-200 transition-all duration-150 group-hover/sb:translate-x-0.5 group-hover/sb:text-slate-400" />
              </Link>

              {/* Story Generator */}
              <Link
                href="/app/story-generator"
                className="group/sg flex items-center gap-2.5 rounded-xl border border-transparent bg-white/50 px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:border-slate-200/80 hover:bg-violet-50/60 hover:text-slate-900 hover:shadow-[0_1px_6px_rgba(15,23,42,0.07)]"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                <span className="flex-1">Story Generator</span>
                <ChevronRight className="text-slate-200 transition-all duration-150 group-hover/sg:translate-x-0.5 group-hover/sg:text-slate-400" />
              </Link>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
