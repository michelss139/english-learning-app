"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getRandomAvatar, resolveAvatarUrl } from "@/lib/avatars";
import { subscribeTrainingCompleted } from "@/lib/events/trainingEvents";

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

type IntelligentSuggestions = {
  irregular:
    | {
        verbs: { id: string; base: string }[];
        total_problematic: number;
        href: string;
      }
    | null;
  packs: { slug: string; accuracy?: number | null; href: string }[];
  clusters: { slug: string; accuracy?: number | null; href: string }[];
};

type IntelligentSuggestionsResponse = {
  irregular:
    | {
        verbs: { id: string; base: string }[];
        total_problematic: number;
        href: string;
      }
    | null;
  packs: { slug: string; accuracy?: number | null; href: string }[];
  clusters: { slug: string; accuracy?: number | null; href: string }[];
};

function formatSlugLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAccuracy(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState("");

  const [xp, setXp] = useState<XpInfo | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [intelligentSuggestions, setIntelligentSuggestions] = useState<IntelligentSuggestions | null>(null);
  const [intelligentLoading, setIntelligentLoading] = useState(true);
  const [packIndex, setPackIndex] = useState(0);
  const [clusterIndex, setClusterIndex] = useState(0);
  const pendingPackRemovalsRef = useRef<Set<string>>(new Set());
  const pendingClusterRemovalsRef = useRef<Set<string>>(new Set());

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

        const [xpRes, streakRes, badgesRes, intelligentRes] = await Promise.all([
          fetch("/api/profile/xp", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/profile/streak", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/profile/badges", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/app/intelligent-suggestions-v2", { headers: { Authorization: `Bearer ${token}` } }),
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

        const intelligentJson = await intelligentRes.json().catch(() => null);
        if (intelligentRes.ok && intelligentJson) {
          setIntelligentSuggestions(intelligentJson as IntelligentSuggestions);
        } else {
          setIntelligentSuggestions(null);
        }
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać profilu.");
        setIntelligentSuggestions(null);
      } finally {
        setIntelligentLoading(false);
      }
    };

    run();
  }, [router]);

  useEffect(() => {
    const unsubscribe = subscribeTrainingCompleted((event) => {
      if (event.type === "pack") pendingPackRemovalsRef.current.add(event.slug);
      if (event.type === "cluster") pendingClusterRemovalsRef.current.add(event.slug);

      setIntelligentSuggestions((prev) => {
        if (!prev) return prev;

        if (event.type === "pack") {
          const nextPacks = prev.packs.filter((item) => item.slug !== event.slug);
          setPackIndex((idx) => {
            if (nextPacks.length === 0) return 0;
            if (idx >= nextPacks.length) return 0;
            return idx;
          });
          return { ...prev, packs: nextPacks };
        }

        if (event.type === "cluster") {
          const nextClusters = prev.clusters.filter((item) => item.slug !== event.slug);
          setClusterIndex((idx) => {
            if (nextClusters.length === 0) return 0;
            if (idx >= nextClusters.length) return 0;
            return idx;
          });
          return { ...prev, clusters: nextClusters };
        }

        return { ...prev, irregular: null };
      });

      setIntelligentLoading(false);

      void (async () => {
        try {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          if (!token) return;

          const res = await fetch("/api/app/intelligent-suggestions-v2", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const json = (await res.json().catch(() => null)) as IntelligentSuggestionsResponse | null;
          if (!res.ok || !json) return;

          const nextPacks = json.packs.filter((p) => !pendingPackRemovalsRef.current.has(p.slug));
          const nextClusters = json.clusters.filter((c) => !pendingClusterRemovalsRef.current.has(c.slug));

          setIntelligentSuggestions((prev) => {
            if (!prev) return { ...json, packs: nextPacks, clusters: nextClusters };
            return {
              ...json,
              packs: nextPacks,
              clusters: nextClusters,
              irregular: event.type === "irregular" ? null : json.irregular,
            };
          });
          setPackIndex((idx) => {
            const nextCount = nextPacks.length;
            if (nextCount <= 0) return 0;
            if (idx >= nextCount) return 0;
            return idx;
          });
          setClusterIndex((idx) => {
            const nextCount = nextClusters.length;
            if (nextCount <= 0) return 0;
            if (idx >= nextCount) return 0;
            return idx;
          });
        } catch {
          // Keep optimistic state when refetch fails.
        }
      })();
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
  const irregularVerbs = intelligentSuggestions?.irregular?.verbs ?? [];
  const irregularPreview = irregularVerbs.slice(0, 6).map((v) => v.base);
  const irregularRemaining = Math.max(irregularVerbs.length - irregularPreview.length, 0);
  const packs = intelligentSuggestions?.packs ?? [];
  const clusters = intelligentSuggestions?.clusters ?? [];
  const currentPack = packs.length > 0 ? packs[packIndex % packs.length] : null;
  const currentCluster = clusters.length > 0 ? clusters[clusterIndex % clusters.length] : null;
  const allSuggestionsEmpty = irregularVerbs.length === 0 && packs.length === 0 && clusters.length === 0;

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

      {intelligentLoading ? (
        <section className="tile-frame">
          <div className="tile-core p-6 space-y-4">
            <div className="text-sm uppercase tracking-[0.14em] text-slate-500">Twój plan na teraz</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
              <div className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
              <div className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
            </div>
          </div>
        </section>
      ) : null}

      {!intelligentLoading ? (
        <section className="tile-frame">
          <div className="tile-core p-6 space-y-4">
            <div className="text-sm uppercase tracking-[0.14em] text-slate-500">Twój plan na teraz</div>
            {allSuggestionsEmpty ? (
              <div className="mx-auto w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-700">
                  Wszystko gra. Wybierz dowolne ćwiczenie i idź dalej.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href="/app/vocab/packs"
                    className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Packs
                  </a>
                  <a
                    href="/app/vocab/clusters"
                    className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Clusters
                  </a>
                  <a
                    href="/app/irregular-verbs"
                    className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Irregular
                  </a>
                </div>
              </div>
            ) : null}
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
              <div className="w-full space-y-3 rounded-xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-[2px] hover:shadow-md">
                <div className="text-sm font-semibold text-slate-900">Irregular Verbs</div>
                {irregularVerbs.length === 0 ? (
                  <div className="text-sm text-slate-600">Wszystko gra — brak zaległości w Irregular Verbs.</div>
                ) : (
                  <>
                    <div className="text-sm text-slate-700">
                      Te czasowniki sprawiają trudność: {irregularPreview.join(", ")}
                      {irregularRemaining > 0 ? `, +${irregularRemaining}` : ""}
                    </div>
                    <a
                      href={intelligentSuggestions?.irregular?.href ?? "/app/irregular-verbs/train?focus=auto"}
                      className="inline-flex rounded-xl border border-slate-900 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                    >
                      Powtórz
                    </a>
                    <div className="text-xs text-slate-500">Wybrane automatycznie (max 10)</div>
                  </>
                )}
              </div>

              <div className="w-full space-y-3 rounded-xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-[2px] hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Packs</div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Poprzedni pack"
                      disabled={packs.length <= 1}
                      onClick={() => setPackIndex((i) => (packs.length <= 1 ? 0 : (i - 1 + packs.length) % packs.length))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      &#8249;
                    </button>
                    <button
                      type="button"
                      aria-label="Następny pack"
                      disabled={packs.length <= 1}
                      onClick={() => setPackIndex((i) => (packs.length <= 1 ? 0 : (i + 1) % packs.length))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      &#8250;
                    </button>
                  </div>
                </div>
                {currentPack ? (
                  <>
                    <div className="text-sm text-slate-700">{formatSlugLabel(currentPack.slug)}</div>
                    <div className="text-sm text-slate-600">Skuteczność: {formatAccuracy(currentPack.accuracy)}</div>
                    <a
                      href={currentPack.href}
                      className="inline-flex rounded-xl border border-slate-900 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                    >
                      Powtórz pack
                    </a>
                    <div className="text-xs text-slate-500">
                      {packs.length > 0 ? `${(packIndex % packs.length) + 1} / ${packs.length}` : "0 / 0"}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-600">Wszystko gra — brak packów do powtórki.</div>
                )}
              </div>

              <div className="w-full space-y-3 rounded-xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-[2px] hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Clusters</div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Poprzedni cluster"
                      disabled={clusters.length <= 1}
                      onClick={() =>
                        setClusterIndex((i) => (clusters.length <= 1 ? 0 : (i - 1 + clusters.length) % clusters.length))
                      }
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      &#8249;
                    </button>
                    <button
                      type="button"
                      aria-label="Następny cluster"
                      disabled={clusters.length <= 1}
                      onClick={() => setClusterIndex((i) => (clusters.length <= 1 ? 0 : (i + 1) % clusters.length))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      &#8250;
                    </button>
                  </div>
                </div>
                {currentCluster ? (
                  <>
                    <div className="text-sm text-slate-700">{formatSlugLabel(currentCluster.slug)}</div>
                    <div className="text-sm text-slate-600">Skuteczność: {formatAccuracy(currentCluster.accuracy)}</div>
                    <a
                      href={currentCluster.href}
                      className="inline-flex rounded-xl border border-slate-900 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                    >
                      Powtórz kontrast
                    </a>
                    <div className="text-xs text-slate-500">
                      {clusters.length > 0 ? `${(clusterIndex % clusters.length) + 1} / ${clusters.length}` : "0 / 0"}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-600">Wszystko gra — brak kontrastów do powtórki.</div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
