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
  initialCluster,
  initialPatterns,
  initialQuestions,
  view = "overview",
}: {
  slug: string;
  limit: number;
  assignmentId: string;
  initialCluster: ClusterMeta;
  initialPatterns: ClusterPattern[];
  initialQuestions: ClusterTask[];
  view?: "overview" | "practice";
}) {
  const router = useRouter();
  const isPracticeView = view === "practice";

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
  const [xpAlreadyAwarded, setXpAlreadyAwarded] = useState(false);
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
        body: JSON.stringify({ slug, limit }),
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
      setXpAlreadyAwarded(false);
      setSummary(null);
      setTranslationFeedback(null);
      assignmentCompleteRef.current = false;
      checkingRef.current = false;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się rozpocząć sesji.");
    } finally {
      setStartLoading(false);
    }
  }, [slug, limit]);

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
            setXpAlreadyAwarded((data.xp_awarded ?? 0) === 0);
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

  function masteryLabel(value: ClusterMastery["mastery_state"]): string {
    switch (value) {
      case "mastered":
        return "Mamy to!";
      case "stable":
        return "Ten zestaw dobrze ci idzie!";
      case "building":
        return "Potrzebujesz jeszcze trochę praktyki.";
      default:
        return "Sprawdź to!";
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

  function renderHighlightedTheory(text: string) {
    return text.split("\n").map((line, idx) => {
      const key = `${idx}-${line}`;
      const parts = line.split(/\b(make|do)\b/gi);

      const content = parts.map((part, partIdx) => {
        if (/^(make|do)$/i.test(part)) {
          return (
            <strong key={`${key}-${partIdx}`} className="font-semibold text-slate-950">
              {part}
            </strong>
          );
        }
        return <Fragment key={`${key}-${partIdx}`}>{part}</Fragment>;
      });

      if (!line.trim()) {
        return <div key={key} className="h-4" />;
      }

      if (line.startsWith("- ")) {
        return (
          <div key={key} className="flex gap-2">
            <span className="text-slate-400">•</span>
            <span>{content}</span>
          </div>
        );
      }

      return <p key={key}>{content}</p>;
    });
  }

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {isPracticeView ? "Ćwicz" : "Typowe błędy"}: {initialCluster.title || slug.replace(/-/g, " / ")}
            </h1>
            <p className="text-base text-slate-600">
              {isPracticeView
                ? "Przejdź przez zadania i sprawdź, czy rozróżniasz poprawne użycie w kontekście."
                : initialCluster.theory_summary || "Ćwicz wybór właściwego słowa w kontekście."}
            </p>
            {startLoading ? <p className="text-sm text-slate-500">Ładowanie sesji…</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="tile-frame"
              href={isPracticeView ? `/app/vocab/cluster/${slug}` : `/app/vocab/cluster/${slug}/practice`}
            >
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                {isPracticeView ? "Teoria" : "Ćwicz"}
              </span>
            </a>
            <a
              className="tile-frame"
              href="/app/vocab"
            >
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Trening słówek
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

      {!isPracticeView ? (
        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Ćwiczenia na osobnej stronie</h2>
              <p className="text-sm text-slate-600">Najpierw przejrzyj teorię i przykłady, a potem przejdź do praktyki.</p>
            </div>
            <a
              className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href={`/app/vocab/cluster/${slug}/practice`}
            >
              Otwórz ćwiczenia
            </a>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Cel</div>
          <div className="mt-2 text-sm font-medium text-slate-900">
            {initialCluster.learning_goal || "Rozróżniaj podobne słowa i używaj ich we właściwym kontekście."}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Mastery</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-medium text-slate-900">
              {masteryLabel(mastery.mastery_state)}
            </span>
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
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Zawartość</div>
          <div className="mt-2 text-sm text-slate-700">
            {questions.length} zadań · {patterns.length} wzorców
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Ostatnia aktywność: {mastery.latest_activity_date ?? "brak"}
          </div>
        </div>
      </section>

      {!isPracticeView && initialCluster.theory_md ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Teoria</h2>
            <p className="text-sm text-slate-600">Krótka ściąga przed ćwiczeniem.</p>
          </div>
          <div className="space-y-2 text-sm leading-6 text-slate-700">{renderHighlightedTheory(initialCluster.theory_md)}</div>
        </section>
      ) : null}

      {!isPracticeView && patterns.length ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
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
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-center text-slate-600">Ładowanie sesji…</p>
        </section>
      ) : null}

      {isPracticeView && error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-rose-700">
              <span className="font-semibold">Błąd: </span>
              {error}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={loadQuestions}
              >
                Spróbuj ponownie
              </button>
              <a
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
      {saveToast ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          {saveToast}
        </div>
      ) : null}

      {isPracticeView && !error && !completed && current ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Pytanie <span className="font-medium text-slate-900">{currentIndex + 1}</span>/{total}
            </span>
            <span>
              Poprawne: <span className="font-medium text-slate-900">{correctCount}</span>
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-lg font-medium text-slate-900">{current.prompt}</div>
              <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                {taskLabel(current.task_type)}
              </span>
            </div>

            {current.instruction ? <p className="text-sm text-slate-600">{current.instruction}</p> : null}
            {current.source_text ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
                {current.source_text}
              </div>
            ) : null}

            {isChoiceTask ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {current.choices.map((choice) => {
                  const isSelected = selectedChoice === choice;
                  const isCorrect = current.answer ? choice === current.answer : false;
                  const showFeedback = checked && isSelected;

                  let buttonClass =
                    "rounded-xl border-2 px-4 py-3 text-sm font-medium transition disabled:opacity-60";
                  if (checked) {
                    if (isCorrect) {
                      buttonClass += " border-emerald-400 bg-emerald-50 text-emerald-800";
                    } else if (isSelected) {
                      buttonClass += " border-rose-400 bg-rose-50 text-rose-800";
                    } else {
                      buttonClass += " border-slate-200 bg-slate-50 text-slate-400";
                    }
                  } else {
                    buttonClass += " border-slate-900 bg-white text-slate-700 hover:bg-slate-50";
                  }

                  return (
                    <button key={choice} onClick={() => checkAnswer(choice)} disabled={checked} className={buttonClass}>
                      {choice}
                      {showFeedback && isCorrect && " ✓"}
                      {showFeedback && !isCorrect && " ✗"}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
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
                <button
                  className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  onClick={() => checkAnswer(textAnswer)}
                  disabled={checked || !textAnswer.trim()}
                >
                  Sprawdź odpowiedź
                </button>
              </div>
            )}

            {checked && (
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  {(() => {
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

                    if (!displayAnswer && !translationFeedback) {
                      return <p className="text-sm text-slate-600">Sprawdź kolejne pytanie.</p>;
                    }

                    if (wasCorrect) {
                      return (
                        <div className="space-y-2">
                          <p className="text-sm text-slate-600">
                            <span className="text-base font-bold text-emerald-700">Poprawnie</span>
                            <span className="ml-2">
                              {isTranslationWithDiff
                                ? "Czasownik z clustera poprawny. Sprawdź pozostałe słowa:"
                                : "Tak trzymać."}
                            </span>
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
                      );
                    }

                    return (
                      <p className="text-sm text-slate-600">
                        <span className="text-base font-bold text-rose-700">Błąd</span>
                        <span className="ml-2">Poprawna odpowiedź: {displayAnswer || "—"}</span>
                      </p>
                    );
                  })()}
                  {current.explanation ? <p className="text-sm text-slate-600">{current.explanation}</p> : null}
                </div>
                <button
                  className="rounded-xl border border-slate-900 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={goNext}
                >
                  {currentIndex === total - 1 ? "Zakończ" : "Dalej"}
                </button>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {isPracticeView && !error && completed ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
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

          {eventLogErrors > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Uwaga: </span>
                Nie udało się zapisać {eventLogErrors} {eventLogErrors === 1 ? "zdarzenia" : "zdarzeń"} do historii.
              </p>
            </div>
          )}

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
            ) : optimisticXpAwarded != null ? (
              <div className="space-y-1 text-sm text-slate-700">
                <div>
                  Zdobyte XP: <span className="font-medium text-slate-900">+{optimisticXpAwarded}</span>
                </div>
              </div>
            ) : awarding ? (
              <div className="text-sm text-slate-500">Przyznaję XP…</div>
            ) : awardError ? (
              <div className="text-sm text-slate-500">Brak danych o XP.</div>
            ) : (
              <div className="text-sm text-slate-500">Brak danych o XP.</div>
            )}
          </div>

          {award?.newly_awarded_badges?.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <div className="text-sm font-semibold text-amber-800">Nowe odznaki</div>
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
              className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={loadQuestions}
            >
              Jeszcze raz to samo
            </button>
            <button
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed"
              disabled
            >
              Jeszcze raz tylko błędne (Wkrótce)
            </button>
            <a
              className="tile-frame"
              href="/app"
            >
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 text-sm font-medium text-slate-700">
                Wróć do strony głównej
              </span>
            </a>
          </div>
        </section>
      ) : null}
    </main>
  );
}

