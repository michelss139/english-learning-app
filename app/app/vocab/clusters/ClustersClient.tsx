"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ClusterDto = {
  id: string;
  slug: string;
  title: string;
  is_recommended: boolean;
  is_unlockable: boolean;
  unlocked: boolean;
  unlocked_at: string | null;
  pinned: boolean;
};

export default function ClustersClient({
  clusters,
  newlyUnlockedSlugs,
}: {
  clusters: ClusterDto[];
  newlyUnlockedSlugs: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [hasNewUnlock, setHasNewUnlock] = useState(false);
  const [togglingSlugs, setTogglingSlugs] = useState<Set<string>>(new Set());

  const [localPinned, setLocalPinned] = useState<Set<string>>(
    () => new Set(clusters.filter((c) => c.pinned).map((c) => c.slug)),
  );

  useEffect(() => {
    if (newlyUnlockedSlugs.length > 0) {
      setHasNewUnlock(true);
      const t = setTimeout(() => setHasNewUnlock(false), 10000);
      return () => clearTimeout(t);
    }
  }, [newlyUnlockedSlugs]);

  const recommended = useMemo(
    () => clusters.filter((c) => c.is_recommended),
    [clusters],
  );
  const unlockable = useMemo(
    () => clusters.filter((c) => c.is_unlockable),
    [clusters],
  );

  const recommendedSorted = useMemo(() => {
    return [...recommended].sort((a, b) => Number(localPinned.has(b.slug)) - Number(localPinned.has(a.slug)));
  }, [recommended, localPinned]);

  const unlockableSorted = useMemo(() => {
    return [...unlockable].sort((a, b) => Number(localPinned.has(b.slug)) - Number(localPinned.has(a.slug)));
  }, [unlockable, localPinned]);

  function optimisticToggle(slug: string) {
    setLocalPinned((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function togglePin(slug: string) {
    if (togglingSlugs.has(slug)) return;
    setError("");

    const before = new Set(localPinned);
    optimisticToggle(slug);

    setTogglingSlugs((prev) => new Set(prev).add(slug));
    try {
      const res = await fetch("/api/vocab/clusters/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errData?.error ?? `HTTP ${res.status}`);
      }
    } catch (e: unknown) {
      setLocalPinned(before);
      setError(e instanceof Error ? e.message : "Nieznany błąd");
    } finally {
      setTogglingSlugs((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
  }

  function pinUi(slug: string) {
    const pinned = localPinned.has(slug);
    const isToggling = togglingSlugs.has(slug);

    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void togglePin(slug);
        }}
        disabled={isToggling}
        className={`rounded-lg border px-2 py-1 text-xs font-medium transition ${
          pinned
            ? "border-sky-400/30 bg-sky-400/15 text-sky-100 hover:bg-sky-400/20"
            : "border-white/15 bg-white/10 text-white hover:bg-white/15"
        } ${isToggling ? "opacity-60" : ""}`}
        aria-pressed={pinned}
        aria-label={pinned ? "Odepnij cluster" : "Przypnij cluster"}
        title={pinned ? "Przypięte" : "Przypnij"}
      >
        {pinned ? "✔" : "＋"}
      </button>
    );
  }

  return (
    <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Clusters</h2>
        <p className="text-sm text-white/75">Ćwicz wybór właściwego słowa w kontekście.</p>
      </div>

      {hasNewUnlock && (
        <div className="rounded-2xl border-2 border-emerald-400/30 bg-emerald-400/10 p-4">
          <p className="text-sm text-emerald-100 font-medium">Nowe ćwiczenie dostępne!</p>
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4">
          <p className="text-sm text-rose-100">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      {clusters.length === 0 ? (
        <div className="text-sm text-white/75">Brak dostępnych clusterów.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recommendedSorted.map((cluster) => (
            <div
              key={cluster.id}
              onClick={() => router.push(`/app/vocab/cluster/${cluster.slug}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/app/vocab/cluster/${cluster.slug}`);
                }
              }}
              role="button"
              tabIndex={0}
              className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-white">{cluster.title}</h3>
                <div className="flex items-center gap-2">
                  {pinUi(cluster.slug)}
                  <span className="px-2 py-0.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-xs text-emerald-200">
                    Odblokowane
                  </span>
                </div>
              </div>
              <p className="text-xs text-white/60">Zalecane</p>
            </div>
          ))}

          {unlockableSorted.map((cluster) => (
            <div
              key={cluster.id}
              onClick={() => {
                if (cluster.unlocked) router.push(`/app/vocab/cluster/${cluster.slug}`);
              }}
              onKeyDown={(e) => {
                if (!cluster.unlocked) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/app/vocab/cluster/${cluster.slug}`);
                }
              }}
              role="button"
              tabIndex={cluster.unlocked ? 0 : -1}
              className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-disabled={!cluster.unlocked}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-white">{cluster.title}</h3>
                <div className="flex items-center gap-2">
                  {pinUi(cluster.slug)}
                  {cluster.unlocked ? (
                    <span className="px-2 py-0.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-xs text-emerald-200">
                      Odblokowane
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg border border-amber-400/30 bg-amber-400/10 text-xs text-amber-200">
                      Zablokowane
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-white/60">
                {cluster.unlocked ? "Dostępne" : "Dodaj wszystkie słowa z tego clustera do puli, aby odblokować"}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

