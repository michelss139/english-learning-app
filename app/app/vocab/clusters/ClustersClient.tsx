"use client";

import { useMemo, useState } from "react";
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
  theory_available: boolean;
  patterns_count: number;
  examples_count: number;
  tasks_count: number;
  mastery: {
    practiced_days: number;
    stable_days: number;
    latest_activity_date: string | null;
    rolling_accuracy: number | null;
    mastery_state: "new" | "building" | "stable" | "mastered";
  };
};

export default function ClustersClient({ clusters }: { clusters: ClusterDto[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [togglingSlugs, setTogglingSlugs] = useState<Set<string>>(new Set());

  const [localPinned, setLocalPinned] = useState<Set<string>>(
    () => new Set(clusters.filter((c) => c.pinned).map((c) => c.slug)),
  );

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
        className={`absolute top-3 right-3 rounded-lg p-1.5 transition ${
          pinned
            ? "text-sky-600 hover:bg-sky-100 hover:text-sky-800"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        } ${isToggling ? "opacity-60" : ""}`}
        aria-pressed={pinned}
        aria-label={pinned ? "Odepnij" : "Przypnij"}
        title={pinned ? "Przypięte" : "Przypnij"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={pinned ? "" : "rotate-[-45deg]"}
        >
          <path d="M12 2v20" />
          <path d="M12 2l-4 4H4l2 8h4l2-4 2 4h4l2-8h-4z" />
        </svg>
      </button>
    );
  }

  function masteryLabel(cluster: ClusterDto) {
    switch (cluster.mastery.mastery_state) {
      case "mastered":
        return "Mamy to!";
      case "stable":
        return "Ten zestaw dobrze ci idzie!";
      case "building":
        return "Potrzebujesz jeszcze trochę praktyki.";
      default:
        return "Sprawdź to!";
    }
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
              className="relative rounded-2xl border-2 border-slate-900 bg-white p-4 hover:bg-slate-50 transition"
            >
              {pinUi(cluster.slug)}
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <h3 className="font-semibold text-slate-900">{cluster.title}</h3>
                <p className="text-xs text-slate-600">Zalecane</p>
                <p className="text-xs text-slate-500">
                  {cluster.tasks_count} zadań · {cluster.patterns_count} wzorce
                </p>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                  {masteryLabel(cluster)}
                </span>
              </div>
            </div>
          ))}

          {unlockableSorted.map((cluster) => (
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
              className="relative rounded-2xl border-2 border-slate-900 bg-white p-4 hover:bg-slate-50 transition"
            >
              {pinUi(cluster.slug)}
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <h3 className="font-semibold text-slate-900">{cluster.title}</h3>
                <p className="text-xs text-slate-600">Dostępne</p>
                <p className="text-xs text-slate-500">
                  {cluster.tasks_count} zadań · {cluster.patterns_count} wzorce
                </p>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                  {masteryLabel(cluster)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

