"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
            question_id: question.id,
            selected_option: value,
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
          body: JSON.stringify({ session_id: sessionId }),
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
      <div className="flex items-center justify-between">
        <Link
          href={mapHref}
          className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
        >
          ← {mapLabel}
        </Link>
        <Link href="/app/grammar" className="text-sm text-white/70 hover:text-white">
          Spis treści
        </Link>
      </div>

      <h1 className="text-xl font-semibold text-white">Ćwiczenie: {title}</h1>

      {saveToast ? (
        <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white/75">{saveToast}</div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">{error}</div>
      ) : null}

      {question && !finished ? (
        <div className="rounded-xl border border-white/15 bg-white/5 p-5">
          <p className="mb-4 text-lg text-white">{question.prompt}</p>
          <ul className="space-y-2">
            {options.map((opt, idx) => (
              <li key={opt}>
                <button
                  type="button"
                  disabled={answered || !sessionId}
                  onClick={() => submitAnswer(opt)}
                  className={`w-full rounded-lg border px-4 py-2 text-left text-white transition ${
                    !answered
                      ? "border-white/20 bg-white/10 hover:bg-white/15"
                      : opt === chosen
                        ? answerResult?.is_correct
                          ? "border-green-400/50 bg-green-500/20"
                          : "border-red-400/50 bg-red-500/20"
                        : "border-white/10 bg-white/5 opacity-70"
                  }`}
                >
                  {String.fromCharCode(65 + idx)}) {opt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {answered && !finished ? (
        <div className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="mb-2 text-white">
            {answerResult?.is_correct ? "Poprawna odpowiedź." : `Poprawna odpowiedź: ${answerResult?.correct_option ?? "-"}.`}
          </p>
          <button
            type="button"
            onClick={handleFinish}
            disabled={!answered}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Zakończ
          </button>
        </div>
      ) : null}

      {finished ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-white">{xpToShow > 0 ? `+${xpToShow} XP` : "Ćwiczenie zakończone."}</p>
          <Link href={mapHref} className="mt-2 inline-block text-sm text-white/80 underline hover:text-white">
            Wróć do mapy {title}
          </Link>
        </div>
      ) : null}
    </main>
  );
}

