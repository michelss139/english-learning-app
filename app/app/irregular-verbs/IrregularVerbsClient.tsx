"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type IrregularVerbDto = {
  id: string;
  base: string;
  past_simple: string;
  past_simple_variants: string[];
  past_participle: string;
  past_participle_variants: string[];
  pinned: boolean;
};

export default function IrregularVerbsClient({ verbs }: { verbs: IrregularVerbDto[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

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
        v.past_participle.toLowerCase().includes(q)
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
      // rollback (only this action)
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

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Czasowniki nieregularne</h1>
            <p className="text-base text-emerald-100/80">
              Przypięte: <span className="font-medium text-white">{pinnedCount}</span> / {verbs.length}
            </p>
            {!canStart ? (
              <p className="text-sm text-emerald-100/60">Aby rozpocząć test, przypnij minimum 5 czasowników.</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app"
            >
              ← Panel ucznia
            </a>
            <button
              className="rounded-xl border-2 border-emerald-400/30 bg-emerald-400/10 px-4 py-2 font-medium text-emerald-100 hover:bg-emerald-400/20 transition disabled:opacity-60"
              onClick={() => {
                if (canStart) router.push("/app/irregular-verbs/train");
              }}
              disabled={!canStart}
            >
              Start testu ({pinnedCount})
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Szukaj czasownika (np. 'go', 'went', 'gone')..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-2 border-white/10 bg-black/10 px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
              onClick={() => selectRandom(5)}
              disabled={pinnedCount >= verbs.length || verbs.length === 0}
            >
              Losowe 5
            </button>
            <button
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
              onClick={() => selectRandom(10)}
              disabled={pinnedCount >= verbs.length || verbs.length === 0}
            >
              Losowe 10
            </button>
            {pinnedCount < verbs.length ? (
              <button
                className="rounded-xl border-2 border-emerald-400/30 bg-emerald-400/10 px-4 py-2 font-medium text-emerald-100 hover:bg-emerald-400/20 transition disabled:opacity-60"
                onClick={pinAll}
                disabled={pinnedCount >= verbs.length || verbs.length === 0}
              >
                Przypnij wszystkie
              </button>
            ) : null}
            {pinnedCount > 0 ? (
              <button
                className="rounded-xl border-2 border-rose-400/30 bg-rose-400/10 px-4 py-2 font-medium text-rose-100 hover:bg-rose-400/20 transition disabled:opacity-60"
                onClick={unpinAll}
                disabled={pinnedCount === 0}
              >
                Odepnij wszystkie
              </button>
            ) : null}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            {search ? "Nie znaleziono czasowników" : "Brak czasowników"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((verb) => {
              const pinned = isPinned(verb.id);
              const isToggling = togglingIds.has(verb.id);

              return (
                <div
                  key={verb.id}
                  className={`rounded-2xl border-2 p-4 transition ${
                    pinned ? "border-emerald-400/30 bg-emerald-400/10" : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold text-white">{verb.base}</div>
                        {pinned ? (
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2 py-0.5 text-xs font-medium text-emerald-100">
                            Przypięte
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm text-white/75">
                        <span className="font-medium">Past simple:</span> {verb.past_simple}
                        {verb.past_simple_variants.length > 0 && (
                          <span className="text-white/60"> ({verb.past_simple_variants.join(", ")})</span>
                        )}
                      </div>
                      <div className="text-sm text-white/75">
                        <span className="font-medium">Past participle:</span> {verb.past_participle}
                        {verb.past_participle_variants.length > 0 && (
                          <span className="text-white/60"> ({verb.past_participle_variants.join(", ")})</span>
                        )}
                      </div>
                    </div>

                    <label
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 font-medium transition select-none ${
                        pinned
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
                          : "border-white/15 bg-white/10 text-white hover:bg-white/15"
                      } ${isToggling ? "opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-emerald-400"
                        checked={pinned}
                        onChange={() => void togglePin(verb.id)}
                        disabled={isToggling}
                      />
                      <span className="text-sm">{pinned ? "Przypięty" : "Przypnij"}</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

