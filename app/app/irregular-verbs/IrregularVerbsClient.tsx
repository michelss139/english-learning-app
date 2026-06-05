"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type TrainMode = "both" | "past_simple" | "past_participle";

export type IrregularVerbDto = {
  id: string;
  base: string;
  past_simple: string;
  past_simple_variants: string[];
  past_participle: string;
  past_participle_variants: string[];
  pinned: boolean;
  translation_pl?: string | null;
  cefr_level?: string | null;
};

function cefrColor(level?: string | null): string {
  switch (level) {
    case "A1": return "bg-emerald-100 text-emerald-700";
    case "A2": return "bg-teal-100 text-teal-700";
    case "B1": return "bg-sky-100 text-sky-700";
    case "B2": return "bg-indigo-100 text-indigo-700";
    case "C1": return "bg-violet-100 text-violet-700";
    case "C2": return "bg-purple-100 text-purple-700";
    default:   return "bg-slate-100 text-slate-500";
  }
}

const TRAIN_MODES: { id: TrainMode; label: string; short: string }[] = [
  { id: "both", label: "Past Simple + Past Participle", short: "PS + PP" },
  { id: "past_simple", label: "Tylko Past Simple", short: "PS" },
  { id: "past_participle", label: "Tylko Past Participle", short: "PP" },
];

