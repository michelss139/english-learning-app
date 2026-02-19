"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getRandomAvatar, resolveAvatarUrl } from "@/lib/avatars";

type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
};

type XpInfo = {
  xp_total: number;
  level: number;
  xp_in_current_level: number;
  xp_to_next_level: number;
};

type StreakInfo = {
  current_streak: number;
  best_streak: number;
  last_activity_date: string | null;
};

type Badge = {
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  earned: boolean;
};

type Suggestion = {
  title: string;
  description: string;
  href: string;
};

type ProgressSummary = {
  accuracy: {
    correct_7d: number;
    total_7d: number;
    correct_14d: number;
    total_14d: number;
  };
  todayCount: number;
  mostWrong: { term_en_norm: string; wrong_count: number }[];
  lastAttempts: { term_en_norm: string; correct: boolean; created_at: string }[];
};

type ProgressExtended = {
  accuracy: {
    correct_today: number;
    total_today: number;
    correct_3d: number;
    total_3d: number;
    correct_7d: number;
    total_7d: number;
    correct_14d: number;
    total_14d: number;
  };
  learned: {
    today: { term_en_norm: string }[];
    week: { term_en_norm: string }[];
    total: { term_en_norm: string }[];
  };
  toLearn: {
    today: { term_en_norm: string }[];
    week: { term_en_norm: string }[];
    total: { term_en_norm: string }[];
  };
  repeatSuggestions: { term_en_norm: string; last_correct_at: string }[];
};

