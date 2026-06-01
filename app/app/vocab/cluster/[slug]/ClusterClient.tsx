"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { emitTrainingCompleted } from "@/lib/events/trainingEvents";
import {
  evaluateClusterTranslation,
  isClusterTaskAnswerCorrect,
  type ClusterMastery,
  type ClusterPattern,
  type ClusterTask,
  type TranslationEvaluationResult,
} from "@/lib/vocab/clusterLoader";
import { appendSuggestionContext, type TrainingEntryContext } from "@/lib/suggestions/suggestionContext";
import type { XpSkipReasonCode } from "@/lib/xp/award";
import { xpZeroSessionMessage } from "@/lib/xp/xpSkipReasonUi";
import {
  applyMakeDoTheoryLeadCapitalize,
  getVocabClusterTheoryHighlightRegex,
} from "@/lib/vocab/clusterTheoryHighlight";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

const cardBase =
  "rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 transition-all duration-200";

type Question = ClusterTask & {
  answer?: string; // filled after scoring
};

export type ClusterMeta = {
  id: string;
  slug: string;
  title: string;
  unlocked: boolean;
  unlocked_at: string | null;
  theory_md: string | null;
  theory_summary: string | null;
  learning_goal: string | null;
  display_order: number;
  mastery: ClusterMastery;
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
    question_mode?: string | null;
  }>;
};

