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
  initialSuggestion: _initialSuggestion,
}: DashboardClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [streak, setStreak] = useState<StreakInfo | null>(initialStreak);

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
        const streakRes = await fetch("/api/profile/streak");

        const streakJson = await streakRes.json().catch(() => null);
        if (streakRes.ok && streakJson?.ok) {
          setStreak({
            current_streak: streakJson.current_streak ?? 0,
            best_streak: streakJson.best_streak ?? 0,
            last_activity_date: streakJson.last_activity_date ?? null,
          });
        }
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      }
    };

    run();
  }, []);

  return (
    <main className="space-y-5">
      <header className="px-1 py-1">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="mx-auto flex max-w-2xl flex-col items-center space-y-3 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Witaj, {displayName}!</h1>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>
                To twój <span className="text-base font-semibold text-slate-900">{streakCount}</span> dzień nauki!
              </span>
              <span className="group relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 text-xs font-bold text-black">
                ?
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  {tooltipText}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {weekActivity.map((day) => (
                <div key={day.label} className="flex flex-col items-center gap-1 text-sm text-slate-500">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold ${
                      day.done
                        ? "border-slate-900 bg-slate-100 text-slate-800"
                        : "border-slate-400 bg-white text-slate-500"
                    }`}
                  >
                    {day.done ? "✓" : ""}
                  </div>
                  <span>{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
              onClick={() => router.push("/app/profile")}
              className="flex w-40 items-center justify-center gap-3 rounded-xl border border-slate-900 bg-white px-3 py-2 transition hover:bg-slate-50"
              type="button"
            >
              <img src={avatarSrc} alt="" className="h-9 w-9 rounded-full border border-slate-300 object-cover" />
              <span className="text-sm font-medium text-slate-800">Mój profil</span>
            </button>
            <a
              className="inline-flex w-40 items-center justify-center rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/app/settings"
            >
              Ustawienia
            </a>
            <a
              className="inline-flex w-40 items-center justify-center rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/logout"
            >
              Wyloguj
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-rose-700">
              <span className="font-semibold">Błąd: </span>
              {error}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => router.refresh()}
              >
                Spróbuj ponownie
              </button>
              <a
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                href="/app"
              >
                Wróć do strony głównej
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          {
            title: "SŁOWNICTWO",
            description: "Moja pula · Fiszki · Typowe błędy",
            href: "/app/vocab",
          },
          {
            title: "GRAMATYKA",
            description: "Nieregularne czasowniki · Czasy · Czasowniki statyczne",
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
            className="tile-frame"
          >
            <div className="tile-core aspect-[2.3/1] px-4 py-4">
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <div className="text-3xl font-semibold tracking-tight text-slate-900">{tile.title}</div>
                <div className="text-base text-slate-600">{tile.description}</div>
              </div>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
