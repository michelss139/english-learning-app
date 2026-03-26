"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getRandomAvatar, resolveAvatarUrl } from "@/lib/avatars";
import { subscribeTrainingCompleted } from "@/lib/events/trainingEvents";
import {
  buildDisplayCards,
  type TrainingDisplayCard,
  type TrainingSuggestion,
} from "@/lib/suggestions/trainingDisplayCards";
import { FALLBACK_TRAINING_CARDS } from "@/lib/suggestions/trainingFallbackCards";

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

type Suggestion = TrainingSuggestion;

type SuggestionsResponse = {
  top: Suggestion[];
  list: Suggestion[];
};

function formatIrregularItemLabel(s: Suggestion): string {
  const label = s.label ?? s.unitId;
  const formLabel =
    s.form === "past_simple" ? "past simple" : s.form === "past_participle" ? "past participle" : "";
  return formLabel ? `${label} (${formLabel})` : label;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState("");

  const [xp, setXp] = useState<XpInfo | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [suggestionsTop, setSuggestionsTop] = useState<Suggestion[]>([]);
  const [suggestionsList, setSuggestionsList] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [activeSessionHref, setActiveSessionHref] = useState<string | null>(null);
  const [lockedTrainingOptions, setLockedTrainingOptions] = useState<TrainingDisplayCard[] | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;

        const prof = await getOrCreateProfile();
        if (!prof) {
          setError("Nie udało się wczytać profilu.");
          return;
        }

        setProfile({
          id: prof.id,
          email: prof.email ?? null,
          username: prof.username ?? null,
          avatar_url: prof.avatar_url ?? null,
        });
        if (!prof.avatar_url) {
          const randomAvatar = getRandomAvatar();
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: randomAvatar })
            .eq("id", prof.id);
          if (!updateError) {
            setProfile((prev) => (prev ? { ...prev, avatar_url: randomAvatar } : prev));
          }
        }

        const [xpRes, streakRes, badgesRes, recRes] = await Promise.all([
          fetch("/api/profile/xp", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/profile/streak", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/profile/badges", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/suggestions", { headers: { Authorization: `Bearer ${token}` } }),
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

        const recJson = (await recRes.json().catch(() => null)) as Partial<SuggestionsResponse> | null;
        if (recRes.ok && recJson && typeof recJson === "object") {
          setSuggestionsTop(Array.isArray(recJson.top) ? recJson.top : []);
          setSuggestionsList(Array.isArray(recJson.list) ? recJson.list : []);
        } else {
          setSuggestionsTop([]);
          setSuggestionsList([]);
        }
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać profilu.");
        setSuggestionsTop([]);
        setSuggestionsList([]);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    run();
  }, [router]);

  useEffect(() => {
    const unsubscribe = subscribeTrainingCompleted(async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;

        setActiveSessionHref(null);
        setLockedTrainingOptions(null);
        const res = await fetch("/api/suggestions", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as Partial<SuggestionsResponse> | null;
        if (res.ok && json && typeof json === "object") {
          setSuggestionsTop(Array.isArray(json.top) ? json.top : []);
          setSuggestionsList(Array.isArray(json.list) ? json.list : []);
        }
      } catch {
        // ignore
      }
    });

    return unsubscribe;
  }, []);

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
  const recentBadges = badges.slice(0, 3);
  const trainingPanelOptions = useMemo(() => {
    if (suggestionsLoading) return [];
    const useFallback = suggestionsTop.length === 0;
    const raw = useFallback ? FALLBACK_TRAINING_CARDS : buildDisplayCards(suggestionsTop, suggestionsList);
    const seen = new Set<string>();
    return raw.filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  }, [suggestionsLoading, suggestionsTop, suggestionsList]);

  const displayedTrainingOptions = lockedTrainingOptions ?? trainingPanelOptions;

  const handleTrainingStart = (item: TrainingDisplayCard) => {
    setActiveSessionHref(item.href);
    const base = lockedTrainingOptions ?? trainingPanelOptions;
    setLockedTrainingOptions(
      base.map((o) => ({
        ...o,
        irregularItems: o.irregularItems ? [...o.irregularItems] : undefined,
      })),
    );
    router.push(item.href);
  };

  const renderBadgeIcon = (badge: Badge) => {
    if (badge.icon && (badge.icon.startsWith("/") || badge.icon.startsWith("http"))) {
      return <img src={badge.icon} alt="" className="h-8 w-8" />;
    }
    if (badge.icon) return badge.icon;
    return badge.title?.slice(0, 1) || "★";
  };

  return (
    <main className="space-y-6">
      <header className="px-1 py-1">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Oto Twój postęp, {profile?.username || profile?.email || "Użytkowniku"}!
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>
                To Twój <span className="text-base font-semibold text-slate-900">{currentStreak}</span> dzień nauki!
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
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <a
              href="/app/profile/badges"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <span>Moje odznaki</span>
              {recentBadges.length > 0 ? (
                <span className="inline-flex items-center gap-1">
                  {recentBadges.map((badge) => (
                    <span
                      key={badge.slug}
                      className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-slate-50 text-xs text-slate-700"
                      aria-hidden
                    >
                      {renderBadgeIcon(badge)}
                    </span>
                  ))}
                </span>
              ) : null}
            </a>
            <a
              href="/app"
              className="inline-flex w-52 items-center justify-center rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ← Powrót do strony głównej
            </a>
          </div>
        </div>
      </header>

      <section className="tile-frame">
        <div className="tile-core p-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <img src={avatarSrc} alt="" className="h-20 w-20 rounded-full border-2 border-slate-300 object-cover" />
              <div>
                <div className="text-sm text-slate-500">
                  {profile?.username || profile?.email || "Użytkowniku"}
                </div>
                <div className="text-4xl font-semibold text-slate-900">{xp?.level ?? 0}</div>
                <div className="text-xs text-slate-500">Poziom</div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-sm text-slate-600">Postęp do następnego poziomu</div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-slate-700" style={{ width: `${xpPercent}%` }} />
              </div>
              <div className="text-xs text-slate-500">
                {xpInLevel}/{xpToNext} XP do następnego poziomu
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="space-y-1 text-left lg:text-right">
                <div className="text-sm text-slate-600">Rekord serii</div>
                <div className="text-lg font-semibold text-slate-900">{bestStreak} dni</div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
        <div className="tile-core mx-auto w-full max-w-5xl space-y-6 p-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Co trenować</h2>

          {suggestionsLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-36 rounded-xl border border-slate-200 bg-slate-50/80 animate-pulse" />
              <div className="h-36 rounded-xl border border-slate-200 bg-slate-50/80 animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedTrainingOptions.map((item) => {
                const isActive = item.href === activeSessionHref;
                return (
                  <div
                    key={item.href}
                    className={`flex flex-col rounded-xl border bg-white p-5 transition-all duration-200 ${
                      isActive
                        ? "border-slate-900 shadow-[0_2px_12px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/10"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-[0_2px_10px_rgba(15,23,42,0.05)]"
                    }`}
                  >
                    <div className="text-sm font-semibold leading-tight text-slate-900">{item.title}</div>
                    <div className="mt-1 text-xs leading-snug text-slate-600">{item.description}</div>
                    {item.irregularItems && item.irregularItems.length > 0 ? (
                      <ul className="mt-2 space-y-0.5 pl-3 text-[11px] leading-snug text-slate-600">
                        {item.irregularItems.map((s, i) => (
                          <li key={`${s.unitId}:${s.form}:${i}`}>• {formatIrregularItemLabel(s)}</li>
                        ))}
                      </ul>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleTrainingStart(item)}
                      className="mt-4 inline-flex w-fit rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition duration-200 hover:bg-slate-50"
                    >
                      Start
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