export default function ClusterClient({
  slug,
  limit,
  assignmentId,
  trainingEntryContext,
  initialCluster,
  initialPatterns,
  initialQuestions,
  view = "overview",
}: {
  slug: string;
  limit: number;
  assignmentId: string;
  trainingEntryContext?: TrainingEntryContext;
  initialCluster: ClusterMeta;
  initialPatterns: ClusterPattern[];
  initialQuestions: ClusterTask[];
  view?: "overview" | "practice";
}) {
  const router = useRouter();
  const isPracticeView = view === "practice";
  const withSuggestionCtx = (path: string) =>
    trainingEntryContext === "suggestion" ? appendSuggestionContext(path) : path;

  const [error, setError] = useState("");
  const [startLoading, setStartLoading] = useState(isPracticeView);

  const [questions, setQuestions] = useState<Question[]>(() => (isPracticeView ? [] : initialQuestions));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [eventLogErrors, setEventLogErrors] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [award, setAward] = useState<AwardResult | null>(null);
  const [optimisticXpAwarded, setOptimisticXpAwarded] = useState<number | null>(null);
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState("");
  const [saveToast, setSaveToast] = useState("");
  const [awardedSessionId, setAwardedSessionId] = useState("");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [mastery, setMastery] = useState<ClusterMastery>(() => initialCluster.mastery);
  const [assignmentToast, setAssignmentToast] = useState("");
  const [translationFeedback, setTranslationFeedback] = useState<TranslationEvaluationResult | null>(null);
  const assignmentCompleteRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const checkingRef = useRef(false);
  const patterns = initialPatterns;

  const current = questions[currentIndex];
  const total = questions.length;
  const summaryTotal = summary?.total ?? total;
  const summaryCorrect = summary?.correct ?? correctCount;
  const summaryWrong = summary?.wrong ?? Math.max(summaryTotal - summaryCorrect, 0);
  const summaryAccuracy = summary?.accuracy ?? (summaryTotal ? summaryCorrect / summaryTotal : 0);

  const startSessionWithApi = useCallback(async () => {
    setStartLoading(true);
    setError("");
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError("Zaloguj się, aby rozpocząć sesję.");
        return;
      }
      const res = await fetch("/api/training/cluster/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug,
          limit,
          ...(trainingEntryContext ? { context: trainingEntryContext } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Nie udało się rozpocząć sesji.");
      }
      if (!data.sessionId || !Array.isArray(data.questions)) {
        throw new Error("Nieprawidłowa odpowiedź serwera.");
      }
      const tasks = data.questions as ClusterTask[];
      if (tasks.length === 0) {
        throw new Error("Brak dostępnych pytań dla tego clustera.");
      }
      setQuestions(tasks.map((t) => ({ ...t })));
      setSessionId(data.sessionId);
      setCurrentIndex(0);
      setSelectedChoice(null);
      setTextAnswer("");
      setChecked(false);
      setCorrectCount(0);
      setCompleted(false);
      setEventLogErrors(0);
      setAward(null);
      setOptimisticXpAwarded(null);
      setAwardError("");
      setSaveToast("");
      setAwardedSessionId("");
      setSummary(null);
      setTranslationFeedback(null);
      assignmentCompleteRef.current = false;
      checkingRef.current = false;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się rozpocząć sesji.");
    } finally {
      setStartLoading(false);
    }
  }, [slug, limit, trainingEntryContext]);

  const loadQuestions = () => {
    if (!isPracticeView) return;
    setError("");
    void startSessionWithApi();
  };

  // When overview data changes (e.g. navigation), sync questions and mastery.
  useEffect(() => {
    if (isPracticeView) return;
    setQuestions(initialQuestions);
    setMastery(initialCluster.mastery);
  }, [initialCluster.mastery, initialQuestions, isPracticeView]);

  // Practice view: fetch session from API on mount.
  const startFetchedRef = useRef(false);
  useEffect(() => {
    if (!isPracticeView || startFetchedRef.current) return;
    startFetchedRef.current = true;
    void startSessionWithApi();
  }, [isPracticeView, startSessionWithApi]);

  const checkAnswer = (choice: string) => {
    if (!current || checkingRef.current) return;
    checkingRef.current = true;

    const isTranslation = current.task_type === "translation";
    const submitted = isTranslation ? textAnswer : choice;
    setSelectedChoice(submitted);

    const correctChoiceStr =
      typeof current.correct_choice === "number" && Array.isArray(current.choices)
        ? current.choices[current.correct_choice] ?? ""
        : (current.correct_choice ?? "");
    const correctAnswer = current.expected_answer ?? correctChoiceStr ?? current.accepted_answers?.[0] ?? "";

    let isCorrect: boolean;
    if (isTranslation) {
      const evalResult = evaluateClusterTranslation(current, submitted);
      setTranslationFeedback(evalResult);
      isCorrect = evalResult.cluster_correct;

      // store user answer so UI can render feedback
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === current.id
            ? { ...q, answer: submitted }
            : q
        )
      );
    } else {
      setTranslationFeedback(null);
      isCorrect = isClusterTaskAnswerCorrect(current, submitted);
    }
    if (isCorrect) setCorrectCount((c) => c + 1);

    if (!isTranslation) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === current.id
            ? { ...q, answer: String(correctAnswer) }
            : q
        )
      );
    }
    setChecked(true);
    lastCheckTimeRef.current = Date.now();

    // Background event log (do not block UI)
    void (async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;
        await fetch(`/api/vocab/clusters/${slug}/questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ questionId: current.id, chosen: submitted, session_id: sessionId }),
        });
      } catch (e) {
        console.warn("[cluster] background log failed", e);
        setEventLogErrors((prev) => prev + 1);
      }
    })();
  };

  const goNext = () => {
    checkingRef.current = false;
    if (currentIndex >= total - 1) {
      setOptimisticXpAwarded(10);
      setCompleted(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedChoice(null);
    setTextAnswer("");
    setChecked(false);
    setTranslationFeedback(null);
  };

  useEffect(() => {
    const awardXp = async () => {
      if (!completed || !sessionId) return;
      if (awardedSessionId === sessionId) return;

      try {
        // Optimistic: show XP immediately, validate in background.
        setOptimisticXpAwarded(10);
        setAwardedSessionId(sessionId);
        setAwarding(false);
        setAwardError("");

        void (async () => {
          try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (!token) return;

            const res = await fetch(`/api/vocab/clusters/${slug}/complete`, {
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
              xp_skip_reason: data.xp_skip_reason ?? null,
            });
            setSummary(data.summary ?? null);
            setMastery((prev) => ({
              ...prev,
              mastery_state: data.mastery_state ?? prev.mastery_state,
              practiced_days: data.practiced_days ?? prev.practiced_days,
              stable_days: data.stable_days ?? prev.stable_days,
              latest_activity_date: data.latest_activity_date ?? prev.latest_activity_date,
              rolling_accuracy: data.rolling_accuracy ?? prev.rolling_accuracy,
            }));
            setOptimisticXpAwarded(null);
            emitTrainingCompleted({ type: "cluster", slug });

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
                    exercise_type: "cluster",
                    context_slug: slug,
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
                console.warn("[cluster] assignment complete failed", e);
              }
            }
          } catch (e: unknown) {
            console.warn("[cluster] background complete failed", e);
            setAwardError(e instanceof Error ? e.message : "Nie udało się przyznać XP.");
            setSaveToast("Nie udało się zapisać wyniku. Spróbuj później.");
            // Do not rollback UI.
          }
        })();
      } catch (e: unknown) {
        setAwardError(e instanceof Error ? e.message : "Nie udało się przyznać XP.");
      } finally {
        setAwarding(false);
      }
    };

    void awardXp();
  }, [assignmentId, awardedSessionId, completed, sessionId, slug]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  useEffect(() => {
    if (!isPracticeView || completed || !checked || !current) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.repeat) {
        if (Date.now() - lastCheckTimeRef.current < 500) return;
        e.preventDefault();
        goNextRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPracticeView, completed, checked, current]);

  useEffect(() => {
    if (!assignmentToast) return;
    const timer = setTimeout(() => setAssignmentToast(""), 4000);
    return () => clearTimeout(timer);
  }, [assignmentToast]);

  useEffect(() => {
    if (!saveToast) return;
    const timer = setTimeout(() => setSaveToast(""), 3500);
    return () => clearTimeout(timer);
  }, [saveToast]);

  const isChoiceTask = current?.task_type === "choice";

  function masteryLabel(value: ClusterMastery["mastery_state"]): string | null {
    switch (value) {
      case "mastered":
        return "Mamy to!";
      case "stable":
        return "Ten zestaw dobrze ci idzie!";
      case "building":
        return "Potrzebujesz jeszcze trochę praktyki.";
      case "new":
      default:
        return null;
    }
  }

  function taskLabel(taskType: ClusterTask["task_type"]): string {
    switch (taskType) {
      case "correction":
        return "Popraw zdanie";
      case "translation":
        return "Tłumaczenie";
      default:
        return "Wybór odpowiedzi";
    }
  }

  function renderClusterTheoryMarkdown(text: string) {
    const focusRe = getVocabClusterTheoryHighlightRegex(slug);

    return text.split("\n").map((line, idx) => {
      const processed = applyMakeDoTheoryLeadCapitalize(line, slug);
      const key = `${idx}-${processed}`;

      const lineBody =
        !focusRe ? (
          processed
        ) : (
          processed.split(focusRe).map((part, partIdx) => {
            if (partIdx % 2 === 1) {
              return (
                <strong key={`${key}-p-${partIdx}`} className="font-semibold text-slate-950">
                  „{part}"
                </strong>
              );
            }
            return <Fragment key={`${key}-p-${partIdx}`}>{part}</Fragment>;
          })
        );

      if (!processed.trim()) {
        return <div key={key} className="h-4" />;
      }

      if (processed.startsWith("- ")) {
        return (
          <div key={key} className="flex gap-2 text-sm leading-relaxed text-slate-700">
            <span className="text-slate-400">•</span>
            <span>{lineBody}</span>
          </div>
        );
      }

      return (
        <p key={key} className="text-sm leading-relaxed text-slate-700">
          {lineBody}
        </p>
      );
    });
  }

  const mainActionTileClass =
    "tile-core inline-flex items-center justify-center rounded-[11px] px-6 py-3 text-base font-semibold text-slate-900";
  const backToVocabTileClass =
    "tile-core inline-flex items-center rounded-[11px] px-2 py-1 text-xs font-medium text-slate-700";

  const showTheorySection =
    !isPracticeView &&
    (Boolean(initialCluster.theory_md) || Boolean(initialCluster.theory_summary));
  const masteryStatusText = masteryLabel(mastery.mastery_state);

  const pct = summaryTotal > 0 ? Math.round(summaryAccuracy * 100) : 0;

  return (
    <main className="space-y-6">
      {!isPracticeView ? (
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Typowe błędy: {initialCluster.title || slug.replace(/-/g, " / ")}
                </h1>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {masteryStatusText ? (
                    <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-900">
                      {masteryStatusText}
                    </span>
                  ) : null}
                  <span className="text-sm text-slate-600">
                    {mastery.stable_days}/{mastery.practiced_days} stabilnych dni
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Łączna skuteczność:{" "}
                  <span className="font-medium text-slate-900">
                    {mastery.rolling_accuracy != null ? Math.round(mastery.rolling_accuracy * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col justify-start gap-2 sm:flex-row sm:items-start lg:flex-col lg:items-end">
              <a className="tile-frame tile-frame-practice-cta" href={withSuggestionCtx(`/app/vocab/cluster/${slug}/practice`)}>
                <span className={mainActionTileClass}>Ćwicz</span>
              </a>
              <a className="tile-frame" href="/app/vocab">
                <span className={backToVocabTileClass}>← Trening słówek</span>
              </a>
            </div>
          </div>
        </header>
      ) : (
        <header className="mb-5">
          <a
            href={withSuggestionCtx(`/app/vocab/cluster/${slug}`)}
            className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            ← Teoria
          </a>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
            Ćwicz: {initialCluster.title || slug.replace(/-/g, " / ")}
          </h1>
        </header>
      )}

      {showTheorySection ? (
        <section className={`${cardBase} space-y-3`}>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Teoria</h2>
            <p className="text-sm text-slate-600">Krótka ściąga przed ćwiczeniem.</p>
          </div>
          {initialCluster.theory_summary ? (
            <div className="space-y-2 text-sm leading-relaxed text-slate-700">
              {renderClusterTheoryMarkdown(initialCluster.theory_summary)}
            </div>
          ) : null}
          {initialCluster.theory_md ? (
            <div className="space-y-2">{renderClusterTheoryMarkdown(initialCluster.theory_md)}</div>
          ) : null}
        </section>
      ) : null}

      {!isPracticeView && patterns.length ? (
        <section className={`${cardBase} space-y-4`}>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Core patterns</h2>
            <p className="text-sm text-slate-600">Najważniejsze wzorce użycia w tym clusterze.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {patterns.map((pattern) => (
              <article key={pattern.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <h3 className="font-medium text-slate-900">{pattern.title}</h3>
                <div className="text-sm font-medium text-slate-800">{pattern.pattern_en}</div>
                {pattern.pattern_pl ? <div className="text-sm text-slate-600">{pattern.pattern_pl}</div> : null}
                {pattern.usage_note ? <div className="text-sm text-slate-600">{pattern.usage_note}</div> : null}
                {pattern.contrast_note ? <div className="text-sm text-slate-500">{pattern.contrast_note}</div> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {isPracticeView && startLoading && !error ? (
        <div className={`${cardBase} animate-pulse`}>
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="mt-3 h-8 w-3/4 rounded bg-slate-100" />
          <div className="mt-4 h-24 rounded bg-slate-100" />
        </div>
      ) : null}

      {isPracticeView && error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
          {error}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={loadQuestions}
            >
              Spróbuj ponownie
            </button>
            <a
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href="/app/vocab"
            >
              ← Trening słówek
            </a>
          </div>
        </div>
      ) : null}

      {assignmentToast ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {assignmentToast}
        </div>
      ) : null}
      {saveToast ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {saveToast}
        </div>
      ) : null}

      {isPracticeView && !error && !completed && current ? (
        <section className={`${cardBase} space-y-4`}>
          {/* Progress */}
          <div className="flex items-end justify-between">
            <span className="text-sm text-slate-500">
              <span className="text-lg font-bold text-slate-800">{currentIndex + 1}</span>
              <span className="text-slate-400"> / {total}</span>
            </span>
            {correctCount > 0 && (
              <div className="text-right">
                <div
                  className={`text-2xl font-black leading-none tabular-nums ${
                    Math.round((correctCount / (currentIndex + 1)) * 100) >= 70
                      ? "text-emerald-500"
                      : Math.round((correctCount / (currentIndex + 1)) * 100) >= 40
                        ? "text-amber-500"
                        : "text-orange-500"
                  }`}
                >
                  {Math.round((correctCount / (currentIndex + 1)) * 100)}%
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  poprawnych
                </div>
              </div>
            )}
          </div>

          {/* Dot progress bar */}
          <div className="flex flex-wrap gap-1">
            {questions.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all duration-500 ${
                  i < currentIndex
                    ? "w-6 bg-emerald-400"
                    : i === currentIndex
                      ? "w-6 bg-sky-400"
                      : "w-2 bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* Eyebrow + Prompt */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {taskLabel(current.task_type)}
            </div>
            <div className="mt-3 text-xl font-bold tracking-tight text-slate-900 leading-snug">
              {current.prompt}
            </div>
            {current.instruction ? (
              <p className="mt-1 text-sm text-slate-500">{current.instruction}</p>
            ) : null}
          </div>

          {current.source_text ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
              {current.source_text}
            </div>
          ) : null}

          {isChoiceTask ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {current.choices.map((choice) => {
                const isSelected = selectedChoice === choice;
                const isCorrectChoice = current.answer ? choice === current.answer : false;

                let buttonClass =
                  "w-full rounded-xl border px-4 py-3 text-sm font-medium text-left transition-all focus:outline-none";
                if (checked) {
                  if (isCorrectChoice) {
                    buttonClass += " border-emerald-400 bg-emerald-50 text-emerald-800 cursor-default";
                  } else if (isSelected) {
                    buttonClass += " border-rose-400 bg-rose-50 text-rose-700 cursor-default";
                  } else {
                    buttonClass += " border-slate-100 bg-white/60 text-slate-400 cursor-default opacity-60";
                  }
                } else {
                  buttonClass += " border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50 cursor-pointer";
                }

                return (
                  <button key={choice} onClick={() => checkAnswer(choice)} disabled={checked} className={buttonClass}>
                    <span className="flex items-center justify-between gap-2">
                      <span>{choice}</span>
                      {checked && isCorrectChoice && <CorrectIcon size={16} />}
                      {checked && isSelected && !isCorrectChoice && <WrongIcon size={16} />}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-slate-100 bg-white/80 px-4 py-3.5 text-center text-sm text-slate-800 placeholder:text-slate-300 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder={current.task_type === "translation" ? "Wpisz tłumaczenie po angielsku" : "Wpisz poprawioną wersję"}
                disabled={checked}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !checked && textAnswer.trim()) {
                    checkAnswer(textAnswer);
                  }
                }}
              />
              {!checked && (
                <button
                  className="relative w-full inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-sky-400 to-blue-700 py-3 text-sm font-bold shadow-md shadow-blue-200/50 ring-1 ring-inset ring-white/20 transition hover:brightness-105 hover:shadow-lg disabled:opacity-60"
                  style={{ color: "#fff" }}
                  onClick={() => checkAnswer(textAnswer)}
                  disabled={checked || !textAnswer.trim()}
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                  <span className="relative">Sprawdź odpowiedź</span>
                </button>
              )}
            </div>
          )}

          {checked && (() => {
            const wasCorrect =
              current.task_type === "translation"
                ? translationFeedback?.cluster_correct === true
                : selectedChoice
                  ? isClusterTaskAnswerCorrect(current, selectedChoice)
                  : false;
            const displayChoiceStr =
              typeof current.correct_choice === "number" && Array.isArray(current.choices)
                ? current.choices[current.correct_choice] ?? ""
                : (current.correct_choice ?? "");
            const displayAnswer =
              current.task_type === "translation"
                ? current.expected_answer ?? current.accepted_answers?.[0] ?? ""
                : current.answer ?? current.expected_answer ?? displayChoiceStr ?? current.accepted_answers?.[0] ?? "";
            const isTranslationWithDiff =
              current.task_type === "translation" &&
              translationFeedback?.cluster_correct &&
              !translationFeedback?.sentence_exact &&
              translationFeedback.diff.length > 0;

            return (
              <div className="space-y-3">
                {wasCorrect ? (
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 space-y-1.5">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                      <CorrectIcon size={18} />
                      {isTranslationWithDiff
                        ? "Czasownik poprawny — sprawdź pozostałe słowa:"
                        : "Poprawnie!"}
                    </p>
                    {isTranslationWithDiff && selectedChoice ? (
                      <p className="text-sm text-slate-700">
                        {selectedChoice.trim().split(/\s+/).map((token, i) => {
                          const diffItem = translationFeedback.diff.find((d) => d.index === i);
                          if (diffItem) {
                            return (
                              <Fragment key={i}>
                                <span className="font-medium text-rose-600">{token}</span>
                                <span className="text-slate-500"> → {diffItem.expected}</span>{" "}
                              </Fragment>
                            );
                          }
                          return <Fragment key={i}>{token} </Fragment>;
                        })}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl bg-orange-50/80 px-4 py-3.5 space-y-3">
                    <div className="flex items-start gap-3">
                      <WrongIcon size={28} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                          Twoja odpowiedź
                        </p>
                        <p className="mt-0.5 text-base font-semibold text-red-600">
                          {selectedChoice ?? "—"}
                        </p>
                      </div>
                    </div>
                    {displayAnswer && (
                      <div className="flex items-start gap-3">
                        <CorrectIcon size={28} />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Poprawnie
                          </p>
                          <p className="mt-0.5 text-base font-bold text-slate-900">{displayAnswer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {current.explanation ? (
                  <p className="text-sm text-slate-600">{current.explanation}</p>
                ) : null}
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  onClick={goNext}
                >
                  {currentIndex === total - 1 ? "Zakończ" : "Dalej →"}
                </button>
              </div>
            );
          })()}
        </section>
      ) : null}

      {isPracticeView && !error && completed ? (
        <section className={`${cardBase} space-y-4`}>
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Wyniki sesji
          </h2>
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
          <p className="text-right text-xs text-slate-400">{pct}% skuteczności</p>

          {summary?.wrong_items?.length ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-700 mb-2">Najczęstsze błędy:</p>
              <ul className="space-y-1 text-slate-600">
                {summary.wrong_items.slice(0, 10).map((item, idx) => (
                  <li key={`${item.prompt ?? "?"}-${idx}`}>
                    {item.prompt ?? "—"} → {item.expected ?? "—"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {eventLogErrors > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Nie udało się zapisać {eventLogErrors} {eventLogErrors === 1 ? "zdarzenia" : "zdarzeń"} do historii.
            </div>
          )}

          {/* XP */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 space-y-1.5 text-sm text-slate-700">
            {award ? (
              <>
                {award.xp_awarded === 0 ? (
                  <div className="text-amber-700">{xpZeroSessionMessage(award.xp_skip_reason)}</div>
                ) : (
                  <div className="text-base font-semibold text-slate-900">+{award.xp_awarded} XP</div>
                )}
                <div>
                  Poziom: <span className="font-medium text-slate-900">{award.level}</span>
                  {" · "}
                  XP:{" "}
                  <span className="font-medium text-slate-900">
                    {award.xp_in_current_level}/{award.xp_to_next_level}
                  </span>
                </div>
              </>
            ) : optimisticXpAwarded != null ? (
              <div className="text-base font-semibold text-slate-900">+{optimisticXpAwarded} XP</div>
            ) : awarding ? (
              <div className="text-slate-500">Przyznaję XP…</div>
            ) : awardError ? (
              <div className="text-slate-500">Brak danych o XP.</div>
            ) : (
              <div className="text-slate-500">Brak danych o XP.</div>
            )}
          </div>

          {award?.newly_awarded_badges?.length ? (
            <div className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700">Nowe odznaki</p>
              {award.newly_awarded_badges.map((badge) => (
                <div key={badge.slug} className="text-xs text-amber-700">
                  {badge.title}
                  {badge.description ? ` — ${badge.description}` : ""}
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              className="relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-sky-400 to-blue-700 px-5 py-2.5 text-sm font-bold shadow-md shadow-blue-200/50 ring-1 ring-inset ring-white/20 transition hover:brightness-105"
              style={{ color: "#fff" }}
              onClick={loadQuestions}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
              <span className="relative">Jeszcze raz</span>
            </button>
            <a
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href="/app/vocab"
            >
              ← Trening słówek
            </a>
          </div>
        </section>
      ) : null}
    </main>
  );
}
