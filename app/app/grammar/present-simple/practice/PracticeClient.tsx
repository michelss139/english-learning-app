"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type PracticeQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

export function PracticeClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{ is_correct: boolean; correct_option: string } | null>(null);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeResult, setCompleteResult] = useState<{ xp_awarded?: number } | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) {
          router.push("/login");
          return;
        }

        const startRes = await fetch("/api/grammar/start", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ exercise_slug: "present-simple" }),
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
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  const submitAnswer = async (value: string) => {
    if (!sessionId || !question || answerSubmitting || chosen) return;
    setAnswerSubmitting(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/grammar/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: question.id,
          selected_option: value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Nie udało się zapisać odpowiedzi.");
      }
      setChosen(value);
      setAnswerResult({ is_correct: !!data.is_correct, correct_option: data.correct_option });
    } catch (e: any) {
      setError(e?.message || "Błąd zapisu odpowiedzi.");
    } finally {
      setAnswerSubmitting(false);
    }
  };

  const handleFinish = async () => {
    if (!sessionId || !chosen) return;
    setCompleteLoading(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/grammar/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Nie udało się zakończyć sesji.");
      }
      setCompleteResult(data);
      setFinished(true);
    } catch (e: any) {
      setError(e?.message || "Błąd kończenia sesji.");
    } finally {
      setCompleteLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <p className="text-white/80">Ładuję…</p>
      </main>
    );
  }

  const answered = chosen !== null;
  const options = question?.options ?? [];

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app/grammar/present-simple"
          className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
        >
          ← Mapa Present Simple
        </Link>
        <Link href="/app/grammar" className="text-sm text-white/70 hover:text-white">
          Spis treści
        </Link>
      </div>

      <h1 className="text-xl font-semibold text-white">Ćwiczenie: Present Simple</h1>

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">{error}</div>
      ) : null}

      <div className="rounded-xl border border-white/15 bg-white/5 p-5">
        <p className="mb-4 text-lg text-white">{question?.prompt ?? "Brak pytania."}</p>
        <ul className="space-y-2">
          {options.map((opt, idx) => (
            <li key={opt}>
              <button
                type="button"
                disabled={answered || answerSubmitting || !question}
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

      {answered && !finished && (
        <div className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="mb-2 text-white">
            {answerResult?.is_correct
              ? "Poprawna odpowiedź."
              : `Poprawna odpowiedź: ${answerResult?.correct_option ?? "-"}.`}
          </p>
          <button
            type="button"
            onClick={handleFinish}
            disabled={completeLoading || !answered}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {completeLoading ? "Zapisywanie…" : "Zakończ"}
          </button>
        </div>
      )}

      {finished && completeResult && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-white">
            {completeResult.xp_awarded ? `+${completeResult.xp_awarded} XP` : "Ćwiczenie zakończone."}
          </p>
          <Link
            href="/app/grammar/present-simple"
            className="mt-2 inline-block text-sm text-white/80 underline hover:text-white"
          >
            Wróć do mapy Present Simple
          </Link>
        </div>
      )}
    </main>
  );
}
