"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { grammarAnswersMatch, GRAMMAR_NORMALIZE_OPTIONS } from "@/lib/grammar/normalizeAnswer";
import { TRAINING_CONTEXT_SUGGESTION, type TrainingEntryContext } from "@/lib/suggestions/suggestionContext";
import { xpZeroSessionMessage } from "@/lib/xp/xpSkipReasonUi";
import type { GapQuestion } from "@/lib/grammar/gapQuestions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "starting" | "question" | "round-end" | "completing" | "done";

type RoundResult = {
  question: GapQuestion;
  userAnswer: string;
  correct: boolean;
  canonicalAnswer: string;
};

type AwardResult = {
  xp_awarded: number;
  xp_skip_reason: string | null;
  level: number;
  xp_in_current_level: number;
  xp_to_next_level: number;
  newly_awarded_badges: { slug: string; title: string; description: string | null }[];
  total: number;
  correct: number;
  wrong: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROUND_SIZE = 3;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRound(
  all: GapQuestion[],
  excluded: Set<string>,
): { questions: GapQuestion[]; newExcluded: Set<string> } {
  const available = all.filter((q) => !excluded.has(q.id));
  const pool = available.length >= ROUND_SIZE ? available : all;
  const picked = shuffle(pool).slice(0, ROUND_SIZE);
  const newExcluded =
    available.length >= ROUND_SIZE
      ? new Set([...excluded, ...picked.map((q) => q.id)])
      : new Set(picked.map((q) => q.id));
  return { questions: picked, newExcluded };
}

function checkAnswer(userAnswer: string, question: GapQuestion): boolean {
  return (
    grammarAnswersMatch(userAnswer, question.expected_answer, GRAMMAR_NORMALIZE_OPTIONS) ||
    question.accepted_answers.some((a) =>
      grammarAnswersMatch(userAnswer, a, GRAMMAR_NORMALIZE_OPTIONS),
    )
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GapFillPracticeClient({
  exerciseSlug,
  title,
  mapHref,
  mapLabel,
  initialQuestions,
}: {
  exerciseSlug: string;
  title: string;
  mapHref: string;
  mapLabel: string;
  initialQuestions: GapQuestion[];
}) {
  const searchParams = useSearchParams();
  const trainingEntryContext: TrainingEntryContext | undefined =
    searchParams.get("context") === TRAINING_CONTEXT_SUGGESTION
      ? TRAINING_CONTEXT_SUGGESTION
      : undefined;

  // Session
  const [phase, setPhase] = useState<Phase>("starting");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Round
  const [roundQuestions, setRoundQuestions] = useState<GapQuestion[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // Answer state
  const [inputValue, setInputValue] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [canonicalAnswer, setCanonicalAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Session totals
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);

  // Done screen
  const [award, setAward] = useState<AwardResult | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Input ref for auto-focus
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Start session ──────────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    setPhase("starting");
    setStartError(null);
    setSessionId(null);
    setTotalAnswered(0);
    setTotalCorrect(0);
    setAward(null);
    setCompleteError(null);
    setExcludedIds(new Set());

    if (initialQuestions.length === 0) {
      setStartError("Brak pytań dla tego ćwiczenia.");
      return;
    }

    try {
      const res = await fetch("/api/training/grammar/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: exerciseSlug,
          ...(trainingEntryContext ? { context: trainingEntryContext } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStartError(data?.error ?? `Błąd serwera (${res.status})`);
        return;
      }
      const sid: string = data.sessionId;
      setSessionId(sid);

      const { questions: rq, newExcluded } = pickRound(initialQuestions, new Set());
      setRoundQuestions(rq);
      setExcludedIds(newExcluded);
      setRoundIndex(0);
      setRoundResults([]);
      setInputValue("");
      setIsAnswered(false);
      setPhase("question");
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Nie udało się rozpocząć sesji.");
    }
  }, [exerciseSlug, trainingEntryContext, initialQuestions]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void startSession();
  }, [startSession]);

  // Auto-focus input when a new question appears
  useEffect(() => {
    if (phase === "question" && !isAnswered) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [phase, roundIndex, isAnswered]);

  // ── Submit answer ──────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (isAnswered || isSubmitting || !sessionId) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const question = roundQuestions[roundIndex];
    if (!question) return;

    const correct = checkAnswer(trimmed, question);
    const canonical = question.expected_answer;

    setIsCorrect(correct);
    setCanonicalAnswer(canonical);
    setIsAnswered(true);
    setIsSubmitting(true);

    setTotalAnswered((n) => n + 1);
    if (correct) setTotalCorrect((n) => n + 1);
    setRoundResults((prev) => [
      ...prev,
      { question, userAnswer: trimmed, correct, canonicalAnswer: canonical },
    ]);

    // Persist to knowledge engine (fire and forget)
    try {
      await fetch("/api/grammar/gap-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          exercise_slug: exerciseSlug,
          gap_question_id: question.id,
          answer_text: trimmed,
        }),
      });
    } catch {
      // Non-blocking
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isAnswered) {
        handleNext();
      } else {
        void handleSubmit();
      }
    }
  };

  // ── Next question ──────────────────────────────────────────────────────────

  const handleNext = () => {
    const nextIdx = roundIndex + 1;
    if (nextIdx < roundQuestions.length) {
      setRoundIndex(nextIdx);
      setInputValue("");
      setIsAnswered(false);
    } else {
      setPhase("round-end");
    }
  };

  // ── Continue (next round) ──────────────────────────────────────────────────

  const handleContinue = () => {
    const { questions: rq, newExcluded } = pickRound(initialQuestions, excludedIds);
    setRoundQuestions(rq);
    setExcludedIds(newExcluded);
    setRoundIndex(0);
    setRoundResults([]);
    setInputValue("");
    setIsAnswered(false);
    setPhase("question");
  };

  // ── Finish session ─────────────────────────────────────────────────────────

  const handleFinish = async () => {
    if (!sessionId) return;
    setPhase("completing");
    setCompleteError(null);

    try {
      const res = await fetch("/api/grammar/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, slug: exerciseSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAward(data as AwardResult);
      } else {
        setCompleteError(data?.error ?? `Błąd (${res.status})`);
      }
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : "Nie udało się zakończyć sesji.");
    }
    setPhase("done");
  };

  // ── Restart ────────────────────────────────────────────────────────────────

  const handleRestart = () => {
    startedRef.current = false;
    void startSession();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const currentQuestion = roundQuestions[roundIndex] ?? null;
  const roundCorrect = roundResults.filter((r) => r.correct).length;

  return (
    <main className="space-y-5">
      {/* Header */}
      <header className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Ćwiczenie: {title}
            </h1>
            {phase === "question" && (
              <p className="text-sm text-slate-500">
                Pytanie{" "}
                <span className="font-medium text-slate-700">{roundIndex + 1}</span> z{" "}
                <span className="font-medium text-slate-700">{ROUND_SIZE}</span>
                {totalAnswered > 0 && (
                  <>
                    {" "}·{" "}
                    <span className="font-medium text-slate-700">{totalCorrect}</span>/
                    {totalAnswered} poprawnych łącznie
                  </>
                )}
              </p>
            )}
            {phase === "round-end" && totalAnswered > 0 && (
              <p className="text-sm text-slate-500">
                Łącznie:{" "}
                <span className="font-medium text-slate-700">{totalCorrect}</span>/
                {totalAnswered} poprawnych
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={mapHref} className="tile-frame">
              <span className="tile-core inline-flex items-center rounded-[11px] px-3 py-2 text-sm font-medium text-slate-700">
                ← {mapLabel}
              </span>
            </Link>
            <Link href="/app/grammar" className="tile-frame">
              <span className="tile-core inline-flex items-center rounded-[11px] px-3 py-2 text-sm font-medium text-slate-700">
                Gramatyka
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Starting / error ── */}
      {phase === "starting" && !startError && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-8 text-center text-sm text-slate-400">
          Ładowanie ćwiczenia…
        </div>
      )}
      {startError && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <p className="text-sm text-red-600">{startError}</p>
          <button
            type="button"
            onClick={handleRestart}
            className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* ── Question card ── */}
      {phase === "question" && currentQuestion && (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {roundQuestions.map((_, i) => {
              const done = i < roundIndex || (i === roundIndex && isAnswered);
              const active = i === roundIndex;
              return (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    done
                      ? "w-6 bg-slate-700"
                      : active
                        ? "w-6 bg-sky-400"
                        : "w-2 bg-slate-200"
                  }`}
                />
              );
            })}
          </div>

          {/* Prompt */}
          <div className="space-y-1">
            <p className="text-lg font-medium text-slate-900 leading-snug">
              {currentQuestion.prompt}
            </p>
            {currentQuestion.base_hint && (
              <p className="text-sm text-slate-500">({currentQuestion.base_hint})</p>
            )}
          </div>

          {/* Text input */}
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAnswered}
              placeholder="Wpisz odpowiedź…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-300 outline-none transition-all
                focus:ring-2 focus:ring-sky-400/30
                ${
                  isAnswered
                    ? isCorrect
                      ? "border-green-400 bg-green-50"
                      : "border-red-400 bg-red-50"
                    : "border-slate-200 bg-white hover:border-slate-300 focus:border-sky-400"
                }`}
            />
            {!isAnswered && (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!inputValue.trim() || isSubmitting}
                className="rounded-xl border border-slate-900 bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sprawdź
              </button>
            )}
          </div>

          {/* Feedback + Dalej */}
          {isAnswered && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 border-t border-slate-100">
              <div>
                {isCorrect ? (
                  <p className="text-sm font-medium text-green-700">✓ Poprawnie!</p>
                ) : (
                  <p className="text-sm text-red-600">
                    ✕ Poprawna odpowiedź:{" "}
                    <strong className="font-semibold">{canonicalAnswer}</strong>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="self-start rounded-xl border border-slate-900 bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
              >
                {roundIndex + 1 < ROUND_SIZE ? "Dalej →" : "Podsumowanie →"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Round end ── */}
      {phase === "round-end" && (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Runda zakończona</h2>
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900">
              {roundCorrect}/{ROUND_SIZE}
            </span>
          </div>

          {/* Mini results */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 divide-y divide-slate-100 overflow-hidden">
            {roundResults.map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${
                    r.correct
                      ? "border-green-500/40 text-green-600"
                      : "border-red-400/40 text-red-500"
                  }`}
                >
                  {r.correct ? "✓" : "✕"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 leading-snug">{r.question.prompt}</p>
                  {!r.correct && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Twoja odpowiedź:{" "}
                      <span className="text-red-600 font-medium">{r.userAnswer}</span>
                      {" · "}
                      Poprawna:{" "}
                      <span className="text-green-700 font-medium">{r.canonicalAnswer}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Continue / Finish */}
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Kontynuujesz czy kończymy?</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-xl border border-slate-900 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
              >
                Kontynuuj ćwiczenie →
              </button>
              <button
                type="button"
                onClick={() => void handleFinish()}
                className="rounded-xl border border-slate-300 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-white hover:border-slate-400 hover:text-slate-900 transition"
              >
                Zakończ
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Completing spinner ── */}
      {phase === "completing" && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-8 text-center text-sm text-slate-400">
          Zapisuję wyniki…
        </div>
      )}

      {/* ── Done screen ── */}
      {phase === "done" && (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Sesja zakończona</h2>
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900">
              {totalCorrect}/{totalAnswered}
            </span>
          </div>

          {/* Stats */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-5 py-4 space-y-2 text-sm text-slate-700">
            <div>
              Odpowiedzi:{" "}
              <span className="font-medium text-slate-900">{totalAnswered}</span>
            </div>
            <div>
              Poprawne:{" "}
              <span className="font-medium text-slate-900">{totalCorrect}</span>
              {" · "}
              Błędne:{" "}
              <span className="font-medium text-slate-900">
                {totalAnswered - totalCorrect}
              </span>
            </div>
            {totalAnswered > 0 && (
              <div>
                Skuteczność:{" "}
                <span className="font-medium text-slate-900">
                  {Math.round((totalCorrect / totalAnswered) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* XP */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-5 py-4 space-y-1.5 text-sm text-slate-700">
            {award === null && completeError ? (
              <p className="text-red-600">{completeError}</p>
            ) : award ? (
              <>
                {award.xp_awarded > 0 ? (
                  <div>
                    <span className="font-semibold text-slate-900 text-base">
                      +{award.xp_awarded} XP
                    </span>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">
                    {xpZeroSessionMessage(award.xp_skip_reason)}
                  </p>
                )}
                <div>
                  Poziom:{" "}
                  <span className="font-medium text-slate-900">{award.level}</span>
                  {" · "}
                  XP w poziomie:{" "}
                  <span className="font-medium text-slate-900">
                    {award.xp_in_current_level}/{award.xp_to_next_level}
                  </span>
                </div>
                {award.newly_awarded_badges?.length > 0 && (
                  <div className="mt-2 rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2 space-y-0.5">
                    <p className="text-xs font-semibold text-amber-700">Nowe odznaki</p>
                    {award.newly_awarded_badges.map((b) => (
                      <p key={b.slug} className="text-xs text-amber-700">
                        {b.title}
                        {b.description ? ` — ${b.description}` : ""}
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400">Brak danych o XP.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRestart}
              className="rounded-xl border border-slate-900 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
            >
              Jeszcze raz
            </button>
            <Link
              href={mapHref}
              className="rounded-xl border border-slate-300 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-white hover:border-slate-400 hover:text-slate-900 transition"
            >
              ← Wróć do teorii
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
