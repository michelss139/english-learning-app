"use client";

import Link from "next/link";
import { BackButton } from "@/app/_components/BackButton";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { grammarAnswersMatch, GRAMMAR_NORMALIZE_OPTIONS } from "@/lib/grammar/normalizeAnswer";
import { TRAINING_CONTEXT_SUGGESTION, type TrainingEntryContext } from "@/lib/suggestions/suggestionContext";
import { xpZeroSessionMessage } from "@/lib/xp/xpSkipReasonUi";
import type { GapQuestion } from "@/lib/grammar/gapQuestions";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

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

const cardBase =
  "rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm";

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
  const pct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  return (
    <main className="mx-auto max-w-xl space-y-5">
      {/* Header */}
      <header className="mb-5">
        <BackButton href={mapHref} />
        <h1 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
          Ćwiczenie: {title}
        </h1>
      </header>

      {/* ── Starting / error ── */}
      {phase === "starting" && !startError && (
        <div className={`${cardBase} animate-pulse`}>
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="mt-3 h-8 w-3/4 rounded bg-slate-100" />
          <div className="mt-4 h-10 rounded bg-slate-100" />
        </div>
      )}
      {startError && (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
          {startError}
          <button
            type="button"
            onClick={handleRestart}
            className="mt-3 block rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* ── Question card ── */}
      {phase === "question" && currentQuestion && (
        <section className={`${cardBase} space-y-4`}>
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <span className="text-base text-slate-500">
                <span className="text-xl font-bold text-slate-800">{roundIndex + 1}</span>
                <span className="text-slate-400"> / {ROUND_SIZE}</span>
              </span>
              <div className="text-right">
                <div className={`text-3xl font-black leading-none tabular-nums ${
                  totalAnswered === 0 ? "text-slate-300"
                  : pct >= 70 ? "text-emerald-500"
                  : pct >= 40 ? "text-amber-500"
                  : "text-orange-500"
                }`}>
                  {totalAnswered === 0 ? "—" : `${pct}%`}
                </div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  poprawnych
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: ROUND_SIZE }).map((_, i) => {
                const isAnsweredCorrect = i < roundIndex && roundResults[i]?.correct === true;
                const isAnsweredWrong = i < roundIndex && roundResults[i]?.correct === false;
                const isCurrent = i === roundIndex;
                return (
                  <span key={i} className={`h-2 rounded-full transition-all duration-500 ${
                    isAnsweredCorrect ? "w-6 bg-emerald-400"
                    : isAnsweredWrong ? "w-6 bg-orange-400"
                    : isCurrent ? "w-6 bg-sky-400"
                    : "w-2 bg-slate-200"
                  }`} />
                );
              })}
            </div>
          </div>

          {/* Eyebrow + Prompt */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Uzupełnij lukę
            </div>
            <div className="mt-3 text-xl font-bold tracking-tight text-slate-900 leading-snug">
              {currentQuestion.prompt}
            </div>
            {currentQuestion.base_hint && (
              <p className="mt-1 text-sm text-slate-500">({currentQuestion.base_hint})</p>
            )}
          </div>

          {/* Input */}
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
            className="w-full rounded-xl border border-slate-100 bg-white/80 px-4 py-3.5 text-center text-sm text-slate-800 placeholder:text-slate-300 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
          />

          {/* Feedback */}
          {isAnswered && isCorrect && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 space-y-1.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                <CorrectIcon size={18} /> Poprawnie!
              </p>
            </div>
          )}
          {isAnswered && !isCorrect && (
            <div className="rounded-xl bg-orange-50/80 px-4 py-3.5 space-y-3">
              <div className="flex items-start gap-3">
                <WrongIcon size={28} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                    Twoja odpowiedź
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-red-600">{inputValue}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CorrectIcon size={28} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Poprawnie
                  </p>
                  <p className="mt-0.5 text-base font-bold text-slate-900">{canonicalAnswer}</p>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          {!isAnswered ? (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!inputValue.trim() || isSubmitting}
              className="relative w-full inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-bold transition hover:brightness-110 disabled:opacity-60"
              style={{ color: "#fff" }}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
              <span className="relative">Sprawdź</span>
            </button>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="relative inline-flex items-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold transition hover:brightness-110"
                style={{ color: "#fff" }}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                <span className="relative">{roundIndex + 1 < ROUND_SIZE ? "Dalej →" : "Podsumowanie →"}</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Round end ── */}
      {phase === "round-end" && (
        <section className={`${cardBase} space-y-4`}>
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Wyniki rundy
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CorrectIcon size={18} /> Poprawne
              </span>
              <span className="text-sm font-bold tabular-nums text-emerald-800">{roundCorrect}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-rose-700">
                <WrongIcon size={18} /> Błędne
              </span>
              <span className="text-sm font-bold tabular-nums text-rose-800">
                {ROUND_SIZE - roundCorrect}
              </span>
            </div>
          </div>

          {/* Mini results */}
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70">
            {roundResults.map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 shrink-0">
                  {r.correct ? <CorrectIcon size={18} /> : <WrongIcon size={18} />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 leading-snug">{r.question.prompt}</p>
                  {!r.correct && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Twoja:{" "}
                      <span className="font-medium text-red-600">{r.userAnswer}</span>
                      {" · "}
                      Poprawna:{" "}
                      <span className="font-medium text-emerald-700">{r.canonicalAnswer}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-right text-xs text-slate-400">
            {totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}% skuteczności łącznie
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleContinue}
              className="relative inline-flex items-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold transition hover:brightness-110"
              style={{ color: "#fff" }}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
              <span className="relative">Kontynuuj ćwiczenie →</span>
            </button>
            <button
              type="button"
              onClick={() => void handleFinish()}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Zakończ
            </button>
          </div>
        </section>
      )}

      {/* ── Completing spinner ── */}
      {phase === "completing" && (
        <div className={`${cardBase} animate-pulse`}>
          <div className="h-4 w-1/3 rounded bg-slate-100" />
          <div className="mt-3 h-6 w-1/2 rounded bg-slate-100" />
        </div>
      )}

      {/* ── Done screen ── */}
      {phase === "done" && (
        <section className={`${cardBase} space-y-4`}>
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Wyniki sesji
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CorrectIcon size={18} /> Poprawne
              </span>
              <span className="text-sm font-bold tabular-nums text-emerald-800">{totalCorrect}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-rose-700">
                <WrongIcon size={18} /> Błędne
              </span>
              <span className="text-sm font-bold tabular-nums text-rose-800">
                {totalAnswered - totalCorrect}
              </span>
            </div>
          </div>
          <p className="text-right text-xs text-slate-400">
            {totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}% skuteczności
          </p>

          {/* XP */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 space-y-1.5 text-sm text-slate-700">
            {award === null && completeError ? (
              <p className="text-rose-600">{completeError}</p>
            ) : award ? (
              <>
                {award.xp_awarded > 0 ? (
                  <div className="text-base font-semibold text-slate-900">+{award.xp_awarded} XP</div>
                ) : (
                  <p className="text-amber-700">{xpZeroSessionMessage(award.xp_skip_reason)}</p>
                )}
                <div>
                  Poziom:{" "}
                  <span className="font-medium text-slate-900">{award.level}</span>
                  {" · "}
                  XP:{" "}
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
              className="relative inline-flex items-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold transition hover:brightness-110"
              style={{ color: "#fff" }}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
              <span className="relative">Jeszcze raz</span>
            </button>
            <BackButton href={mapHref} label="Wróć do teorii" />
          </div>
        </section>
      )}
    </main>
  );
}
