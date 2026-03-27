"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { emitTrainingCompleted } from "@/lib/events/trainingEvents";
import { useCurrentWord } from "@/lib/coach/CurrentWordContext";
import { TypewriterText } from "@/lib/coach/TypewriterText";

export type Verb = {
  id: string;
  base: string;
  past_simple: string;
  past_simple_variants: string[];
  past_participle: string;
  past_participle_variants: string[];
};

type TargetForm = "past_simple" | "past_participle";
type SessionForm = TargetForm | "both";

type TargetItem = {
  verbId: string;
  form: TargetForm;
};

type SessionItem = {
  verb: Verb;
  form: SessionForm;
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

export type TrainMode = "both" | "past_simple" | "past_participle";
type StartMode = "manual" | "targeted";

function InlineResultGlyph({ ok }: { ok: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium leading-none ${
        ok
          ? "border-green-500/40 text-green-600/80"
          : "border-red-500/40 text-red-500/75"
      }`}
      aria-hidden
    >
      {ok ? "✓" : "✕"}
    </span>
  );
}

const VERB_TIPS: Record<string, string> = {
  sow: 'Ten czasownik ma formę past simple regularną, ale w past participle może być nieregularny, jako "sown". Jednak "sowed" jako past participle też jest akceptowany. Mamy tu do czynienia z "mixed verb".',
  sew: 'Ten czasownik ma formę past simple regularną, ale w past participle może być nieregularny, jako "sewn". Jednak "sewed" jako past participle też jest akceptowany. Mamy tu do czynienia z "mixed verb".',
  strike:
    'Istnieje też forma stricken i czasem jest stosowany w różnych wyrażeniach i teoretycznie może być kwalifikowany jako past participle, lecz w praktyce funkcjonuje jako przymiotnik.',
};

export default function IrregularVerbsTrainClient(props: {
  assignmentId: string;
  mode: TrainMode;
  startMode: StartMode;
  lessonVerbs?: string;
  /** UUID of lesson — show „Wróć do lekcji” after lesson-only micro-session. */
  returnLessonId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = props.assignmentId;
  const mode = props.mode;
  const startMode = props.startMode;
  const lessonVerbsRaw = (props.lessonVerbs ?? "").trim();
  const lessonVerbsList = useMemo(
    () => [...new Set(lessonVerbsRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))],
    [lessonVerbsRaw],
  );
  const wantsLessonVerbsSession = lessonVerbsList.length > 0;
  const returnLessonId = (props.returnLessonId ?? "").trim();
  const lessonReturnHref =
    wantsLessonVerbsSession && returnLessonId ? `/app/lessons/${encodeURIComponent(returnLessonId)}` : null;
  const { setCurrentIrregularVerbBase } = useCurrentWord();

  const [error, setError] = useState("");
  const [startLoading, setStartLoading] = useState(true);

  const [currentVerb, setCurrentVerb] = useState<Verb | null>(null);
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [sessionItemIndex, setSessionItemIndex] = useState(0);
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
  const pastParticipleInputRef = useRef<HTMLInputElement>(null);
  const targetsParam = searchParams.get("targets") ?? "";
  const parsedTargets = useMemo(() => {
    if (!targetsParam) return [] as TargetItem[];

    return targetsParam
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [verbId, form] = part.split(":");
        if (!verbId || (form !== "past_simple" && form !== "past_participle")) return null;
        return { verbId, form } satisfies TargetItem;
      })
      .filter((item): item is TargetItem => Boolean(item))
      .slice(0, 5);
  }, [targetsParam]);
  const wantsTargetedSession = startMode === "targeted";
  const isTargetedSession = wantsTargetedSession && parsedTargets.length > 0;
  const usesSessionQueue = isTargetedSession || wantsLessonVerbsSession;
  const currentSessionItem = usesSessionQueue ? sessionItems[sessionItemIndex] ?? null : null;
  const effectiveMode: TrainMode =
    currentSessionItem?.form === "both"
      ? mode
      : currentSessionItem?.form === "past_simple"
        ? "past_simple"
        : currentSessionItem?.form === "past_participle"
          ? "past_participle"
          : mode;
  const showPastSimple = effectiveMode === "both" || effectiveMode === "past_simple";
  const showPastParticiple = effectiveMode === "both" || effectiveMode === "past_participle";
  const modeLabel = wantsLessonVerbsSession
    ? "Ćwiczenie z lekcji (wybrane czasowniki)"
    : isTargetedSession
      ? "Sesja targetowana"
      : mode === "past_simple"
        ? "Tylko Past Simple"
        : mode === "past_participle"
          ? "Tylko Past Participle"
          : "Past Simple + Past Participle";

  const getEffectiveCorrect = (submitResult: SubmitResult) => {
    if (effectiveMode === "past_simple") return submitResult.past_simple_correct;
    if (effectiveMode === "past_participle") return submitResult.past_participle_correct;
    return submitResult.correct;
  };

  const canSubmit =
    (!showPastSimple || !!pastSimple.trim()) && (!showPastParticiple || !!pastParticiple.trim());

  const summaryTotal = summary?.total ?? stats.total;
  const summaryCorrect = summary?.correct ?? stats.correct;
  const summaryWrong = summary?.wrong ?? Math.max(summaryTotal - summaryCorrect, 0);
  const summaryAccuracy = summary?.accuracy ?? (summaryTotal ? summaryCorrect / summaryTotal : 0);

  const startSessionWithApi = useCallback(async () => {
    setStartLoading(true);
    setError("");

    try {
      if (wantsTargetedSession && parsedTargets.length === 0 && !wantsLessonVerbsSession) {
        throw new Error("Nieprawidłowa sesja targetowana. Brak poprawnych targetów.");
      }

      const payload =
        wantsLessonVerbsSession
          ? { startMode: "lesson_verbs" as const, mode, lessonVerbs: lessonVerbsList }
          : isTargetedSession
            ? { startMode: "targeted" as const, mode, targets: parsedTargets }
            : { startMode: "manual" as const, mode };

      const res = await fetch("/api/training/irregular/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start session");
      }

      const data = await res.json();

      setSessionId(data.sessionId);
      if (
        usesSessionQueue &&
        Array.isArray(data.sessionItems) &&
        data.sessionItems.length > 0
      ) {
        setSessionItems(data.sessionItems);
        setSessionItemIndex(0);
        setCurrentVerb(data.sessionItems[0]?.verb ?? null);
        setUsedIds([]);
      } else {
        setSessionItems([]);
        setSessionItemIndex(0);
        setCurrentVerb(data.firstVerb ?? null);
        setUsedIds(data.firstVerb ? [data.firstVerb.id] : []);
      }
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
  }, [
    isTargetedSession,
    mode,
    parsedTargets,
    usesSessionQueue,
    wantsLessonVerbsSession,
    lessonVerbsList,
    wantsTargetedSession,
  ]);

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

    if (!canSubmit) {
      setError(
        effectiveMode === "past_simple"
          ? "Wypełnij pole Past Simple"
          : effectiveMode === "past_participle"
            ? "Wypełnij pole Past Participle"
            : "Wypełnij oba pola"
      );
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
          entered_past_simple: showPastSimple ? pastSimple.trim() : "",
          entered_past_participle: showPastParticiple ? pastParticiple.trim() : "",
          session_id: sessionId,
          mode: effectiveMode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const submitResult: SubmitResult = await res.json();
      const effectiveCorrect = getEffectiveCorrect(submitResult);

      setResult(submitResult);
      setStats((prev) => ({
        correct: prev.correct + (effectiveCorrect ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (e: any) {
      setError(e?.message ?? "Błąd sprawdzania odpowiedzi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (sessionItems.length > 0) {
      const nextIndex = sessionItemIndex + 1;
      if (nextIndex >= sessionItems.length) {
        setSessionComplete(true);
        setCurrentVerb(null);
        return;
      }
      setError("");
      setResult(null);
      setPastSimple("");
      setPastParticiple("");
      setSessionItemIndex(nextIndex);
      setCurrentVerb(sessionItems[nextIndex]?.verb ?? null);
      return;
    }

    loadNextVerb();
  };

  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  useEffect(() => {
    if (!result || submitting || !currentVerb) return;
    const fullyCorrect =
      effectiveMode === "past_simple"
        ? !!(result.past_simple_correct ?? false)
        : effectiveMode === "past_participle"
          ? !!(result.past_participle_correct ?? false)
          : !!(result.correct ?? false);
    if (!fullyCorrect) return;
    const timer = window.setTimeout(() => handleNextRef.current(), 500);
    return () => window.clearTimeout(timer);
  }, [result, submitting, currentVerb?.id, effectiveMode]);

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

        if (data.isolated_lesson_verbs) {
          setAward(null);
          setSummary(data.summary ?? null);
          setXpAlreadyAwarded(false);
        } else {
          setAward({
            xp_awarded: data.xp_awarded ?? 0,
            xp_total: data.xp_total ?? 0,
            level: data.level ?? 0,
            xp_in_current_level: data.xp_in_current_level ?? 0,
            xp_to_next_level: data.xp_to_next_level ?? 0,
            newly_awarded_badges: data.newly_awarded_badges ?? [],
          });
          setSummary(
            effectiveMode === "both" && sessionItems.length === 0 ? (data.summary ?? null) : null,
          );
          setXpAlreadyAwarded((data.xp_awarded ?? 0) === 0);
        }
        setAwardedSessionId(sessionId);
        if (!wantsLessonVerbsSession) {
          emitTrainingCompleted({ type: "irregular" });
        }

        if (assignmentId && !wantsLessonVerbsSession && !assignmentCompleteRef.current) {
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
  }, [
    assignmentId,
    awardedSessionId,
    effectiveMode,
    router,
    sessionComplete,
    sessionId,
    sessionItems.length,
    wantsLessonVerbsSession,
  ]);

  useEffect(() => {
    if (!assignmentToast) return;
    const timer = setTimeout(() => setAssignmentToast(""), 4000);
    return () => clearTimeout(timer);
  }, [assignmentToast]);

  useEffect(() => {
    if (currentVerb && !result) {
      if (showPastSimple) pastSimpleInputRef.current?.focus();
      else if (showPastParticiple) pastParticipleInputRef.current?.focus();
    }
  }, [currentVerb?.id, result, showPastParticiple, showPastSimple]);

  useEffect(() => {
    if (currentVerb?.base && !sessionComplete) {
      setCurrentIrregularVerbBase(currentVerb.base);
    } else {
      setCurrentIrregularVerbBase(null);
    }
    return () => setCurrentIrregularVerbBase(null);
  }, [currentVerb?.base, sessionComplete, setCurrentIrregularVerbBase]);

  const showManualNext = Boolean(result && !getEffectiveCorrect(result));

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Test czasowników nieregularnych</h1>
            <p className="text-base text-slate-600">
              Poprawne: <span className="font-medium text-slate-900">{stats.correct}</span> / {stats.total}
            </p>
            <p className="text-sm text-slate-500">Tryb: {modeLabel}</p>
            {sessionItems.length > 0 ? (
              <p className="text-sm text-slate-500">
                Postęp: {sessionItemIndex + (currentVerb ? 1 : 0)} / {sessionItems.length}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <a className="tile-frame" href="/app/irregular-verbs">
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Wszystkie irregular verbs
              </span>
            </a>
            <a className="tile-frame" href="/app">
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Wróć do strony głównej
              </span>
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-700 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="text-sm">{error}</div>
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
            {wantsLessonVerbsSession ? null : <div className="text-sm text-slate-600">Postęp XP</div>}
            {wantsLessonVerbsSession ? (
              <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center">
                <p className="w-full sm:w-auto">Powtórzyłeś materiał z lekcji.</p>
                <button
                  type="button"
                  className="rounded-xl border border-slate-900 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  onClick={() => void startNewSession()}
                >
                  Jeszcze raz
                </button>
                <a
                  className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  href="/app"
                >
                  Wróć do strony głównej
                </a>
              </div>
            ) : award ? (
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
            {wantsLessonVerbsSession ? null : (
              <button
                className="rounded-xl border border-slate-900 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
                onClick={startNewSession}
              >
                Jeszcze raz to samo
              </button>
            )}
            {wantsLessonVerbsSession && lessonReturnHref ? (
              <a
                className="rounded-xl border border-slate-900 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
                href={lessonReturnHref}
              >
                Wróć do lekcji
              </a>
            ) : null}
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
            <div className="text-sm text-slate-500">
              {effectiveMode === "both"
                ? "Podaj formy czasownika"
                : effectiveMode === "past_simple"
                  ? "Podaj formę Past Simple"
                  : "Podaj formę Past Participle"}
            </div>
          </div>

          <div className="space-y-4">
            {showPastSimple ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Past Simple</label>
                <div className="flex items-center gap-3">
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
                      else if (showManualNext) handleNext();
                    }}
                    readOnly={!!result || submitting}
                    aria-readonly={!!result || submitting}
                    className={`min-w-0 flex-1 rounded-xl border bg-white px-4 py-3 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/25 ${
                      result
                        ? (result.past_simple_correct ?? false)
                          ? "border-green-400"
                          : "border-red-400"
                        : "border-slate-300"
                    }`}
                    ref={pastSimpleInputRef}
                    autoFocus
                  />
                  {result ? <InlineResultGlyph ok={result.past_simple_correct ?? false} /> : null}
                </div>
                {result && !(result.past_simple_correct ?? false) ? (
                  <p className="mt-1.5 text-xs text-slate-500">
                    <span className="text-slate-400">→</span> {currentVerb.past_simple}
                  </p>
                ) : null}
              </div>
            ) : null}

            {showPastParticiple ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Past Participle</label>
                <div className="flex items-center gap-3">
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
                      else if (showManualNext) handleNext();
                    }}
                    readOnly={!!result || submitting}
                    aria-readonly={!!result || submitting}
                    className={`min-w-0 flex-1 rounded-xl border bg-white px-4 py-3 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/25 ${
                      result
                        ? (result.past_participle_correct ?? false)
                          ? "border-green-400"
                          : "border-red-400"
                        : "border-slate-300"
                    }`}
                    ref={pastParticipleInputRef}
                  />
                  {result ? <InlineResultGlyph ok={result.past_participle_correct ?? false} /> : null}
                </div>
                {result && !(result.past_participle_correct ?? false) ? (
                  <p className="mt-1.5 text-xs text-slate-500">
                    <span className="text-slate-400">→</span> {currentVerb.past_participle}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {result ? (
            <div className="space-y-3">
              {!getEffectiveCorrect(result) &&
              effectiveMode === "both" &&
              (result.past_simple_correct ?? false) !== (result.past_participle_correct ?? false) ? (
                <p className="text-center text-[11px] leading-snug text-slate-500">
                  Prawie — jedna forma jest poprawna
                </p>
              ) : null}

              {currentVerb && (() => {
                const base = currentVerb.base.toLowerCase().trim();
                const tip = VERB_TIPS[base] ?? null;
                if (!tip) return null;
                return (
                  <div className="rounded-xl border border-slate-200/90 bg-white p-3">
                    <p className="text-xs font-medium text-slate-500">WAŻNE!</p>
                    <div className="mt-1 whitespace-pre-line font-mono text-xs text-slate-600">
                      <TypewriterText text={tip} speed={30} />
                    </div>
                  </div>
                );
              })()}

              {showManualNext ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-slate-900 bg-white px-4 py-3 font-medium text-slate-900 hover:bg-slate-50 transition"
                    onClick={handleNext}
                  >
                    Następny czasownik
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-900 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
                onClick={handleSubmit}
                disabled={submitting || !canSubmit}
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
