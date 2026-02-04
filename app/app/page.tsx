"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import { resolveAvatarUrl } from "@/lib/avatars";
import { DashboardSection } from "@/components/dashboard/Section";
import { DashboardTile } from "@/components/dashboard/Tile";

type Badge = {
  slug: string;
  title: string;
  icon: string | null;
  earned: boolean;
};

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

type OnboardingState = {
  step1: boolean;
  step2: boolean;
  step3: boolean;
  dismissed: boolean;
  active: boolean;
  showCompletion: boolean;
};

export default function StudentDashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string>("");
  const [badges, setBadges] = useState<Badge[]>([]);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState>({
    step1: false,
    step2: false,
    step3: false,
    dismissed: false,
    active: false,
    showCompletion: false,
  });
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [onboardingError, setOnboardingError] = useState("");

  const displayName = profile?.username || profile?.email || "-";
  const avatarSrc = resolveAvatarUrl(profile?.avatar_url, profile?.id ?? profile?.email ?? "");
  const streakCount = streak?.last_activity_date ? streak?.current_streak ?? 0 : 0;
  const streakLine =
    streakCount > 0
      ? `To twój ${streakCount} dzień nauki!`
      : "To twój 0 dzień nauki! Zrób ćwiczenie, aby rozpocząć serię!";
  const tooltipText =
    "Seria aktualizuje się po zakończeniu przynajmniej jednego ćwiczenia danego dnia.";
  const badgeSlots = badges.slice(0, 4);
  const showOnboarding = onboarding.active && !onboarding.dismissed;

  const renderBadgeContent = (badge: Badge) => {
    if (!badge.icon) return badge.title?.slice(0, 1) || "★";
    if (badge.icon.startsWith("http") || badge.icon.startsWith("/")) {
      return <img src={badge.icon} alt="" className="h-6 w-6" />;
    }
    return badge.icon;
  };

  const dismissOnboarding = () => {
    if (!profile || typeof window === "undefined") return;
    const storageKey = `onboarding:${profile.id}`;
    const stored = localStorage.getItem(storageKey);
    let parsed: Record<string, any> = {};
    if (stored) {
      try {
        parsed = JSON.parse(stored);
      } catch {
        parsed = {};
      }
    }
    const next = { ...parsed, dismissed: true, dismissed_at: Date.now() };
    localStorage.setItem(storageKey, JSON.stringify(next));
    setOnboarding((prev) => ({ ...prev, dismissed: true, showCompletion: false }));
  };

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const token = session.data.session.access_token;
        const p = await getOrCreateProfile();
        if (!p) {
          router.push("/login");
          return;
        }

        if (p.role === "admin") {
          router.push("/admin");
          return;
        }

        setProfile(p);

        const [badgesRes, streakRes, suggestionRes, onboardingRes] = await Promise.all([
          fetch("/api/profile/badges", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/profile/streak", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/app/suggestion", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/app/onboarding-status", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const badgesJson = await badgesRes.json().catch(() => null);
        if (badgesRes.ok && badgesJson?.ok) {
          setBadges((badgesJson.badges ?? []) as Badge[]);
        }

        const streakJson = await streakRes.json().catch(() => null);
        if (streakRes.ok && streakJson?.ok) {
          setStreak({
            current_streak: streakJson.current_streak ?? 0,
            best_streak: streakJson.best_streak ?? 0,
            last_activity_date: streakJson.last_activity_date ?? null,
          });
        } else {
          setStreak({ current_streak: 0, best_streak: 0, last_activity_date: null });
        }

        const suggestionJson = await suggestionRes.json().catch(() => null);
        if (suggestionRes.ok && suggestionJson?.ok) {
          setSuggestion(suggestionJson.suggestion ?? null);
        }

        const onboardingJson = await onboardingRes.json().catch(() => null);
        if (onboardingRes.ok && onboardingJson?.ok && typeof window !== "undefined") {
          setOnboardingError("");
          const storageKey = `onboarding:${p.id}`;
          const stored = localStorage.getItem(storageKey);
          let parsed: Record<string, any> = {};
          if (stored) {
            try {
              parsed = JSON.parse(stored);
            } catch {
              parsed = {};
            }
          }

          const step1 = Boolean(parsed.step1) || Boolean(onboardingJson.steps?.packs);
          const step2 = Boolean(parsed.step2) || Boolean(onboardingJson.steps?.clusters);
          const step3 = Boolean(parsed.step3) || Boolean(onboardingJson.steps?.irregular);
          const completed = step1 && step2 && step3;
          const serverCompleted = Boolean(onboardingJson.completed);
          const wasDismissed = Boolean(parsed.dismissed);
          const dismissedAt = Number(parsed.dismissed_at ?? 0);
          // Local dismiss hides banner for 24h unless server says completed.
          const dismissalExpired = Date.now() - dismissedAt > 24 * 60 * 60 * 1000;
          const active = Boolean(parsed.active) || Boolean(onboardingJson.is_new_user);
          const showCompletion = completed && !wasDismissed;
          const dismissed = serverCompleted ? true : wasDismissed && !dismissalExpired;

          const nextState = {
            step1,
            step2,
            step3,
            dismissed,
            active,
            showCompletion: serverCompleted ? false : showCompletion,
          };

          setOnboarding(nextState);
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              step1,
              step2,
              step3,
              dismissed,
              active,
              dismissed_at: dismissed ? dismissedAt || Date.now() : null,
            })
          );

          if (nextState.active && !step1 && !serverCompleted) {
            setSuggestion({
              title: "Fiszki: Sklep",
              description: "5 pytań • kierunek PL → EN",
              href: "/app/vocab/pack/shop?limit=5&direction=pl-en&autostart=1",
            });
          }

          if (process.env.NODE_ENV === "development") {
            console.log("[onboarding] server", onboardingJson);
            console.log("[onboarding] local", parsed);
            console.log("[onboarding] nextState", nextState);
          }
        } else if (!onboardingRes.ok) {
          setOnboardingError("Nie udało się wczytać onboardingu.");
        }
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
        setOnboardingLoading(false);
      }
    };

    run();
  }, [router]);

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6">
          <div className="text-sm text-emerald-100/70">Ładuję dashboard…</div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <header className="rounded-3xl border-2 border-emerald-100/10 bg-gradient-to-br from-[#0f2d1c] via-[#123524] to-[#0b2015] p-6 shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-100/60">LANGBracket</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Witaj, {displayName}</h1>
            <p className="text-sm text-emerald-100/70">Wybierz moduł i kontynuuj naukę.</p>
            <div className="flex items-center gap-2 text-sm text-emerald-100/80">
              <span>
                To twój{" "}
                <span className="text-base font-semibold text-emerald-100">{streakCount}</span>{" "}
                dzień nauki!
                {streakCount === 0 ? " Zrób ćwiczenie, aby rozpocząć serię!" : null}
              </span>
              <span className="group relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-300 text-xs font-bold text-black">
                ?
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  {tooltipText}
                </span>
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 sm:w-auto sm:items-end">
            <div className="w-full rounded-2xl border border-emerald-100/10 bg-emerald-950/50 p-4 sm:w-[260px]">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Twoje odznaki</div>
              <div className="mt-3 flex items-center gap-2">
                {badgeSlots.map((badge) => (
                  <div
                    key={badge.slug}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold ${
                      badge.earned
                        ? "border-emerald-200/30 bg-emerald-400/15 text-emerald-100"
                        : "border-white/10 bg-white/5 text-white/50"
                    }`}
                  >
                    {renderBadgeContent(badge)}
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 4 - badgeSlots.length) }).map((_, idx) => (
                  <div
                    key={`placeholder-${idx}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-white/40"
                  >
                    ★
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => router.push("/app/profile#badges")}
                className="mt-3 text-xs font-medium text-emerald-100/80 hover:text-emerald-100"
              >
                Zobacz wszystkie →
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => router.push("/app/profile")}
                className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-3 py-2 hover:bg-white/10 transition"
                type="button"
              >
                <img
                  src={avatarSrc}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover border border-white/20"
                />
                <span className="text-sm font-medium text-white">Mój profil</span>
              </button>
              <a
                className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium hover:bg-white/15 transition"
                href="/app/vocab"
              >
                Trening słówek
              </a>
              <a className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-medium hover:bg-white/10 transition" href="/logout">
                Wyloguj
              </a>
            </div>
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

      {onboardingLoading ? (
        <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6">
          <div className="text-sm text-emerald-100/70">Sprawdzam onboarding…</div>
        </section>
      ) : null}

      {onboardingError ? (
        <section className="rounded-3xl border-2 border-amber-200/20 bg-amber-400/10 p-6">
          <div className="text-sm text-amber-100">{onboardingError}</div>
        </section>
      ) : null}

      {showOnboarding ? (
        <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6 space-y-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Onboarding</div>
            <h2 className="text-xl font-semibold text-white">Zacznij w 3 krokach</h2>
            <p className="text-sm text-emerald-100/70">
              Zrób pierwsze sesje i uruchom swoją serię.
            </p>
          </div>
          <div className="space-y-3">
            {[
              {
                id: 1,
                title: "Zrób pierwszą sesję fiszek (5 pytań)",
                done: onboarding.step1,
                href: "/app/vocab/pack/shop?limit=5&direction=pl-en&autostart=1",
              },
              {
                id: 2,
                title: "Zrób 1 test z Typowych błędów",
                done: onboarding.step2,
                href: "/app/vocab/clusters",
              },
              {
                id: 3,
                title: "Zrób Irregular Verbs (min 5)",
                done: onboarding.step3,
                href: "/app/irregular-verbs/train",
              },
            ].map((step) => (
              <div
                key={step.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                      step.done
                        ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
                        : "border-white/15 bg-white/5 text-white/60"
                    }`}
                  >
                    {step.done ? "✓" : step.id}
                  </span>
                  <span className="text-sm text-white">{step.title}</span>
                </div>
                <a
                  href={step.href}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    step.done
                      ? "border-white/10 bg-white/5 text-white/50 cursor-not-allowed"
                      : "border-emerald-200/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
                  }`}
                  aria-disabled={step.done}
                >
                  {step.done ? "Zrobione" : "Start"}
                </a>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={dismissOnboarding}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
          >
            Schowaj
          </button>
        </section>
      ) : null}

      {onboarding.showCompletion ? (
        <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6 space-y-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Gratulacje</div>
            <h2 className="text-xl font-semibold text-white">Twoja seria zaczęła się!</h2>
            <p className="text-sm text-emerald-100/70">
              Spróbuj teraz kolejnych modułów i buduj regularność.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-400/20 transition"
              href="/app/vocab/packs"
            >
              Fiszki
            </a>
            <a
              className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-400/20 transition"
              href="/app/vocab/clusters"
            >
              Typowe błędy
            </a>
            <a
              className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-400/20 transition"
              href="/app/irregular-verbs"
            >
              Irregular Verbs
            </a>
          </div>
          <button
            type="button"
            onClick={dismissOnboarding}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
          >
            Zamknij onboarding
          </button>
        </section>
      ) : null}

      <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Zacznij trenować</div>
            <h2 className="text-2xl font-semibold text-white">Zacznij trenować już teraz!</h2>
            <p className="text-sm text-emerald-100/70">
              {suggestion?.description ?? "Wybierz gotową sugestię ćwiczenia i rozpocznij sesję."}
            </p>
            {suggestion ? (
              <div className="text-sm text-emerald-100/80">{suggestion.title}</div>
            ) : null}
          </div>
          <a
            href={suggestion?.href ?? "/app/vocab/packs"}
            className="rounded-xl border-2 border-emerald-200/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/20 transition"
          >
            Start →
          </a>
        </div>
      </section>

      <DashboardSection title="Słownictwo" description="Najważniejsze moduły do codziennych powtórek.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DashboardTile
            title="Moja pula"
            description="Twoje własne słówka i treningi w jednym miejscu."
            href="/app/vocab"
            badge={<span className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-100">MVP</span>}
          />
          <DashboardTile
            title="Fiszki"
            description="Paczki słówek przygotowane tematycznie."
            href="/app/vocab/packs"
            badge={<span className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-100">NEW</span>}
          />
          <DashboardTile
            title="Typowe błędy"
            description="Clustery i najczęstsze pułapki językowe."
            href="/app/vocab/clusters"
            badge={<span className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-100">BETA</span>}
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Gramatyka" description="Utrwalaj reguły i struktury zdań.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DashboardTile
            title="Irregular Verbs"
            description="Trenuj formy czasowników nieregularnych."
            href="/app/irregular-verbs"
            badge={<span className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-100">MVP</span>}
          />
          <DashboardTile
            title="Tenses"
            description="Przegląd czasów gramatycznych."
            href="/app/grammar"
            badge={<span className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-100">MVP</span>}
          />
          <DashboardTile
            title="Stative verbs"
            description="Czasowniki statyczne i ich użycie."
            href="/app/grammar/stative-verbs"
            badge={<span className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-100">MVP</span>}
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Inne" description="Twoje kursy i lekcje.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DashboardTile
            title="Moje lekcje"
            description="Lista Twoich lekcji i postęp."
            href="/courses"
            badge={<span className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-100">MVP</span>}
          />
          <DashboardTile
            title="Kursy"
            description="Nowe kursy będą dodawane cyklicznie."
            href="/app/courses"
            disabled
            badge={<span className="rounded-xl border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-white/70">WKRÓTCE</span>}
          />
        </div>
      </DashboardSection>
    </main>
  );
}
