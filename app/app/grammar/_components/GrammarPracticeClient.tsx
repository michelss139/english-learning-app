"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { emitTrainingCompleted } from "@/lib/events/trainingEvents";
import { getGrammarPracticeExercise } from "@/lib/grammar/practice";

type PracticeQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

type AnswerResult = {
  is_correct: boolean;
  correct_option: string;
};

const OPTIMISTIC_XP = 10;

export function GrammarPracticeClient({
  exerciseSlug,
  title,
  mapHref,
  mapLabel,
}: {
  exerciseSlug: string;
  title: string;
  mapHref: string;
  mapLabel: string;
}) {
  const exercise = useMemo(() => getGrammarPracticeExercise(exerciseSlug), [exerciseSlug]);

  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<PracticeQuestion | null>(
    exercise?.questions?.[0]
      ? {
          id: exercise.questions[0].id,
          prompt: exercise.questions[0].prompt,
          options: exercise.questions[0].options,
        }
      : null,
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [finished, setFinished] = useState(false);
  const [optimisticXpAwarded, setOptimisticXpAwarded] = useState<number>(0);
  const [completeResult, setCompleteResult] = useState<{ xp_awarded?: number } | null>(null);
  const [saveToast, setSaveToast] = useState("");
  const answeredRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      try {
        const startRes = await fetch("/api/grammar/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercise_slug: exerciseSlug }),
        });
        const startData = await startRes.json().catch(() => ({}));
        if (!startRes.ok || !startData?.session_id) {
          throw new Error(startData?.error || "Nie udało się rozpocząć sesji.");
        }
        if (!startData.questions?.length) {
          throw new Error("Brak pytań dla tego ćwiczenia.");
        }

        setSessionId(startData.session_id);
        setQuestion(startData.questions[0]);
      } catch (e: any) {
        setError(e?.message || "Błąd inicjalizacji ćwiczenia.");
      }
    };
    void run();
  }, [exerciseSlug]);

  useEffect(() => {
    if (!saveToast) return;
    const timer = setTimeout(() => setSaveToast(""), 3500);
    return () => clearTimeout(timer);
  }, [saveToast]);

  const getLocalCorrectOption = (questionId: string): string | null => {
    if (!exercise) return null;
    const q = exercise.questions.find((item) => item.id === questionId);
    return q?.correct_option ?? null;
  };

  const submitAnswer = (value: string) => {
    if (!sessionId || !question || chosen || answeredRef.current) return;

    const localCorrect = getLocalCorrectOption(question.id);
    const optimisticIsCorrect = localCorrect ? value === localCorrect : false;
    const optimisticCorrectOption = localCorrect ?? value;

    // Optimistic UI: show feedback immediately.
    setChosen(value);
    setAnswerResult({
      is_correct: optimisticIsCorrect,
      correct_option: optimisticCorrectOption,
    });
    answeredRef.current = true;

    // Background save; server remains source of truth.
    void (async () => {
      try {
        const res = await fetch("/api/grammar/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            slug: exerciseSlug,
            is_correct: optimisticIsCorrect,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveToast("Nie udało się zapisać odpowiedzi (w tle).");
          return;
        }

        setAnswerResult({
          is_correct: !!data.is_correct,
          correct_option: data.correct_option ?? optimisticCorrectOption,
        });
      } catch {
        setSaveToast("Nie udało się zapisać odpowiedzi (w tle).");
      }
    })();
  };

  const handleFinish = () => {
    if (!sessionId || !chosen) return;

    setOptimisticXpAwarded(OPTIMISTIC_XP);
    setFinished(true);

    void (async () => {
      try {
        const res = await fetch("/api/grammar/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, slug: exerciseSlug }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveToast("Nie udało się zapisać wyniku (w tle).");
          return;
        }
        setCompleteResult(data);
        if (typeof data.xp_awarded === "number") {
          setOptimisticXpAwarded(data.xp_awarded);
        }
        emitTrainingCompleted({ type: "grammar" });
      } catch {
        setSaveToast("Nie udało się zapisać wyniku (w tle).");
      }
    })();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (!chosen && question?.options?.[0]) {
      submitAnswer(question.options[0]);
    } else if (chosen && !finished) {
      handleFinish();
    }
  };

  const answered = chosen !== null;
  const options = question?.options ?? [];
  const xpToShow = completeResult?.xp_awarded ?? (optimisticXpAwarded || OPTIMISTIC_XP);

  return (
    <main className="space-y-6" onKeyDown={handleKeyDown} tabIndex={0}>
      <header className="px-1 py-1">
        <div className="flex items-center justify-between">
          <Link className="tile-frame" href={mapHref}>
            <span className="tile-core inline-flex items-center rounded-[11px] px-3 py-2 text-sm font-medium text-slate-700">
              ← {mapLabel}
            </span>
          </Link>
          <Link href="/app/grammar" className="text-sm text-slate-600 underline hover:text-slate-900">
            Spis treści
          </Link>
        </div>
      </header>

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ćwiczenie: {title}</h1>

      {saveToast ? (
        <div className="tile-frame">
          <div className="tile-core p-3 text-sm text-slate-700">{saveToast}</div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
      ) : null}

      {question && !finished ? (
        <div className="tile-frame">
          <div className="tile-core p-5">
            <p className="mb-4 text-lg text-slate-900">{question.prompt}</p>
            <ul className="space-y-2">
              {options.map((opt, idx) => (
                <li key={opt}>
                  <button
                    type="button"
                    disabled={answered || !sessionId}
                    onClick={() => submitAnswer(opt)}
                    className={`w-full rounded-lg border px-4 py-2 text-left transition ${
                      !answered
                        ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                        : opt === chosen
                          ? answerResult?.is_correct
                            ? "border-sky-400 bg-sky-50 text-slate-900"
                            : "border-red-300 bg-red-50 text-slate-900"
                          : "border-slate-200 bg-slate-50 text-slate-600 opacity-70"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}) {opt}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {answered && !finished ? (
        <div className="tile-frame">
          <div className="tile-core p-4">
            <p className="mb-2 text-slate-800">
              {answerResult?.is_correct ? "Poprawna odpowiedź." : `Poprawna odpowiedź: ${answerResult?.correct_option ?? "-"}.`}
            </p>
            <button
              type="button"
              onClick={handleFinish}
              disabled={!answered}
              className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Zakończ
            </button>
          </div>
        </div>
      ) : null}

      {finished ? (
        <div className="tile-frame">
          <div className="tile-core p-4">
            <p className="text-slate-800">{xpToShow > 0 ? `+${xpToShow} XP` : "Ćwiczenie zakończone."}</p>
            <Link href={mapHref} className="mt-2 inline-block text-sm text-slate-600 underline hover:text-slate-900">
              Wróć do mapy {title}
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}

