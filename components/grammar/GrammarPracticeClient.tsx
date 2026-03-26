"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type GrammarPracticeClientProps = {
  sentence: string;
  base: string;
  correctAnswer: string;
  questionId: string;
  mapHref: string;
  exerciseSlug: string;
};

export function GrammarPracticeClient({
  sentence,
  base,
  correctAnswer,
  questionId,
  mapHref,
  exerciseSlug,
}: GrammarPracticeClientProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!exerciseSlug) return;
    if (startedRef.current) return;
    startedRef.current = true;

    fetch("/api/training/grammar/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: exerciseSlug }),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data?.sessionId) setSessionId(data.sessionId);
      })
      .catch(() => {});
  }, [exerciseSlug]);

  const handleCheck = () => {
    if (checked && isCorrect === true) return;
    if (!answer.trim() || !sessionId || submitting) return;

    setSubmitting(true);
    setGradingError(null);

    void (async () => {
      try {
        const answerRes = await fetch("/api/grammar/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            exercise_slug: exerciseSlug,
            question_id: questionId,
            answer_text: answer,
          }),
        });
        const answerData = (await answerRes.json().catch(() => ({}))) as {
          ok?: boolean;
          is_correct?: boolean;
          error?: string;
        };

        if (!answerRes.ok) {
          setGradingError(answerData?.error ?? `HTTP ${answerRes.status}`);
          setSubmitting(false);
          return;
        }

        if (typeof answerData.is_correct !== "boolean") {
          setGradingError("Invalid response from server");
          setSubmitting(false);
          return;
        }

        const correct = answerData.is_correct;
        setChecked(true);
        setIsCorrect(correct);
        if (correct) setAnswer("");

        if (correct) {
          const completeRes = await fetch("/api/grammar/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, slug: exerciseSlug }),
          });
          const completeData = await completeRes.json().catch(() => ({}));
          if (completeRes.ok && typeof completeData.xp_awarded === "number") {
            setXpAwarded(completeData.xp_awarded);
          } else {
            setXpAwarded(-1);
          }
        }
      } catch {
        setGradingError("Nie udało się sprawdzić odpowiedzi.");
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const handleTryAgain = () => {
    setChecked(false);
    setIsCorrect(null);
    setGradingError(null);
    setAnswer("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="tile-frame">
      <div className="tile-core p-5">
        <p className="mb-4 text-lg text-slate-900">
          {sentence}
          {base ? ` (${base})` : ""}
        </p>

        <div className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!checked || isCorrect === false) void handleCheck();
              }
            }}
            disabled={(checked && isCorrect === true) || submitting}
            placeholder="Wpisz odpowiedź..."
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 disabled:bg-slate-100 disabled:text-slate-600"
          />

          {gradingError ? <p className="text-sm text-red-600">{gradingError}</p> : null}

          {!checked ? (
            <button
              type="button"
              onClick={() => void handleCheck()}
              disabled={!answer.trim() || !sessionId || submitting}
              className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sprawdzanie…" : "Sprawdź"}
            </button>
          ) : isCorrect === true ? (
            <div className="space-y-2">
              <p className="text-sky-700 font-medium">Poprawnie</p>
              {xpAwarded !== null && xpAwarded > 0 && (
                <p className="text-sm text-slate-600">
                  Zdobyte XP: <span className="font-medium text-slate-900">+{xpAwarded}</span>
                </p>
              )}
              {xpAwarded === 0 && (
                <p className="text-sm text-amber-700">
                  Już dostałeś XP za to ćwiczenie dziś. Wróć jutro po więcej!
                </p>
              )}
              {xpAwarded === null && sessionId && (
                <p className="text-sm text-slate-500">Przyznaję XP…</p>
              )}
              {xpAwarded === -1 && (
                <p className="text-sm text-slate-500">Nie udało się pobrać informacji o XP.</p>
              )}
              <Link
                href={mapHref}
                className="inline-block rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Dalej
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-red-700">
                Błąd. Poprawna odpowiedź: {correctAnswer}
              </p>
              <button
                type="button"
                onClick={handleTryAgain}
                className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Spróbuj ponownie
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
