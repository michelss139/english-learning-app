"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

type MasteryState = ClusterDto["mastery"]["mastery_state"];

const cardBase =
  "rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5";

const MASTERY_CONFIG: Record<MasteryState, { pct: number; color: string; label: string }> = {
  new: { pct: 0, color: "#cbd5e1", label: "Nowe" },
  building: { pct: 0.34, color: "#f59e0b", label: "W trakcie" },
  stable: { pct: 0.67, color: "#0ea5e9", label: "Dobrze idzie" },
  mastered: { pct: 1, color: "#10b981", label: "Opanowane" },
};

const MASTERY_ORDER: MasteryState[] = ["new", "building", "stable", "mastered"];

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Pierścień postępu, który wypełnia się wraz z opanowaniem klastra. */
function MasteryRing({ state, size = 20 }: { state: MasteryState; size?: number }) {
  const cfg = MASTERY_CONFIG[state];
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <span className="shrink-0" title={cfg.label} aria-label={cfg.label}>
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r={r} fill="none" stroke="#e2e8f0" strokeWidth="2" />
        {state === "mastered" ? (
          <>
            <circle cx="10" cy="10" r={r} fill="none" stroke={cfg.color} strokeWidth="2" />
            <path
              d="M6.6 10.2l2.1 2.1 4.1-4.5"
              stroke={cfg.color}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : cfg.pct > 0 ? (
          <circle
            cx="10"
            cy="10"
            r={r}
            fill="none"
            stroke={cfg.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${c * cfg.pct} ${c}`}
            transform="rotate(-90 10 10)"
          />
        ) : null}
      </svg>
    </span>
  );
}

function ClusterTile({ cluster }: { cluster: ClusterDto }) {
  return (
    <Link
      href={`/app/vocab/cluster/${cluster.slug}`}
      className="group/row flex flex-col gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3.5 transition-all duration-150 hover:-translate-y-px hover:border-slate-200 hover:bg-slate-50 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-center gap-2.5">
        <MasteryRing state={cluster.mastery.mastery_state} size={23} />
        <span className="min-w-0 flex-1 truncate text-base font-medium text-slate-800">{cluster.title}</span>
        <ChevronRight className="shrink-0 text-slate-300 transition-colors group-hover/row:text-slate-500" />
      </div>
      <span className="pl-[33px] text-[13px] font-medium tabular-nums text-slate-400">
        {cluster.tasks_count} zadań · {cluster.patterns_count} wzorców
      </span>
    </Link>
  );
}

export default function ClustersClient({ clusters }: { clusters: ClusterDto[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Pułapki</h1>
      </header>

      {clusters.length === 0 ? (
        <div className={cardBase}>
          <p className="text-sm text-slate-400">Brak dostępnych zestawów.</p>
        </div>
      ) : (
        <section className={cardBase}>
          {/* Legenda 4 stanów */}
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {MASTERY_ORDER.map((state) => (
              <span key={state} className="inline-flex items-center gap-1.5">
                <MasteryRing state={state} size={18} />
                <span className="text-[13px] font-medium text-slate-500">{MASTERY_CONFIG[state].label}</span>
              </span>
            ))}
          </div>

          {/* Siatka klastrów */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {clusters.map((cluster, i) => (
              <div
                key={cluster.id}
                className={`transition-all duration-300 ${mounted ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
                style={{ transitionDelay: `${Math.min(i * 35, 350)}ms` }}
              >
                <ClusterTile cluster={cluster} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
