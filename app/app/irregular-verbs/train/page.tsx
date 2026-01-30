"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

type Verb = {
  id: string;
  base: string;
  past_simple: string;
  past_simple_variants: string[];
  past_participle: string;
  past_participle_variants: string[];
};

type SubmitResult = {
  correct: boolean;
  past_simple_correct: boolean;
  past_participle_correct: boolean;
  correct_past_simple: string;
  correct_past_participle: string;
  entered_past_simple: string;
  entered_past_participle: string;
};

type AwardBadge = {
  slug: string;
  title: string;
  description: string | null;
};

type AwardResult = {
  xp_awarded: number;
  xp_total: number;
  level: number;
  xp_in_current_level: number;
  xp_to_next_level: number;
  newly_awarded_badges: AwardBadge[];
};

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function pill(tone: "neutral" | "good" | "bad") {
  if (tone === "good") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (tone === "bad") return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  return "border-white/15 bg-white/5 text-white/80";
}

export default function IrregularVerbsTrainPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentVerb, setCurrentVerb] = useState<Verb | null>(null);
  const [pastSimple, setPastSimple] = useState("");
  const [pastParticiple, setPastParticiple] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [sessionId, setSessionId] = useState("");
  const [sessionComplete, setSessionComplete] = useState(false);
  const [award, setAward] = useState<AwardResult | null>(null);
  const [xpAlreadyAwarded, setXpAlreadyAwarded] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState("");
  const [awardedSessionId, setAwardedSessionId] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session?.data?.session) {
          router.push("/login");
          return;
        }

        const prof = await getOrCreateProfile();
        setProfile(prof);

        await startNewSession();
      } catch (e: any) {
        setError(e?.message ?? "Błąd ładowania");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  const loadNextVerb = async (options?: { excludeIds?: string[] }) => {
    try {
      setError("");
      setResult(null);
      setPastSimple("");
      setPastParticiple("");

      const sess = await supabase.auth.getSession();
      const token = sess?.data?.session?.access_token;

      if (!token) {
        setError("Brak sesji. Zaloguj się ponownie.");
        return;
      }

      const excludeIds = options?.excludeIds ?? usedIds;
      const res = await fetch("/api/irregular-verbs/next", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ exclude_ids: excludeIds }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        if (res.status === 400 && errorData.error?.includes("No pinned")) {
          setError("Brak przypiętych czasowników. Wróć do listy i przypnij kilka czasowników.");
        } else if (res.status === 400 && errorData.error?.includes("All pinned verbs have been excluded")) {
          setSessionComplete(true);
          setCurrentVerb(null);
          return;
        } else {
          throw new Error(errorData.error || `HTTP ${res.status}`);
        }
        return;
      }

      const verb: Verb = await res.json();
      setCurrentVerb(verb);
      setUsedIds([...excludeIds, verb.id]);
    } catch (e: any) {
      setError(e?.message ?? "Błąd ładowania czasownika");
    }
  };

  const startNewSession = async () => {
    const newSessionId = createSessionId();
    setSessionId(newSessionId);
    setUsedIds([]);
    setStats({ correct: 0, total: 0 });
    setResult(null);
    setSessionComplete(false);
    setAward(null);
    setAwardError("");
    setAwardedSessionId("");
    setXpAlreadyAwarded(false);
    await loadNextVerb({ excludeIds: [] });
  };

  const handleSubmit = async () => {
    if (!currentVerb || submitting) return;

    if (!pastSimple.trim() || !pastParticiple.trim()) {
      setError("Wypełnij oba pola");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const sess = await supabase.auth.getSession();
      const token = sess?.data?.session?.access_token;

      if (!token) {
        setError("Brak sesji. Zaloguj się ponownie.");
        return;
      }

      const res = await fetch("/api/irregular-verbs/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          verb_id: currentVerb.id,
          entered_past_simple: pastSimple.trim(),
          entered_past_participle: pastParticiple.trim(),
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const submitResult: SubmitResult = await res.json();
      setResult(submitResult);
      setStats((prev) => ({
        correct: prev.correct + (submitResult.correct ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (e: any) {
      setError(e?.message ?? "Błąd sprawdzania odpowiedzi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    loadNextVerb();
  };

  useEffect(() => {
    const awardXp = async () => {
      if (!sessionComplete || !sessionId) return;
      if (awardedSessionId === sessionId) return;

      try {
        setAwarding(true);
        setAwardError("");

        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const token = session.data.session.access_token;
        const res = await fetch("/api/irregular-verbs/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errorData.error || "Nie udało się przyznać XP.");
        }

        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error || "Nie udało się przyznać XP.");
        }

        setAward({
          xp_awarded: data.xp_awarded ?? 0,
          xp_total: data.xp_total ?? 0,
          level: data.level ?? 0,
          xp_in_current_level: data.xp_in_current_level ?? 0,
          xp_to_next_level: data.xp_to_next_level ?? 0,
          newly_awarded_badges: data.newly_awarded_badges ?? [],
        });
        setXpAlreadyAwarded((data.xp_awarded ?? 0) === 0);
        setAwardedSessionId(sessionId);
      } catch (e: any) {
        setAwardError(e?.message ?? "Nie udało się przyznać XP.");
      } finally {
        setAwarding(false);
      }
    };

    void awardXp();
  }, [awardedSessionId, router, sessionComplete, sessionId]);

  if (loading) return <main>Ładuję…</main>;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Test czasowników nieregularnych</h1>
            <p className="text-sm text-white/75">
              Poprawne: <span className="font-medium text-white">{stats.correct}</span> / {stats.total}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app/irregular-verbs"
            >
              ← Lista
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
          {error}
        </div>
      ) : null}

      {sessionComplete ? (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">Sesja zakończona</h2>
            <span className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-sm font-semibold text-white">
              {stats.correct} / {stats.total}
            </span>
          </div>

          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 space-y-2">
            <div className="text-sm text-white/75">Postęp XP</div>
            {award ? (
              <div className="space-y-1 text-sm text-white/80">
                {xpAlreadyAwarded ? (
                  <div className="text-amber-100">
                    Już dostałeś XP za to ćwiczenie dziś. Wróć jutro, lub spróbuj innych ćwiczeń, aby dostać więcej XP!
                  </div>
                ) : (
                  <div>
                    Zdobyte XP: <span className="font-medium text-white">+{award.xp_awarded}</span>
                  </div>
                )}
                <div>
                  Poziom: <span className="font-medium text-white">{award.level}</span> · XP w poziomie:{" "}
                  <span className="font-medium text-white">
                    {award.xp_in_current_level}/{award.xp_to_next_level}
                  </span>
                </div>
              </div>
            ) : awarding ? (
              <div className="text-sm text-white/60">Przyznaję XP…</div>
            ) : awardError ? (
              <div className="text-sm text-rose-200">{awardError}</div>
            ) : (
              <div className="text-sm text-white/60">Brak danych o XP.</div>
            )}
          </div>

          {award?.newly_awarded_badges?.length ? (
            <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 p-4 space-y-2">
              <div className="text-sm font-semibold text-amber-100">Nowe odznaki</div>
              {award.newly_awarded_badges.map((badge) => (
                <div key={badge.slug} className="text-sm text-amber-100">
                  {badge.title}
                  {badge.description ? ` — ${badge.description}` : ""}
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl border-2 border-emerald-400/30 bg-emerald-400/10 px-4 py-3 font-medium text-emerald-100 hover:bg-emerald-400/20 transition"
              onClick={startNewSession}
            >
              Nowa sesja
            </button>
          </div>
        </section>
      ) : null}

      {!sessionComplete && currentVerb ? (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold text-white">{currentVerb.base}</div>
            <div className="text-sm text-white/60">Podaj formy czasownika</div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Past Simple</label>
              <input
                type="text"
                value={pastSimple}
                onChange={(e) => setPastSimple(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !result) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={!!result || submitting}
                className="w-full rounded-xl border-2 border-white/10 bg-black/10 px-4 py-3 text-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30 disabled:opacity-60"
                placeholder="np. went"
                autoFocus
              />
              {result && (
                <div className={`mt-2 rounded-xl border-2 p-3 ${pill(result.past_simple_correct ? "good" : "bad")}`}>
                  {result.past_simple_correct ? (
                    <span>✓ Poprawnie: {result.correct_past_simple}</span>
                  ) : (
                    <span>
                      ✗ Źle. Poprawna odpowiedź: <strong>{result.correct_past_simple}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Past Participle</label>
              <input
                type="text"
                value={pastParticiple}
                onChange={(e) => setPastParticiple(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !result) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={!!result || submitting}
                className="w-full rounded-xl border-2 border-white/10 bg-black/10 px-4 py-3 text-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30 disabled:opacity-60"
                placeholder="np. gone"
              />
              {result && (
                <div className={`mt-2 rounded-xl border-2 p-3 ${pill(result.past_participle_correct ? "good" : "bad")}`}>
                  {result.past_participle_correct ? (
                    <span>✓ Poprawnie: {result.correct_past_participle}</span>
                  ) : (
                    <span>
                      ✗ Źle. Poprawna odpowiedź: <strong>{result.correct_past_participle}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {result ? (
            <div className="space-y-3">
              <div className={`rounded-xl border-2 p-4 text-center ${pill(result.correct ? "good" : "bad")}`}>
                <div className="text-lg font-semibold">
                  {result.correct ? "✓ Wszystko poprawne!" : "✗ Spróbuj ponownie"}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-xl border-2 border-white/15 bg-white/10 px-4 py-3 font-medium text-white hover:bg-white/15 transition"
                  onClick={handleNext}
                >
                  Następny czasownik
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-xl border-2 border-emerald-400/30 bg-emerald-400/10 px-4 py-3 font-medium text-emerald-100 hover:bg-emerald-400/20 transition disabled:opacity-60"
                onClick={handleSubmit}
                disabled={submitting || !pastSimple.trim() || !pastParticiple.trim()}
              >
                {submitting ? "Sprawdzam…" : "Sprawdź"}
              </button>
            </div>
          )}
        </section>
      ) : null}

      {!sessionComplete && !currentVerb ? (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-6 text-center text-white/60">
          Brak czasowników do treningu. Wróć do listy i przypnij kilka czasowników.
        </section>
      ) : null}
    </main>
  );
}
