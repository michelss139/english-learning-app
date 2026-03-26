"use client";

import Link from "next/link";
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

const cardBase =
  "rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]";

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

  function pinButton(slug: string) {
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
        className={`shrink-0 rounded-lg p-1.5 transition ${
          pinned
            ? "text-slate-700 hover:bg-slate-100"
            : "text-slate-300 hover:bg-slate-50 hover:text-slate-500"
        } ${isToggling ? "opacity-60" : ""}`}
        aria-pressed={pinned}
        aria-label={pinned ? "Odepnij" : "Przypnij"}
        title={pinned ? "Przypięte" : "Przypnij"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={pinned ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20" />
          <path d="M12 2l-4 4H4l2 8h4l2-4 2 4h4l2-8h-4z" />
        </svg>
      </button>
    );
  }

  function masteryBadge(cluster: ClusterDto) {
    const state = cluster.mastery.mastery_state;

    const config = {
      mastered: { label: "Opanowane", dot: "bg-slate-800", text: "text-slate-700" },
      stable: { label: "Dobrze idzie", dot: "bg-slate-500", text: "text-slate-600" },
      building: { label: "W trakcie", dot: "bg-slate-300", text: "text-slate-500" },
      new: { label: "Nowe", dot: "bg-slate-200", text: "text-slate-400" },
    }[state];

    return (
      <span className={`inline-flex items-center gap-1.5 ${config.text}`}>
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden />
        <span className="text-[10px] font-semibold">{config.label}</span>
      </span>
    );
  }

  function clusterCard(cluster: ClusterDto) {
    return (
      <li key={cluster.id}>
        <div
          onClick={() => router.push(`/app/vocab/cluster/${cluster.slug}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(`/app/vocab/cluster/${cluster.slug}`);
            }
          }}
          role="button"
          tabIndex={0}
          className="group/row flex h-full cursor-pointer flex-col justify-between rounded-xl border border-slate-100 px-4 py-3.5 transition-all duration-150 hover:border-slate-200 hover:bg-slate-50"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-medium text-slate-800">{cluster.title}</div>
            {pinButton(cluster.slug)}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              {cluster.tasks_count} zadań · {cluster.patterns_count} wzorców
            </span>
            {masteryBadge(cluster)}
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="origin-top scale-110">
      <header className="mb-5">
        <Link
          href="/app/vocab"
          className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
        >
          ← Słownictwo
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Typowe błędy</h1>
        <p className="mt-0.5 text-xs font-medium text-slate-400">Ćwicz wybór właściwego słowa w kontekście</p>
      </header>

      {error ? (
        <div className="mb-5 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
          <p className="text-sm text-rose-700">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      {clusters.length === 0 ? (
        <div className={cardBase}>
          <p className="text-sm text-slate-400">Brak dostępnych zestawów.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {recommendedSorted.length > 0 ? (
            <section className={cardBase}>
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                Zalecane
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {recommendedSorted.map((c) => clusterCard(c))}
              </ul>
            </section>
          ) : null}

          {unlockableSorted.length > 0 ? (
            <section className={cardBase}>
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                Dostępne
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unlockableSorted.map((c) => clusterCard(c))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