function PinIcon({ pinned, className }: { pinned: boolean; className?: string }) {
  if (pinned) {
    return (
      <svg
        className={className}
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M13.4 6.6 9.4 2.6a.8.8 0 0 0-1.2 0L7.5 3.3a.8.8 0 0 0 0 1.1L5.1 6.8 3.3 7a.8.8 0 0 0-.5 1.4l4.7 4.7c.5.5 1.3.2 1.4-.5l.2-1.7 2.5-2.5a.8.8 0 0 0 1.1 0l.7-.7a.8.8 0 0 0 0-1.1Z"
        />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VerbTile({
  verb,
  pinned,
  isToggling,
  onTogglePin,
}: {
  verb: IrregularVerbDto;
  pinned: boolean;
  isToggling: boolean;
  onTogglePin: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onTogglePin(verb.id)}
      disabled={isToggling}
      aria-pressed={pinned}
      aria-label={`${verb.base} (${verb.past_simple}, ${verb.past_participle})${pinned ? " — przypięty" : ""}`}
      className={`group relative flex w-full flex-col rounded-2xl border p-4 text-left transition-all duration-150 disabled:opacity-60 ${
        pinned
          ? "border-emerald-300/70 bg-emerald-50/60 shadow-sm shadow-emerald-100"
          : "border-slate-200/70 bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 hover:shadow-md"
      }`}
    >
      {/* Pin indicator */}
      <span
        aria-hidden="true"
        className={`absolute right-2.5 top-2.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-colors ${
          pinned
            ? "border-emerald-500/60 bg-emerald-500 text-white"
            : "border-slate-200 bg-white/80 text-slate-300 group-hover:border-slate-400 group-hover:text-slate-500"
        }`}
      >
        <PinIcon pinned={pinned} />
      </span>

      {/* CEFR + base form */}
      <div className="mb-3">
        {verb.cefr_level && (
          <span className={`mb-1.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${cefrColor(verb.cefr_level)}`}>
            {verb.cefr_level}
          </span>
        )}
        <div className="text-xl font-bold tracking-tight text-slate-900">
          {verb.base}
        </div>
        {verb.translation_pl && (
          <div className="mt-0.5 truncate text-xs text-slate-400">{verb.translation_pl}</div>
        )}
      </div>

      {/* Forms */}
      <div className="mt-auto space-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 shrink-0">Past</span>
          <span className="truncate text-sm font-medium text-slate-700">{verb.past_simple}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 shrink-0">PP</span>
          <span className="truncate text-sm font-medium text-slate-700">{verb.past_participle}</span>
        </div>
      </div>
    </button>
  );
}

export default function IrregularVerbsClient({ verbs }: { verbs: IrregularVerbDto[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [trainMode, setTrainMode] = useState<TrainMode>("both");

  const [localPinned, setLocalPinned] = useState<Set<string>>(
    () => new Set(verbs.filter((v) => v.pinned).map((v) => v.id)),
  );

  const pinnedCount = localPinned.size;
  const canStart = pinnedCount >= 5;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return verbs;
    return verbs.filter((v) => {
      return (
        v.base.toLowerCase().includes(q) ||
        v.past_simple.toLowerCase().includes(q) ||
        v.past_participle.toLowerCase().includes(q) ||
        (v.translation_pl ?? "").toLowerCase().includes(q)
      );
    });
  }, [verbs, search]);

  function isPinned(id: string) {
    return localPinned.has(id);
  }

  function optimisticToggle(id: string) {
    setLocalPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function togglePin(id: string) {
    if (togglingIds.has(id)) return;
    setError("");

    const before = new Set(localPinned);
    optimisticToggle(id);

    setTogglingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/irregular-verbs/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errData?.error ?? `HTTP ${res.status}`);
      }
    } catch (e: unknown) {
      setLocalPinned(before);
      setError(e instanceof Error ? e.message : "Nieznany błąd");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function selectRandom(count: number) {
    const unpinned = verbs.filter((v) => !localPinned.has(v.id));
    if (unpinned.length === 0) {
      setError("Wszystkie czasowniki są już przypięte");
      return;
    }
    setError("");
    const shuffled = [...unpinned].sort(() => Math.random() - 0.5);
    const toPin = shuffled.slice(0, Math.min(count, unpinned.length));
    toPin.forEach((v) => {
      void togglePin(v.id);
    });
  }

  function pinAll() {
    const unpinned = verbs.filter((v) => !localPinned.has(v.id));
    if (unpinned.length === 0) {
      setError("Wszystkie czasowniki są już przypięte");
      return;
    }
    setError("");
    unpinned.forEach((v) => {
      void togglePin(v.id);
    });
  }

  function unpinAll() {
    const pinned = verbs.filter((v) => localPinned.has(v.id));
    if (pinned.length === 0) {
      setError("Brak przypiętych czasowników");
      return;
    }
    setError("");
    pinned.forEach((v) => {
      void togglePin(v.id);
    });
  }

  const progressPercent = verbs.length > 0 ? Math.round((pinnedCount / verbs.length) * 100) : 0;

  return (
    <main className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Czasowniki nieregularne
          </h1>
          <p className="text-sm text-slate-600">
            Najedź na kafelek, aby zobaczyć past simple, past participle i tłumaczenie. Kliknij, aby
            przypiąć do treningu.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs font-medium text-slate-500">
              Przypięte:{" "}
              <span className="font-semibold text-slate-900">{pinnedCount}</span>
              <span className="text-slate-400"> / {verbs.length}</span>
            </span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full bg-slate-800 transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {!canStart && pinnedCount > 0 ? (
              <span className="text-[11px] font-medium text-slate-400">min. 5 do startu</span>
            ) : null}
          </div>
        </div>

        <Link
          href="/app/grammar"
          className="inline-flex items-center self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          ← Gramatyka
        </Link>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="sticky top-[5.5rem] z-20 -mx-1 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur sm:px-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="m11 11 3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Szukaj: 'go', 'went', 'iść'…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div
            role="radiogroup"
            aria-label="Tryb treningu"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1"
          >
            {TRAIN_MODES.map((m) => {
              const active = trainMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTrainMode(m.id)}
                  title={m.label}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {m.short}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => selectRandom(5)}
              disabled={pinnedCount >= verbs.length || verbs.length === 0}
            >
              Losowe 5
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => selectRandom(10)}
              disabled={pinnedCount >= verbs.length || verbs.length === 0}
            >
              Losowe 10
            </button>
            {pinnedCount < verbs.length ? (
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                onClick={pinAll}
                disabled={verbs.length === 0}
              >
                Wszystkie
              </button>
            ) : null}
            {pinnedCount > 0 ? (
              <button
                type="button"
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                onClick={unpinAll}
              >
                Wyczyść
              </button>
            ) : null}
            <button
              type="button"
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                canStart
                  ? "bg-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.2)] hover:bg-slate-800"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              }`}
              style={canStart ? { color: "#fff" } : undefined}
              onClick={() => {
                if (canStart) router.push(`/app/irregular-verbs/train?mode=${trainMode}`);
              }}
              disabled={!canStart}
              title={canStart ? "Rozpocznij test" : "Przypnij minimum 5 czasowników"}
            >
              Start ({pinnedCount}) →
            </button>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
          {search ? "Nie znaleziono czasowników." : "Brak czasowników."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((verb) => (
            <VerbTile
              key={verb.id}
              verb={verb}
              pinned={isPinned(verb.id)}
              isToggling={togglingIds.has(verb.id)}
              onTogglePin={togglePin}
            />
          ))}
        </div>
      )}
    </main>
  );
}