type OnboardingStatus = {
  completed: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoAssigned, setAutoAssigned] = useState(false);

  const [xp, setXp] = useState<XpInfo | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [trainingSuggestion, setTrainingSuggestion] = useState<Suggestion | null>(null);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [extended, setExtended] = useState<ProgressExtended | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const onboardingSuggestions = [
    {
      title: "Fiszki (5 pytań)",
      description: "Szybka sesja na rozgrzewkę.",
      href: "/app/vocab/pack/shop?limit=5&direction=pl-en&autostart=1",
    },
    {
      title: "Typowe błędy",
      description: "Najczęstsze pułapki językowe.",
      href: "/app/vocab/clusters",
    },
    {
      title: "Nieregularne czasowniki (min 5)",
      description: "Formy czasowników nieregularnych.",
      href: "/app/irregular-verbs/train",
    },
  ];

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const token = session.data.session.access_token;
        const prof = await getOrCreateProfile();
        if (!prof) {
          router.push("/login");
          return;
        }

        setProfile({
          id: prof.id,
          email: prof.email ?? null,
          username: prof.username ?? null,
          avatar_url: prof.avatar_url ?? null,
        });
        if (!prof.avatar_url && !autoAssigned) {
          const randomAvatar = getRandomAvatar();
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: randomAvatar })
            .eq("id", prof.id);
          if (!updateError) {
            setProfile((prev) => (prev ? { ...prev, avatar_url: randomAvatar } : prev));
          }
          setAutoAssigned(true);
        }

        const [xpRes, streakRes, badgesRes, summaryRes, extendedRes, onboardingRes, suggestionRes] = await Promise.all([
          fetch("/api/profile/xp", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/profile/streak", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/profile/badges", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/vocab/progress-summary", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/vocab/progress-extended", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/app/onboarding-status", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/app/suggestion", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const xpJson = await xpRes.json().catch(() => null);
        if (xpRes.ok && xpJson?.ok) {
          setXp({
            xp_total: xpJson.xp_total ?? 0,
            level: xpJson.level ?? 0,
            xp_in_current_level: xpJson.xp_in_current_level ?? 0,
            xp_to_next_level: xpJson.xp_to_next_level ?? 0,
          });
        }

        const streakJson = await streakRes.json().catch(() => null);
        if (streakRes.ok && streakJson?.ok) {
          setStreak({
            current_streak: streakJson.current_streak ?? 0,
            best_streak: streakJson.best_streak ?? 0,
            last_activity_date: streakJson.last_activity_date ?? null,
          });
        }

        const badgesJson = await badgesRes.json().catch(() => null);
        if (badgesRes.ok && badgesJson?.ok) {
          setBadges((badgesJson.badges ?? []) as Badge[]);
        }

        const summaryJson = await summaryRes.json().catch(() => null);
        if (summaryRes.ok && summaryJson) {
          setSummary(summaryJson as ProgressSummary);
        }

        const extendedJson = await extendedRes.json().catch(() => null);
        if (extendedRes.ok && extendedJson) {
          setExtended(extendedJson as ProgressExtended);
        }

        const onboardingJson = await onboardingRes.json().catch(() => null);
        if (onboardingRes.ok && onboardingJson?.ok) {
          setOnboardingStatus({ completed: Boolean(onboardingJson.completed) });
        }

        const suggestionJson = await suggestionRes.json().catch(() => null);
        if (suggestionRes.ok && suggestionJson?.ok && suggestionJson?.suggestion) {
          setTrainingSuggestion(suggestionJson.suggestion as Suggestion);
        }
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać profilu.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router]);

  const avatarSrc = useMemo(() => {
    const seed = profile?.id ?? profile?.email ?? "";
    return resolveAvatarUrl(profile?.avatar_url, seed);
  }, [profile?.id, profile?.email, profile?.avatar_url]);

  const xpInLevel = xp?.xp_in_current_level ?? 0;
  const xpToNext = xp?.xp_to_next_level ?? 0;
  const xpPercent = xpToNext > 0 ? Math.min(Math.round((xpInLevel / xpToNext) * 100), 100) : 0;
  const currentStreak = streak?.last_activity_date ? streak.current_streak ?? 0 : 0;
  const bestStreak = streak?.best_streak ?? 0;

  const weekDays = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];
  const weekActivity = useMemo(() => {
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7;
    const completedDays = Math.max(0, Math.min(currentStreak, dayIndex + 1));
    return weekDays.map((label, idx) => ({
      label,
      done: idx >= dayIndex - completedDays + 1 && idx <= dayIndex && currentStreak > 0,
    }));
  }, [currentStreak]);
  const tooltipText =
    "Seria aktualizuje się po zakończeniu przynajmniej jednego ćwiczenia danego dnia.";

  const renderBadgeIcon = (badge: Badge) => {
    if (badge.icon && (badge.icon.startsWith("/") || badge.icon.startsWith("http"))) {
      return <img src={badge.icon} alt="" className="h-8 w-8" />;
    }
    if (badge.icon) return badge.icon;
    return badge.title?.slice(0, 1) || "★";
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="px-1 py-1">
          <div className="text-sm text-slate-600">Ładuję profil…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="px-1 py-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="mx-auto flex max-w-2xl flex-col items-center space-y-3 text-center sm:mx-0 sm:items-start sm:text-left">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Oto twój postęp, {profile?.username || profile?.email || "Użytkowniku"}!
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>
                To twój <span className="text-base font-semibold text-slate-900">{currentStreak}</span> dzień nauki!
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
          <div className="flex flex-col items-center gap-3 sm:items-end">
            <a
              href="#badges"
              className="flex flex-col items-center gap-1.5 text-slate-700 hover:text-slate-900 transition"
              title="Zobacz wszystkie odznaki"
            >
              <span className="text-sm font-medium">Moje odznaki</span>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${
                  badges.some((b) => b.slug === "pack_shop_master" && b.earned)
                    ? "border-slate-900 bg-slate-100 text-slate-800"
                    : "border-slate-400 bg-white text-slate-500"
                }`}
                aria-hidden
              >
                M
              </div>
            </a>
            <a
              href="/app"
              className="inline-flex w-40 items-center justify-center rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ← Wróć do strony głównej
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex flex-col gap-3">
            <div className="text-slate-800">{error}</div>
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

      <section className="tile-frame">
        <div className="tile-core p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={avatarSrc}
                alt=""
                className="h-20 w-20 rounded-full object-cover border-2 border-slate-300"
              />
              <div>
                <div className="text-sm text-slate-500">Poziom</div>
                <div className="text-4xl font-semibold text-slate-900">{xp?.level ?? 0}</div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-sm text-slate-600">Postęp do następnego poziomu</div>
              <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-slate-700" style={{ width: `${xpPercent}%` }} />
              </div>
              <div className="text-xs text-slate-500">
                {xpInLevel}/{xpToNext} XP do następnego poziomu
              </div>
            </div>
            <div className="space-y-1 text-right">
              <div className="text-sm text-slate-600">Rekord serii</div>
              <div className="text-lg font-semibold text-slate-900">{bestStreak} dni</div>
            </div>
          </div>
        </div>
      </section>

      <section className="tile-frame">
        <div className="tile-core p-6 space-y-3">
          <div className="text-sm uppercase tracking-[0.14em] text-slate-500">Przedłuż serię</div>
          {trainingSuggestion ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
              <span className="font-medium text-slate-900">{trainingSuggestion.title}</span>
              <span className="text-slate-600">{trainingSuggestion.description}</span>
              <a
                href={trainingSuggestion.href}
                className="rounded-xl border border-slate-900 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Start
              </a>
            </div>
          ) : (
            <div className="text-sm text-slate-600">Brak sugestii treningu na teraz.</div>
          )}
        </div>
      </section>

      <section className="tile-frame">
        <div className="tile-core p-6 space-y-4">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Twoje wyniki</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Nauczone dziś</div>
              <div
                className={`text-3xl font-semibold ${
                  (extended?.learned?.today?.length ?? 0) > 0 ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {extended?.learned?.today?.length ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Do nauczenia</div>
              <div className="text-3xl font-semibold text-slate-900">
                {extended?.toLearn?.total?.length ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Nauczone ogółem</div>
              <div className="text-3xl font-semibold text-slate-900">
                {extended?.learned?.total?.length ?? 0}
              </div>
            </div>
          </div>
        </div>
      </section>

      {onboardingStatus && !onboardingStatus.completed ? (
        <section className="tile-frame">
          <div className="tile-core p-6 space-y-4">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Co trenować</div>
              <div className="text-lg font-semibold text-slate-900">Proste propozycje na start</div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {onboardingSuggestions.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800 transition hover:bg-slate-50"
                >
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="text-xs text-slate-600">{item.description}</div>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="badges" className="tile-frame">
        <div className="tile-core p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Odznaki</div>
              <div className="text-lg font-semibold text-slate-900">Twoje osiągnięcia</div>
            </div>
          </div>
          {badges.length === 0 ? (
            <div className="text-sm text-slate-600">Brak dostępnych odznak.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {badges.map((badge) => (
                <div
                  key={badge.slug}
                  className={`rounded-xl border p-3 text-center ${
                    badge.earned
                      ? "border-slate-900 bg-slate-100 text-slate-900"
                      : "border-slate-300 bg-white text-slate-500"
                  }`}
                >
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white text-lg text-slate-700">
                    {renderBadgeIcon(badge)}
                  </div>
                  <div className="text-xs font-semibold">{badge.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="tile-frame">
        <div className="tile-core p-6 space-y-6">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Historia ćwiczeń</div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-sm font-medium text-slate-900">Skuteczność</div>
              <div className="text-xs text-slate-600">
                7 dni: {summary?.accuracy?.correct_7d ?? 0}/{summary?.accuracy?.total_7d ?? 0}
              </div>
              <div className="text-xs text-slate-600">
                14 dni: {summary?.accuracy?.correct_14d ?? 0}/{summary?.accuracy?.total_14d ?? 0}
              </div>
              <div className="text-xs text-slate-600">Ćwiczeń dziś: {summary?.todayCount ?? 0}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-sm font-medium text-slate-900">Do powtórki</div>
              {extended?.repeatSuggestions?.length ? (
                <ul className="space-y-2 text-xs text-slate-700">
                  {extended.repeatSuggestions.slice(0, 5).map((row) => (
                    <li key={row.term_en_norm} className="flex items-center justify-between">
                      <span>{row.term_en_norm}</span>
                      <span className="text-slate-500">{row.last_correct_at?.slice(0, 10)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-600">Brak sugestii powtórek.</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-sm font-medium text-slate-900">Najczęstsze błędy</div>
              {summary?.mostWrong?.length ? (
                <ul className="space-y-2 text-xs text-slate-700">
                  {summary.mostWrong.slice(0, 5).map((row) => (
                    <li key={row.term_en_norm} className="flex items-center justify-between">
                      <span>{row.term_en_norm}</span>
                      <span className="text-slate-500">{row.wrong_count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-600">Brak danych o błędach.</div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-sm font-medium text-slate-900">Ostatnie próby</div>
              {summary?.lastAttempts?.length ? (
                <ul className="space-y-2 text-xs text-slate-700">
                  {summary.lastAttempts.slice(0, 5).map((row, idx) => (
                    <li key={`${row.term_en_norm}-${idx}`} className="flex items-center justify-between">
                      <span>{row.term_en_norm}</span>
                      <span className={row.correct ? "text-slate-900 font-medium" : "text-rose-600"}>
                        {row.correct ? "OK" : "Błąd"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-600">Brak historii prób.</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
