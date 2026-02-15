"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveAvatarUrl } from "@/lib/avatars";

type StreakInfo = {
  current_streak: number;
  best_streak: number;
  last_activity_date: string | null;
};

type Suggestion = {
  title: string;
  description: string;
  href: string;
};

type DashboardClientProps = {
  profile: {
    id: string;
    email: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  initialStreak: StreakInfo | null;
  initialSuggestion: Suggestion | null;
};

export default function DashboardClient({
  profile,
  initialStreak,
  initialSuggestion,
}: DashboardClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [streak, setStreak] = useState<StreakInfo | null>(initialStreak);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(initialSuggestion);

  const displayName = profile?.username || profile?.email || "-";
  const avatarSrc = resolveAvatarUrl(profile?.avatar_url, profile?.id ?? profile?.email ?? "");
  const streakCount = streak?.last_activity_date ? streak?.current_streak ?? 0 : 0;
  const tooltipText =
    "Seria aktualizuje się po zakończeniu przynajmniej jednego ćwiczenia danego dnia.";
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

  useEffect(() => {
    const run = async () => {
      try {
        const [streakRes, suggestionRes] = await Promise.all([
          fetch("/api/profile/streak"),
          fetch("/api/app/suggestion"),
        ]);

        const streakJson = await streakRes.json().catch(() => null);
        if (streakRes.ok && streakJson?.ok) {
          setStreak({
            current_streak: streakJson.current_streak ?? 0,
            best_streak: streakJson.best_streak ?? 0,
            last_activity_date: streakJson.last_activity_date ?? null,
          });
        }

        const suggestionJson = await suggestionRes.json().catch(() => null);
        if (suggestionRes.ok && suggestionJson?.ok) {
          setSuggestion(suggestionJson.suggestion ?? null);
        }
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      }
    };

    run();
  }, []);

  return (
    <main className="space-y-8">
      <header className="rounded-2xl border border-emerald-100/10 bg-emerald-950/40 p-5 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-100/60">LANGBracket</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Witaj, {displayName}!</h1>
            <div className="flex items-center gap-2 text-sm text-emerald-100/80">
              <span>
                To twój <span className="text-base font-semibold text-emerald-100">{streakCount}</span> dzień nauki!
              </span>
              <span className="group relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-300 text-xs font-bold text-black">
                ?
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  {tooltipText}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {weekActivity.map((day) => (
                <div key={day.label} className="flex flex-col items-center gap-1 text-[10px] text-emerald-100/70">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold ${
                      day.done
                        ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-100"
                        : "border-white/15 bg-white/5 text-white/50"
                    }`}
                  >
                    {day.done ? "✓" : ""}
                  </div>
                  <span>{day.label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-100/10 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100/85">
              <span className="text-emerald-100/80">Przedłuż serię, robiąc to ćwiczenie:</span>
              {suggestion ? (
                <>
                  <span className="font-medium text-emerald-100">{suggestion.title}</span>
                  <a
                    href={suggestion.href}
                    className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/20 transition"
                  >
                    Start
                  </a>
                </>
              ) : (
                <span className="text-emerald-100/70">Nie mamy dziś sugestii — wybierz dowolny moduł poniżej.</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
              onClick={() => router.push("/app/profile")}
              className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-3 py-2 hover:bg-white/10 transition"
              type="button"
            >
              <img src={avatarSrc} alt="" className="h-9 w-9 rounded-full object-cover border border-white/20" />
              <span className="text-sm font-medium text-white">Mój profil</span>
            </button>
            <a
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
              href="/app/settings"
            >
              Ustawienia
            </a>
            <a
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
              href="/logout"
            >
              Wyloguj
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-rose-100">
              <span className="font-semibold">Błąd: </span>
              {error}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
                onClick={() => router.refresh()}
              >
                Spróbuj ponownie
              </button>
              <a
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
                href="/app"
              >
                Wróć do strony głównej
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          {
            title: "SŁOWNICTWO",
            description: "Moja pula · Fiszki · Typowe błędy",
            href: "/app/vocab",
          },
          {
            title: "GRAMATYKA",
            description: "Irregular verbs · Czasy · Stative verbs",
            href: "/app/grammar",
          },
          {
            title: "MOJE LEKCJE",
            description: "Notatki · Zadania · Historia zajęć",
            href: "/app/lessons",
          },
          {
            title: "KURSY",
            description: "Materiały wideo (wkrótce)",
            href: "/app/courses",
          },
        ].map((tile) => (
          <a
            key={tile.title}
            href={tile.href}
            className="rounded-2xl border border-emerald-100/10 bg-emerald-950/40 p-5 transition hover:bg-emerald-900/40"
          >
            <div className="aspect-[2/1] flex flex-col justify-between">
              <div className="text-3xl font-semibold tracking-tight text-white">{tile.title}</div>
              <div className="text-base text-emerald-100/80">{tile.description}</div>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
