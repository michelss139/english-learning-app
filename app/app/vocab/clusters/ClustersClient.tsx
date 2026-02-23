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
        className={`rounded-lg border-2 px-2 py-1 text-xs font-medium transition ${
          pinned
            ? "border-sky-500 bg-sky-50 text-sky-800 hover:bg-sky-100"
            : "border-slate-900 bg-white text-slate-900 hover:bg-slate-50"
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
    <section className="rounded-3xl border-2 border-slate-900 bg-white p-5 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Clusters</h2>
          <p className="text-sm text-slate-600">Ćwicz wybór właściwego słowa w kontekście.</p>
        </div>
        <a
          href="/app/vocab"
          className="rounded-xl border-2 border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 hover:bg-slate-50 transition shrink-0"
        >
          ← Powrót
        </a>
      </div>

      {hasNewUnlock && (
        <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
          <p className="text-sm text-slate-700 font-medium">Nowe ćwiczenie dostępne!</p>
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
        <div className="text-sm text-slate-600">Brak dostępnych clusterów.</div>
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
              className="rounded-2xl border-2 border-slate-900 bg-white p-4 hover:bg-slate-50 transition"
            >
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <h3 className="font-semibold text-slate-900">{cluster.title}</h3>
                <p className="text-xs text-slate-600">Zalecane</p>
                <div className="flex items-center gap-2">
                  {pinUi(cluster.slug)}
                  <span className="px-2 py-0.5 rounded-lg border border-emerald-400 bg-emerald-50 text-xs text-slate-700">
                    Odblokowane
                  </span>
                </div>
              </div>
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
              className="rounded-2xl border-2 border-slate-900 bg-white p-4 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-disabled={!cluster.unlocked}
            >
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <h3 className="font-semibold text-slate-900">{cluster.title}</h3>
                <p className="text-xs text-slate-600">
                  {cluster.unlocked ? "Dostępne" : "Dodaj wszystkie słowa z tego clustera do puli, aby odblokować"}
                </p>
                <div className="flex items-center gap-2">
                  {pinUi(cluster.slug)}
                  {cluster.unlocked ? (
                    <span className="px-2 py-0.5 rounded-lg border border-emerald-400 bg-emerald-50 text-xs text-slate-700">
                      Odblokowane
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg border border-amber-400 bg-amber-50 text-xs text-amber-800">
                      Zablokowane
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

