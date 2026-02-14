"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

type IrregularVerb = {
  id: string;
  base: string;
  past_simple: string;
  past_simple_variants: string[];
  past_participle: string;
  past_participle_variants: string[];
  pinned: boolean;
};

export default function IrregularVerbsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [verbs, setVerbs] = useState<IrregularVerb[]>([]);
  const [search, setSearch] = useState("");
  const [loadingVerbs, setLoadingVerbs] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const pinnedCount = verbs.filter((v) => v.pinned).length;
  const canStart = pinnedCount >= 5;

  const filteredVerbs = verbs.filter((v) => {
    if (!search.trim()) return true;
    const query = search.trim().toLowerCase();
    return (
      v.base.toLowerCase().includes(query) ||
      v.past_simple.toLowerCase().includes(query) ||
      v.past_participle.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const prof = await getOrCreateProfile();
        setProfile(prof);

        await loadVerbs();
      } catch (e: any) {
        setError(e?.message ?? "Błąd ładowania");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  const loadVerbs = async () => {
    try {
      setLoadingVerbs(true);
      setError("");
      const sess = await supabase.auth.getSession();
      const token = sess?.data?.session?.access_token;

      if (!token) {
        setError("Brak sesji. Zaloguj się ponownie.");
        return;
      }

      const url = search.trim() ? `/api/irregular-verbs/list?search=${encodeURIComponent(search.trim())}` : "/api/irregular-verbs/list";
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("[irregular-verbs] Loaded verbs:", data.verbs?.length || 0);
      setVerbs(data.verbs || []);
      if (!data.verbs || data.verbs.length === 0) {
        setError("Nie znaleziono czasowników w bazie. Sprawdź czy migracja została wykonana.");
      }
    } catch (e: any) {
      console.error("[irregular-verbs] Error loading verbs:", e);
      setError(e?.message ?? "Błąd ładowania czasowników");
    } finally {
      setLoadingVerbs(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadVerbs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, profile]);

  const togglePin = async (verbId: string) => {
    if (togglingIds.has(verbId)) return;

    try {
      setTogglingIds((prev) => new Set(prev).add(verbId));
      setError("");
      const sess = await supabase.auth.getSession();
      const token = sess?.data?.session?.access_token;

      if (!token) {
        setError("Brak sesji. Zaloguj się ponownie.");
        return;
      }

      const res = await fetch("/api/irregular-verbs/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ verb_id: verbId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      // Refresh verbs to update pinned status
      await loadVerbs();
    } catch (e: any) {
      setError(e?.message ?? "Błąd przypinania");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(verbId);
        return next;
      });
    }
  };

  const selectRandom = async (count: number) => {
    const unpinned = verbs.filter((v) => !v.pinned);
    if (unpinned.length === 0) {
      setError("Wszystkie czasowniki są już przypięte");
      return;
    }

    if (verbs.length === 0) {
      setError("Brak czasowników do wyboru. Spróbuj odświeżyć stronę.");
      return;
    }

    try {
      setError("");
      const shuffled = [...unpinned].sort(() => Math.random() - 0.5);
      const toPin = shuffled.slice(0, Math.min(count, unpinned.length));

      // Pin all selected verbs sequentially to avoid race conditions
      // Note: togglePin already calls loadVerbs() at the end, but we'll refresh once at the end
      for (const verb of toPin) {
        await togglePin(verb.id);
      }

      // Final refresh to ensure all pins are reflected
      await loadVerbs();
    } catch (e: any) {
      console.error("[irregular-verbs] Error in selectRandom:", e);
      setError(e?.message ?? "Błąd przypinania losowych czasowników");
    }
  };

  const selectRandom5 = () => selectRandom(5);
  const selectRandom10 = () => selectRandom(10);

  const unpinAll = async () => {
    const pinned = verbs.filter((v) => v.pinned);
    if (pinned.length === 0) {
      setError("Brak przypiętych czasowników");
      return;
    }

    try {
      setError("");
      // Unpin all pinned verbs sequentially
      for (const verb of pinned) {
        await togglePin(verb.id);
      }

      // Final refresh to ensure all unpins are reflected
      await loadVerbs();
    } catch (e: any) {
      console.error("[irregular-verbs] Error in unpinAll:", e);
      setError(e?.message ?? "Błąd odpinania czasowników");
    }
  };

  const pinAll = async () => {
    const unpinned = verbs.filter((v) => !v.pinned);
    if (unpinned.length === 0) {
      setError("Wszystkie czasowniki są już przypięte");
      return;
    }

    if (verbs.length === 0) {
      setError("Brak czasowników do przypięcia. Spróbuj odświeżyć stronę.");
      return;
    }

    try {
      setError("");
      // Pin all unpinned verbs sequentially
      for (const verb of unpinned) {
        await togglePin(verb.id);
      }

      // Final refresh to ensure all pins are reflected
      await loadVerbs();
    } catch (e: any) {
      console.error("[irregular-verbs] Error in pinAll:", e);
      setError(e?.message ?? "Błąd przypinania czasowników");
    }
  };

  if (loading) return <main>Ładuję…</main>;

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
                if (canStart) {
                  router.push("/app/irregular-verbs/train");
                }
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
              onClick={selectRandom5}
              disabled={pinnedCount >= verbs.length || verbs.length === 0}
            >
              Losowe 5
            </button>
            <button
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
              onClick={selectRandom10}
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

        {loadingVerbs ? (
          <div className="text-center py-8 text-white/60">Ładuję czasowniki…</div>
        ) : filteredVerbs.length === 0 ? (
          <div className="text-center py-8 text-white/60 space-y-2">
            <div>{search ? "Nie znaleziono czasowników" : "Brak czasowników"}</div>
            {verbs.length === 0 && !search && (
              <div className="text-sm text-white/50">
                Jeśli widzisz ten komunikat, sprawdź czy migracja SQL została wykonana w Supabase.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVerbs.map((verb) => {
              const isToggling = togglingIds.has(verb.id);
              const variantsInfo = [];
              if (verb.past_simple_variants.length > 0) {
                variantsInfo.push(`past simple: ${verb.past_simple_variants.join(", ")}`);
              }
              if (verb.past_participle_variants.length > 0) {
                variantsInfo.push(`past participle: ${verb.past_participle_variants.join(", ")}`);
              }

              return (
                <div
                  key={verb.id}
                  className={`rounded-2xl border-2 p-4 transition ${
                    verb.pinned
                      ? "border-emerald-400/30 bg-emerald-400/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold text-white">{verb.base}</div>
                        {verb.pinned ? (
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

                    <button
                      className={`rounded-xl border-2 px-4 py-2 font-medium transition disabled:opacity-60 ${
                        verb.pinned
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
                          : "border-white/15 bg-white/10 text-white hover:bg-white/15"
                      }`}
                      onClick={() => togglePin(verb.id)}
                      disabled={isToggling}
                    >
                      {isToggling ? "…" : verb.pinned ? "Odepnij" : "Przypnij"}
                    </button>
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
