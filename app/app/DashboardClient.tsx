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

type StreakInfo = {
  current_streak: number;
  best_streak: number;
  last_activity_date: string | null;
};

type DashboardLesson = {
  id: string;
  lesson_date: string;
  topic: string | null;
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

const MONTHS_PL = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

function formatPolishDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate.trim())) return isoDate || "—";
  const [y, m, d] = isoDate.trim().split("-");
  return `${parseInt(d)} ${MONTHS_PL[parseInt(m) - 1]} ${y}`;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const GRAMMAR_LINKS = [
  { label: "Czasy", action: "→ Mów poprawnie w czasie", href: "/app/grammar/tenses" },
  { label: "Conditionals", action: "→ Buduj zdania warunkowe", href: "/app/grammar/conditionals" },
  { label: "Modal verbs", action: "→ Używaj modalów naturalnie", href: "/app/grammar/modals" },
];

const VOCAB_LINKS = [
  { label: "Typowe błędy", action: "→ Popraw najczęstsze pomyłki", href: "/app/vocab/clusters" },
  { label: "Fiszki", action: "→ Utrwal nowe słownictwo", href: "/app/vocab/packs" },
  { label: "Pula słówek", action: "→ Powtórz swoją pulę", href: "/app/vocab/pool" },
];

type TileId = "train" | "lessons" | "grammar" | "vocab";

/** Wszystkie kafelki: spoczynek = delikatny szary, hover = biel. */
function tileClasses(id: TileId, hoveredTile: TileId | null, variant: "primary" | "quiet"): string {
  const over = hoveredTile === id;
  const base =
    variant === "primary"
      ? "rounded-2xl border p-5 backdrop-blur-sm transition-[border-color,background-color,box-shadow] duration-200 ease-out"
      : "rounded-2xl border p-4 backdrop-blur-sm transition-[border-color,background-color,box-shadow] duration-200 ease-out";

  if (over) {
    return `${base} border-slate-800/35 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)]`;
  }
  return `${base} border-slate-800/22 bg-slate-50/90 shadow-none`;
}

/** Wiersz / link = główna akcja: tło + lekki przesuw (chevron: group-hover/row). */
const itemRowMotion =
  "transition-all duration-200 ease-out hover:translate-x-1 hover:bg-slate-50/85";

