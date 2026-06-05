"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { emitTrainingCompleted } from "@/lib/events/trainingEvents";
import { useCurrentWord } from "@/lib/coach/CurrentWordContext";
import { TypewriterText } from "@/lib/coach/TypewriterText";
import { TRAINING_CONTEXT_SUGGESTION, type TrainingEntryContext } from "@/lib/suggestions/suggestionContext";
import type { XpSkipReasonCode } from "@/lib/xp/award";
import { xpZeroSessionMessage } from "@/lib/xp/xpSkipReasonUi";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

export type Verb = {
  id: string;
  base: string;
  past_simple: string;
  past_simple_variants: string[];
  past_participle: string;
  past_participle_variants: string[];
  cefr_level?: string | null;
  translation_pl?: string | null;
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
  xp_skip_reason: XpSkipReasonCode | null;
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

const cardBase =
  "rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 transition-all duration-200";

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
  const trainingEntryContext: TrainingEntryContext | undefined =
    searchParams.get("context") === TRAINING_CONTEXT_SUGGESTION ? TRAINING_CONTEXT_SUGGESTION : undefined;
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
        body: JSON.stringify({
          ...payload,
          ...(trainingEntryContext ? { context: trainingEntryContext } : {}),
        }),
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
    trainingEntryContext,
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
          setAward({
            xp_awarded: data.xp_awarded ?? 0,
            xp_total: data.xp_total ?? 0,
            level: data.level ?? 0,
            xp_in_current_level: data.xp_in_current_level ?? 0,
            xp_to_next_level: data.xp_to_next_level ?? 0,
            newly_awarded_badges: data.newly_awarded_badges ?? [],
            xp_skip_reason: data.xp_skip_reason ?? "isolated_lesson_no_xp",
          });
          setSummary(data.summary ?? null);
        } else {
          setAward({
            xp_awarded: data.xp_awarded ?? 0,
            xp_total: data.xp_total ?? 0,
            level: data.level ?? 0,
            xp_in_current_level: data.xp_in_current_level ?? 0,
            xp_to_next_level: data.xp_to_next_level ?? 0,
            newly_awarded_badges: data.newly_awarded_badges ?? [],
            xp_skip_reason: data.xp_skip_reason ?? null,
          });
          setSummary(
            effectiveMode === "both" && sessionItems.length === 0 ? (data.summary ?? null) : null,
          );
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
  const percentCorrect = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  // ── Shared blocks ──────────────────────────────────────────────────────────

  const backLink = (
    <a href="/app/irregular-verbs" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700">
      ← Irregular verbs
    </a>
  );

  const errorBlock = error ? (
    <div className="mb-4 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
      <p className="text-sm text-rose-700"><span className="font-semibold">Błąd: </span>{error}</p>
      <button
        className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        onClick={startNewSession}
      >
        Spróbuj ponownie
      </button>
    </div>
  ) : null;

  const toastBlock = assignmentToast ? (
    <div className="mb-4 rounded-2xl border border-slate-200/50 bg-white/90 px-4 py-2.5 text-xs text-slate-600">
      {assignmentToast}
    </div>
  ) : null;

  // ── Loading ────────────────────────────────────────────────────────────────

  if (startLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <header className="mb-5">{backLink}</header>
        <div className={`${cardBase} animate-pulse`}>
          <div className="h-4 w-32 rounded bg-slate-100" />
          <div className="mt-6 h-8 w-48 mx-auto rounded bg-slate-100" />
          <div className="mt-4 h-12 rounded-xl bg-slate-100" />
          <div className="mt-3 h-12 rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  // ── Session complete ────────────────────────────────────────────────────────

  if (sessionComplete) {
    return (
      <div className="mx-auto max-w-2xl">
        <header className="mb-5">
          {backLink}
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Sesja zakończona</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">{modeLabel}</p>
        </header>

        {errorBlock}
        {toastBlock}

        <div className="space-y-4">
          {/* Results */}
          <section className={cardBase}>
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Wyniki</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CorrectIcon size={18} /> Poprawne
                </span>
                <span className="text-sm font-bold tabular-nums text-emerald-800">{summaryCorrect}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-rose-700">
                  <WrongIcon size={18} /> Błędne
                </span>
                <span className="text-sm font-bold tabular-nums text-rose-800">{summaryWrong}</span>
              </div>
            </div>
            <p className="mt-3 text-right text-xs text-slate-400">
              {summaryTotal ? Math.round(summaryAccuracy * 100) : 0}% skuteczności
            </p>

            {summary?.wrong_items?.length ? (
              <div className="mt-4 border-t border-slate-100 pt-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-500">Do zapamiętania:</p>
                {summary.wrong_items.slice(0, 8).map((item, idx) => (
                  <div key={`${item.prompt ?? "?"}-${idx}`} className="flex items-center gap-2 text-xs">
                    <span className="text-rose-400">✕</span>
                    <span className="font-semibold text-slate-700">{item.prompt ?? "—"}</span>
                    <span className="text-slate-300">→</span>
                    <span className="text-slate-900">{item.expected ?? "—"}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* XP */}
          <section className={cardBase}>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">XP</h2>
            {wantsLessonVerbsSession ? (
              <div className="space-y-2 text-sm text-slate-600">
                <p>Powtórzyłeś materiał z lekcji.</p>
                {award?.xp_awarded === 0 ? (
                  <p className="text-amber-700">{xpZeroSessionMessage(award.xp_skip_reason)}</p>
                ) : null}
              </div>
            ) : award ? (
              <div className="space-y-1 text-sm text-slate-700">
                {award.xp_awarded === 0 ? (
                  <p className="text-amber-700">{xpZeroSessionMessage(award.xp_skip_reason)}</p>
                ) : (
                  <p>
                    <span className="text-lg font-black text-slate-900">+{award.xp_awarded} XP</span>
                    {award.xp_awarded < 10 ? (
                      <span className="ml-2 text-xs text-slate-400">Krótka sesja</span>
                    ) : null}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Poziom {award.level} · {award.xp_in_current_level}/{award.xp_to_next_level} XP do następnego
                </p>
              </div>
            ) : awarding ? (
              <p className="text-sm text-slate-500">Przyznaję XP…</p>
            ) : awardError ? (
              <p className="text-sm text-rose-600">{awardError}</p>
            ) : (
              <p className="text-sm text-slate-400">Brak danych o XP.</p>
            )}
          </section>

          {/* Badges */}
          {award?.newly_awarded_badges?.length ? (
            <section className="rounded-2xl border-2 border-amber-300/40 bg-amber-50/60 p-5 space-y-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-700">Nowe odznaki</h2>
              {award.newly_awarded_badges.map((badge) => (
                <p key={badge.slug} className="text-sm font-medium text-amber-800">
                  {badge.title}{badge.description ? ` — ${badge.description}` : ""}
                </p>
              ))}
            </section>
          ) : null}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {wantsLessonVerbsSession ? (
              <>
                <button
                  type="button"
                  onClick={() => void startNewSession()}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Jeszcze raz
                </button>
                {lessonReturnHref ? (
                  <a
                    href={lessonReturnHref}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Wróć do lekcji
                  </a>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                onClick={startNewSession}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Jeszcze raz
              </button>
            )}
            <a
              href="/app/irregular-verbs"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Lista czasowników
            </a>
            <a
              href="/app"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Panel
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── No verb (error state) ─────────────────────────────────────────────────

  if (!currentVerb) {
    return (
      <div className="mx-auto max-w-2xl">
        <header className="mb-5">{backLink}</header>
        {errorBlock}
        <div className={cardBase}>
          <p className="text-sm text-slate-400">Brak czasowników do treningu. Wróć do listy i przypnij kilka.</p>
        </div>
      </div>
    );
  }

  // ── Active session ─────────────────────────────────────────────────────────

  const effectivelyCorrect = result ? getEffectiveCorrect(result) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5">
        {backLink}
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
          Czasowniki nieregularne
        </h1>
      </header>

      {errorBlock}
      {toastBlock}

      <div className="space-y-4">
        {/* Progress header */}
        <div className="flex items-end justify-between">
          <span className="text-sm text-slate-500">
            {sessionItems.length > 0 ? (
              <>
                <span className="text-lg font-bold text-slate-800">{sessionItemIndex + 1}</span>
                <span className="text-slate-400"> / {sessionItems.length}</span>
              </>
            ) : (
              <>
                Poprawne:{" "}
                <span className="font-semibold text-slate-800">{stats.correct}</span>
                <span className="text-slate-400"> / {stats.total}</span>
              </>
            )}
          </span>
          {stats.total > 0 ? (
            <div className="text-right">
              <div className={`text-2xl font-black leading-none tabular-nums ${
                percentCorrect >= 70 ? "text-emerald-500" : percentCorrect >= 40 ? "text-amber-500" : "text-orange-500"
              }`}>
                {percentCorrect}%
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">poprawnych</div>
            </div>
          ) : null}
        </div>

        {/* Session dot progress */}
        {sessionItems.length > 0 && sessionItems.length <= 25 ? (
          <div className="flex flex-wrap gap-1">
            {sessionItems.map((_item, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all duration-500 ${
                  i < sessionItemIndex
                    ? "w-6 bg-slate-300"
                    : i === sessionItemIndex
                      ? "w-6 bg-sky-400"
                      : "w-2 bg-slate-200"
                }`}
              />
            ))}
          </div>
        ) : null}

        {/* Main card */}
        <section className={cardBase}>
          {/* Verb prompt */}
          <div className="mb-6 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {effectiveMode === "both"
                ? "Podaj obie formy"
                : effectiveMode === "past_simple"
                  ? "Podaj Past Simple"
                  : "Podaj Past Participle"}
            </div>
            {currentVerb.cefr_level ? (
              <span className={`mt-2 inline-block rounded-md px-2.5 py-1 text-sm font-bold tracking-wide ${cefrColor(currentVerb.cefr_level)}`}>
                {currentVerb.cefr_level}
              </span>
            ) : null}
            <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {currentVerb.base}
            </div>
            {currentVerb.translation_pl ? (
              <div className="mt-1 text-sm text-slate-400">{currentVerb.translation_pl}</div>
            ) : null}
          </div>

          {/* Input fields */}
          <div className="space-y-4">
            {showPastSimple ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 mb-2">
                  Past Simple
                </label>
                <input
                  type="text"
                  value={pastSimple}
                  onChange={(e) => { if (submitting || result) return; setPastSimple(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    if (submitting) return;
                    if (!result) void handleSubmit();
                    else if (showManualNext) handleNext();
                  }}
                  readOnly={!!result || submitting}
                  aria-readonly={!!result || submitting}
                  placeholder="past simple…"
                  ref={pastSimpleInputRef}
                  autoFocus
                  className={`w-full rounded-xl border px-4 py-3 text-center text-base text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400/25 ${
                    result
                      ? (result.past_simple_correct ?? false)
                        ? "border-emerald-400 bg-emerald-50/50"
                        : "border-rose-400 bg-rose-50/30"
                      : "border-slate-200 bg-white/80"
                  }`}
                />
                {result && !(result.past_simple_correct ?? false) ? (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-orange-50/80 px-3 py-2">
                    <WrongIcon size={16} />
                    <span className="text-xs text-slate-500">Poprawnie:</span>
                    <span className="text-sm font-bold text-slate-900">{currentVerb.past_simple}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showPastParticiple ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 mb-2">
                  Past Participle
                </label>
                <input
                  type="text"
                  value={pastParticiple}
                  onChange={(e) => { if (submitting || result) return; setPastParticiple(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    if (submitting) return;
                    if (!result) void handleSubmit();
                    else if (showManualNext) handleNext();
                  }}
                  readOnly={!!result || submitting}
                  aria-readonly={!!result || submitting}
                  placeholder="past participle…"
                  ref={pastParticipleInputRef}
                  className={`w-full rounded-xl border px-4 py-3 text-center text-base text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400/25 ${
                    result
                      ? (result.past_participle_correct ?? false)
                        ? "border-emerald-400 bg-emerald-50/50"
                        : "border-rose-400 bg-rose-50/30"
                      : "border-slate-200 bg-white/80"
                  }`}
                />
                {result && !(result.past_participle_correct ?? false) ? (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-orange-50/80 px-3 py-2">
                    <WrongIcon size={16} />
                    <span className="text-xs text-slate-500">Poprawnie:</span>
                    <span className="text-sm font-bold text-slate-900">{currentVerb.past_participle}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Feedback */}
          {result ? (
            <div className="mt-5 space-y-3">
              {effectivelyCorrect ? (
                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <CorrectIcon size={18} /> Poprawnie!
                  </p>
                </div>
              ) : effectiveMode === "both" &&
                (result.past_simple_correct ?? false) !== (result.past_participle_correct ?? false) ? (
                <p className="text-center text-xs text-slate-500">Prawie — jedna forma jest poprawna</p>
              ) : null}

              {/* Verb tip */}
              {(() => {
                const tip = VERB_TIPS[currentVerb.base.toLowerCase().trim()] ?? null;
                if (!tip) return null;
                return (
                  <div className="rounded-xl border border-slate-200/50 bg-slate-50/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ważne!</p>
                    <div className="mt-1 whitespace-pre-line text-xs text-slate-600">
                      <TypewriterText text={tip} speed={30} />
                    </div>
                  </div>
                );
              })()}

              {showManualNext ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Następny →
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || !canSubmit}
                className="relative w-full inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-sky-400 to-blue-700 py-3 text-sm font-bold shadow-md shadow-blue-200/50 ring-1 ring-inset ring-white/20 transition hover:brightness-105 hover:shadow-lg disabled:opacity-60"
                style={{ color: "#fff" }}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                <span className="relative">{submitting ? "Sprawdzam…" : "Sprawdź"}</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
