"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { emitTrainingCompleted } from "@/lib/events/trainingEvents";

export type Verb = {
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

type SessionSummary = {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  started_at?: string | null;
  finished_at?: string | null;
  wrong_items?: Array<{
    prompt: string | null;
    expected: string | null;
  }>;
};

function pill(tone: "neutral" | "good" | "bad") {
  if (tone === "good") return "border-emerald-400 bg-emerald-50 text-emerald-800";
  if (tone === "bad") return "border-rose-400 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function IrregularVerbsTrainClient(props: { assignmentId: string }) {
  const router = useRouter();
  const assignmentId = props.assignmentId;

  const [error, setError] = useState("");
  const [startLoading, setStartLoading] = useState(true);

  const [currentVerb, setCurrentVerb] = useState<Verb | null>(null);
  const [pastSimple, setPastSimple] = useState("");
  const [pastParticiple, setPastParticiple] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [retryQueue, setRetryQueue] = useState<{ verb: Verb; delay: number }[]>([]);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [sessionId, setSessionId] = useState("");
  const [sessionComplete, setSessionComplete] = useState(false);
  const [award, setAward] = useState<AwardResult | null>(null);
  const [xpAlreadyAwarded, setXpAlreadyAwarded] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState("");
  const [awardedSessionId, setAwardedSessionId] = useState("");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [assignmentToast, setAssignmentToast] = useState("");
  const assignmentCompleteRef = useRef(false);
  const pastSimpleInputRef = useRef<HTMLInputElement>(null);

  const summaryTotal = summary?.total ?? stats.total;
  const summaryCorrect = summary?.correct ?? stats.correct;
  const summaryWrong = summary?.wrong ?? Math.max(summaryTotal - summaryCorrect, 0);
  const summaryAccuracy = summary?.accuracy ?? (summaryTotal ? summaryCorrect / summaryTotal : 0);

  const startSessionWithApi = useCallback(async () => {
    setStartLoading(true);
    setError("");

    try {
      const res = await fetch("/api/training/irregular/start", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start session");
      }

      const data = await res.json();

      setSessionId(data.sessionId);
      setCurrentVerb(data.firstVerb);
      setUsedIds(data.firstVerb ? [data.firstVerb.id] : []);
      setRetryQueue([]);
      setSessionComplete(false);
      setStats({ correct: 0, total: 0 });
      setResult(null);
      setAward(null);
      setAwardError("");
      setAwardedSessionId("");
      setXpAlreadyAwarded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się rozpocząć sesji.");
      setCurrentVerb(null);
    } finally {
      setStartLoading(false);
    }
  }, []);

  useEffect(() => {
    startSessionWithApi();
  }, [startSessionWithApi]);

  const loadNextVerb = async (options?: { excludeIds?: string[] }) => {
    try {
      setError("");
      setResult(null);
      setPastSimple("");
      setPastParticiple("");

      // retryQueue disabled: session length must be fixed and deterministic

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
    await startSessionWithApi();
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
        const token = session.data.session?.access_token;
        if (!token) return;
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
        setSummary(data.summary ?? null);
        setXpAlreadyAwarded((data.xp_awarded ?? 0) === 0);
        setAwardedSessionId(sessionId);
        emitTrainingCompleted({ type: "irregular" });

        if (assignmentId && !assignmentCompleteRef.current) {
          try {
            const completeRes = await fetch(`/api/lessons/assignments/${assignmentId}/complete`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                session_id: sessionId,
                exercise_type: "irregular",
                context_slug: null,
              }),
            });
            if (completeRes.ok) {
              const completeData = await completeRes.json();
              if (completeData.ok) {
                assignmentCompleteRef.current = true;
                setAssignmentToast("Zadanie z lekcji oznaczone jako wykonane ✅");
              }
            }
          } catch (e) {
            console.warn("[irregular] assignment complete failed", e);
          }
        }
      } catch (e: any) {
        setAwardError(e?.message ?? "Nie udało się przyznać XP.");
      } finally {
        setAwarding(false);
      }
    };

    void awardXp();
  }, [assignmentId, awardedSessionId, router, sessionComplete, sessionId]);

  useEffect(() => {
    if (!assignmentToast) return;
    const timer = setTimeout(() => setAssignmentToast(""), 4000);
    return () => clearTimeout(timer);
  }, [assignmentToast]);

  useEffect(() => {
    if (currentVerb && !result) {
      pastSimpleInputRef.current?.focus();
    }
  }, [currentVerb?.id, result]);


  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Test czasowników nieregularnych</h1>
            <p className="text-base text-slate-600">
              Poprawne: <span className="font-medium text-slate-900">{stats.correct}</span> / {stats.total}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="tile-frame"
              href="/app/irregular-verbs"
            >
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Lista
              </span>
            </a>
            <a
              className="tile-frame"
              href="/app"
            >
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Wróć do strony głównej
              </span>
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <div className="flex flex-col gap-3">
            <div>{error}</div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-900/90 hover:bg-white/10 transition"
                onClick={startNewSession}
              >
                Spróbuj ponownie
              </button>
              <a
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-900/90 hover:bg-white/10 transition"
                href="/app"
              >
                Wróć do strony głównej
              </a>
            </div>
          </div>
        </div>
      ) : null}
      {assignmentToast ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
          {assignmentToast}
        </div>
      ) : null}

      {sessionComplete ? (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Sesja zakończona</h2>
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900">
              {summaryCorrect} / {summaryTotal}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="text-sm text-slate-600">Podsumowanie sesji</div>
            <div className="text-sm text-slate-700">
              Poprawne: <span className="font-medium text-slate-900">{summaryCorrect}</span> / {summaryTotal}
            </div>
            <div className="text-sm text-slate-700">
              Skuteczność:{" "}
              <span className="font-medium text-slate-900">{summaryTotal ? Math.round(summaryAccuracy * 100) : 0}%</span>{" "}
              · Błędne: <span className="font-medium text-slate-900">{summaryWrong}</span>
            </div>
            {summary?.wrong_items?.length ? (
              <div className="text-sm text-slate-600">
                Najczęstsze błędy:
                <ul className="mt-2 space-y-1 text-slate-700">
                  {summary.wrong_items.slice(0, 10).map((item, idx) => (
                    <li key={`${item.prompt ?? "?"}-${idx}`}>
                      {item.prompt ?? "—"} → {item.expected ?? "—"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="text-sm text-slate-600">Postęp XP</div>
            {award ? (
              <div className="space-y-1 text-sm text-slate-700">
                {xpAlreadyAwarded ? (
                  <div className="text-amber-700">
                    Już dostałeś XP za to ćwiczenie dziś. Wróć jutro, lub spróbuj innych ćwiczeń, aby dostać więcej XP!
                  </div>
                ) : (
                  <div>
                    Zdobyte XP: <span className="font-medium text-slate-900">+{award.xp_awarded}</span>
                  </div>
                )}
                <div>
                  Poziom: <span className="font-medium text-slate-900">{award.level}</span> · XP w poziomie:{" "}
                  <span className="font-medium text-slate-900">
                    {award.xp_in_current_level}/{award.xp_to_next_level}
                  </span>
                </div>
              </div>
            ) : awarding ? (
              <div className="text-sm text-slate-500">Przyznaję XP…</div>
            ) : awardError ? (
              <div className="text-sm text-rose-200">{awardError}</div>
            ) : (
              <div className="text-sm text-slate-500">Brak danych o XP.</div>
            )}
          </div>

          {award?.newly_awarded_badges?.length ? (
            <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 p-4 space-y-2">
              <div className="text-sm font-semibold text-amber-700">Nowe odznaki</div>
              {award.newly_awarded_badges.map((badge) => (
                <div key={badge.slug} className="text-sm text-amber-700">
                  {badge.title}
                  {badge.description ? ` — ${badge.description}` : ""}
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-slate-900 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
              onClick={startNewSession}
            >
              Jeszcze raz to samo
            </button>
            <button
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 cursor-not-allowed"
              disabled
            >
              Jeszcze raz tylko błędne (Wkrótce)
            </button>
            <a
              className="rounded-xl border border-slate-900 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
              href="/app"
            >
              Wróć do strony głównej
            </a>
          </div>
        </section>
      ) : null}

      {!sessionComplete && currentVerb ? (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold text-slate-900">{currentVerb.base}</div>
            <div className="text-sm text-slate-500">Podaj formy czasownika</div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Past Simple</label>
              <input
                type="text"
                value={pastSimple}
                onChange={(e) => {
                  if (submitting || result) return;
                  setPastSimple(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (submitting) return;
                  if (!result) handleSubmit();
                  else handleNext();
                }}
                readOnly={!!result || submitting}
                aria-readonly={!!result || submitting}
                className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 ${
                  result || submitting ? "opacity-60" : ""
                }`}
                ref={pastSimpleInputRef}
                autoFocus
              />
              {result && (() => {
                const pastSimpleCorrect = result.past_simple_correct ?? false;
                return (
                  <div className={`mt-2 rounded-xl border-2 p-3 ${pill(pastSimpleCorrect ? "good" : "bad")}`}>
                    {pastSimpleCorrect ? (
                      <span>Past Simple ✓</span>
                    ) : (
                      <span>
                        Past Simple ✗ (poprawna: <strong>{currentVerb.past_simple}</strong>)
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Past Participle</label>
              <input
                type="text"
                value={pastParticiple}
                onChange={(e) => {
                  if (submitting || result) return;
                  setPastParticiple(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (submitting) return;
                  if (!result) handleSubmit();
                  else handleNext();
                }}
                readOnly={!!result || submitting}
                aria-readonly={!!result || submitting}
                className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 ${
                  result || submitting ? "opacity-60" : ""
                }`}
              />
              {result && (() => {
                const pastParticipleCorrect = result.past_participle_correct ?? false;
                return (
                  <div className={`mt-2 rounded-xl border-2 p-3 ${pill(pastParticipleCorrect ? "good" : "bad")}`}>
                    {pastParticipleCorrect ? (
                      <span>Past Participle ✓</span>
                    ) : (
                      <span>
                        Past Participle ✗ (poprawna: <strong>{currentVerb.past_participle}</strong>)
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {result ? (
            <div className="space-y-3">
              <div className={`rounded-xl border-2 p-4 text-center ${pill(result.correct ? "good" : "bad")}`}>
                <div className="text-lg font-semibold">
                  {result.correct
                    ? "✓ Poprawnie"
                    : (result.past_simple_correct ?? false) !== (result.past_participle_correct ?? false)
                      ? "Prawie! Jedna forma jest poprawna."
                      : "✗ Błąd"}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-slate-900 bg-white px-4 py-3 font-medium text-slate-900 hover:bg-slate-50 transition"
                  onClick={handleNext}
                >
                  Następny czasownik
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-xl border border-slate-900 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
                onClick={handleSubmit}
                disabled={submitting || !pastSimple.trim() || !pastParticiple.trim()}
              >
                {submitting ? "Sprawdzam…" : "Sprawdź"}
              </button>
            </div>
          )}
        </section>
      ) : null}

      {startLoading ? (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 text-center text-slate-500">
          Ładowanie sesji…
        </section>
      ) : null}
      {!startLoading && !sessionComplete && !currentVerb ? (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 text-center text-slate-500">
          Brak czasowników do treningu. Wróć do listy i przypnij kilka czasowników.
        </section>
      ) : null}
    </main>
  );
}