export default function DashboardClient({ profile, initialStreak }: DashboardClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [streak, setStreak] = useState<StreakInfo | null>(initialStreak);
  const [lessons, setLessons] = useState<DashboardLesson[]>([]);
  const [suggestionsTop, setSuggestionsTop] = useState<TrainingSuggestion[]>([]);
  const [suggestionsList, setSuggestionsList] = useState<TrainingSuggestion[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<TileId | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayName = profile?.username || profile?.email || "-";
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

  const lastLesson = useMemo(() => {
    const today = todayISO();
    return lessons.find((l) => l.lesson_date <= today) ?? null;
  }, [lessons]);

  const nextLesson = useMemo(() => {
    const today = todayISO();
    const future = lessons
      .filter((l) => l.lesson_date > today)
      .sort((a, b) => a.lesson_date.localeCompare(b.lesson_date));
    return future[0] ?? null;
  }, [lessons]);

  const trainingCards = useMemo(
    () => buildDashboardTrainingCards(suggestionsTop, suggestionsList).slice(0, 2),
    [suggestionsTop, suggestionsList],
  );

  const loadDashboardData = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setDashboardLoading(false);
        return;
      }

      const [lessonsRes, sugRes] = await Promise.all([
        fetch("/api/lessons", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/suggestions", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      if (lessonsRes.ok) {
        const lj = await lessonsRes.json().catch(() => null);
        if (lj?.ok && Array.isArray(lj.lessons)) {
          setLessons(lj.lessons as DashboardLesson[]);
        } else {
          setLessons([]);
        }
      } else {
        setLessons([]);
      }

      const sj = (await sugRes.json().catch(() => null)) as Partial<SuggestionsResponse> | null;
      if (sugRes.ok && sj && typeof sj === "object") {
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

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const unsubscribe = subscribeTrainingCompleted(() => {
      void loadDashboardData();
    });
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
      className={`origin-top scale-110 transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
    >
      {/* Compact header */}
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
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Witaj, {displayName}!</h1>
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
            onClick={() => {
              setError("");
              setDashboardLoading(true);
              void loadDashboardData();
            }}
            type="button"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {dashboardLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`animate-pulse rounded-2xl border ${i === 0 ? "border-slate-200/70 bg-white/85 p-5" : "border-slate-100/90 bg-white/55 p-4"}`}
            >
              <div className="mb-4 h-3 w-24 rounded bg-slate-200" />
              <div className="space-y-2">
                <div className="h-10 rounded-lg bg-slate-100" />
                <div className="h-10 rounded-lg bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5"
          onMouseLeave={() => setHoveredTile(null)}
        >
          {/* 1 — trening (główna akcja) */}
          <div
            className={tileClasses("train", hoveredTile, "primary")}
            style={{ transitionDelay: mounted ? "0ms" : "0ms" }}
            onMouseEnter={() => setHoveredTile("train")}
          >
            {trainingCards.length > 0 ? (
              <div className="space-y-0.5">
                <p className="mb-2 text-xs font-semibold leading-snug text-slate-700">Dziś trenujesz:</p>
                {trainingCards.map((card) => (
                  <Link
                    key={`${card.href}-${card.title}`}
                    href={card.href}
                    className={`group/sug flex cursor-pointer items-start justify-between gap-3 rounded-lg px-2 py-2.5 ${itemRowMotion}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{card.title}</div>
                      <div className="mt-0.5 text-xs leading-snug text-slate-500">{card.description}</div>
                    </div>
                    <span className="shrink-0 pt-0.5 text-xs font-semibold text-slate-600 transition-colors duration-200 group-hover/sug:text-slate-900">
                      Zacznij →
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-lg px-2 py-2 text-left">
                <p className="mb-2 text-xs font-semibold leading-snug text-slate-700">Dziś trenujesz:</p>
                <div className="text-sm text-slate-500">Brak sugestii</div>
                <div className="mt-0.5 text-xs text-slate-400">Zacznij trening, aby zobaczyć rekomendacje</div>
              </div>
            )}
          </div>

          {/* 2 — lekcje */}
          <div
            className={tileClasses("lessons", hoveredTile, "quiet")}
            style={{ transitionDelay: mounted ? "40ms" : "0ms" }}
            onMouseEnter={() => setHoveredTile("lessons")}
          >
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Moje lekcje
            </h3>

            <div className="space-y-3">
              <div>
                <span className="mb-1 block text-[11px] font-semibold tracking-tight text-slate-400">
                  Ostatnia lekcja
                </span>
                {lastLesson ? (
                  <Link
                    href={`/app/lessons/${lastLesson.id}`}
                    className={`group/row flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 ${itemRowMotion}`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {formatPolishDate(lastLesson.lesson_date)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {(lastLesson.topic ?? "").trim() || "Bez tematu"}
                      </div>
                    </div>
                    <ChevronRight className="text-slate-300 transition-colors duration-200 group-hover/row:text-slate-500" />
                  </Link>
                ) : (
                  <div className="px-2 py-1.5 text-sm text-slate-400">Brak ostatniej lekcji</div>
                )}
              </div>

              <div className="mx-2 border-t border-slate-100/80" />

              <div>
                <span className="mb-1 block text-[11px] font-semibold tracking-tight text-slate-400">
                  Następna lekcja
                </span>
                {nextLesson ? (
                  <Link
                    href={`/app/lessons/${nextLesson.id}`}
                    className={`group/row flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 ${itemRowMotion}`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {formatPolishDate(nextLesson.lesson_date)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {(nextLesson.topic ?? "").trim() || "Bez tematu"}
                      </div>
                    </div>
                    <ChevronRight className="text-slate-300 transition-colors duration-200 group-hover/row:text-slate-500" />
                  </Link>
                ) : (
                  <div className="px-2 py-1.5 text-sm font-medium text-slate-600">Brak zaplanowanej lekcji</div>
                )}
              </div>
            </div>

            <Link
              href="/app/lessons"
              className={`mt-3 inline-flex items-center rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 ${itemRowMotion} hover:text-slate-900`}
            >
              Zobacz kalendarz →
            </Link>
          </div>

          {/* 3 — gramatyka */}
          <div
            className={tileClasses("grammar", hoveredTile, "quiet")}
            style={{ transitionDelay: mounted ? "80ms" : "0ms" }}
            onMouseEnter={() => setHoveredTile("grammar")}
          >
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Gramatyka
            </h3>
            <p className="mb-2 text-xs font-medium leading-snug text-slate-500">Mów poprawnie i świadomie</p>

            <div className="divide-y divide-slate-100/80">
              {GRAMMAR_LINKS.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group/row flex cursor-pointer items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0 -mx-1 rounded-lg px-1 ${itemRowMotion}`}
                >
                  <div className="min-w-0">
                    <span
                      className={
                        index === 0
                          ? "text-sm font-semibold text-slate-800"
                          : "text-sm font-medium text-slate-700"
                      }
                    >
                      {item.label}
                    </span>
                    <div className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500">{item.action}</div>
                  </div>
                  <ChevronRight className="shrink-0 text-slate-300 transition-colors duration-200 group-hover/row:text-slate-500" />
                </Link>
              ))}
            </div>
          </div>

          {/* 4 — słownictwo */}
          <div
            className={tileClasses("vocab", hoveredTile, "quiet")}
            style={{ transitionDelay: mounted ? "120ms" : "0ms" }}
            onMouseEnter={() => setHoveredTile("vocab")}
          >
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Słownictwo
            </h3>
            <p className="mb-2 text-xs font-medium leading-snug text-slate-500">Pracuj nad słownictwem</p>

            <div className="divide-y divide-slate-100/80">
              {VOCAB_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group/row flex cursor-pointer items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0 -mx-1 rounded-lg px-1 ${itemRowMotion}`}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    <div className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500">{item.action}</div>
                  </div>
                  <ChevronRight className="shrink-0 text-slate-300 transition-colors duration-200 group-hover/row:text-slate-500" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
