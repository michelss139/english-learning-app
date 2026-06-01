"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LessonVocabPair } from "@/lib/lessons/vocabPairs";
import { normalizeLessonAnswer } from "@/lib/lessons/vocabPairs";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

/** Isolated training mode id: `lesson_vocab` — session is fully client-side (no API / knowledge). */

const cardBase =
  "rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 transition-all duration-200";

type Direction = "en_pl" | "pl_en";

type QueueItem = {
  source: string;
  target: string;
  dir: Direction;
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j]!;
    a[j] = t!;
  }
  return a;
}

function buildQueue(pairs: LessonVocabPair[]): QueueItem[] {
  const items: QueueItem[] = pairs.map((p) => ({
    source: p.source,
    target: p.target,
    dir: Math.random() < 0.5 ? "en_pl" : "pl_en",
  }));
  return shuffle(items);
}

export default function LessonVocabTrainClient({
  initialPairs,
  returnLessonId,
}: {
  initialPairs: LessonVocabPair[] | null;
  /** Set when opening „Przećwicz" from a lesson — enables „Wróć do lekcji" after session. */
  returnLessonId?: string;
}) {
  const lessonReturnHref = returnLessonId?.trim()
    ? `/app/lessons/${encodeURIComponent(returnLessonId.trim())}`
    : null;
  const basePairsRef = useRef<LessonVocabPair[]>(initialPairs ?? []);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startSession = useCallback(() => {
    const pairs = basePairsRef.current;
    if (!pairs.length) return;
    setQueue(buildQueue(pairs));
    setIndex(0);
    setInput("");
    setChecked(false);
    setLastCorrect(null);
    setSessionComplete(false);
    setSessionCorrectCount(0);
    setShowAnswer(false);
  }, []);

  useEffect(() => {
    if (initialPairs && initialPairs.length > 0) {
      basePairsRef.current = initialPairs;
      startSession();
    }
  }, [initialPairs, startSession]);

  const current = queue[index] ?? null;
  const prompt = current ? (current.dir === "en_pl" ? current.source : current.target) : "";
  const expected = current ? (current.dir === "en_pl" ? current.target : current.source) : "";
  const directionHint =
    current?.dir === "en_pl" ? "Przetłumacz na polski" : "Przetłumacz na angielski";

  const handleCheck = () => {
    if (!current || checked) return;
    const ok = normalizeLessonAnswer(input) === normalizeLessonAnswer(expected);
    setLastCorrect(ok);
    if (ok) setSessionCorrectCount((c) => c + 1);
    setChecked(true);
  };

  const handleNext = () => {
    if (!checked || index >= queue.length - 1) {
      if (checked && index >= queue.length - 1) setSessionComplete(true);
      return;
    }
    setIndex((i) => i + 1);
    setInput("");
    setChecked(false);
    setLastCorrect(null);
    setShowAnswer(false);
  };

  useEffect(() => {
    if (!sessionComplete && current && !checked) {
      inputRef.current?.focus();
    }
  }, [sessionComplete, current, checked, index]);

  const pct = queue.length > 0 ? Math.round((sessionCorrectCount / Math.max(index, 1)) * 100) : 0;

  if (!initialPairs || initialPairs.length === 0) {
    return (
      <main className="mx-auto max-w-xl space-y-5 px-3 py-8">
        <p className="text-sm text-slate-600">Brak par słownictwa w linku lub nieprawidłowy parametr.</p>
        <Link
          href="/app"
          className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
        >
          Wróć do strony głównej
        </Link>
      </main>
    );
  }

  if (sessionComplete) {
    const totalItems = queue.length;
    const correct = sessionCorrectCount;
    const ratio = totalItems > 0 ? correct / totalItems : 0;
    const finalPct = totalItems > 0 ? Math.round((correct / totalItems) * 100) : 0;

    return (
      <main className="mx-auto max-w-xl space-y-5 px-3 py-8">
        <header className="mb-5">
          <a href="/app" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700">
            ← Strona główna
          </a>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Powtórka z lekcji</h1>
        </header>
        <section className={`${cardBase} space-y-4`}>
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Wyniki sesji
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CorrectIcon size={18} /> Poprawne
              </span>
              <span className="text-sm font-bold tabular-nums text-emerald-800">{correct}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-rose-700">
                <WrongIcon size={18} /> Błędne
              </span>
              <span className="text-sm font-bold tabular-nums text-rose-800">{totalItems - correct}</span>
            </div>
          </div>
          <p className="text-right text-xs text-slate-400">{finalPct}% skuteczności</p>

          {ratio >= 1 ? (
            <p className="text-sm font-medium text-emerald-700">Brawo! Wszystko dobrze!</p>
          ) : ratio < 0.5 ? (
            <p className="text-sm text-slate-600">Spróbuj jeszcze raz.</p>
          ) : (
            <p className="text-sm text-slate-600">Powtórzyłeś słownictwo z lekcji.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-sky-400 to-blue-700 px-5 py-2.5 text-sm font-bold shadow-md shadow-blue-200/50 ring-1 ring-inset ring-white/20 transition hover:brightness-105"
              style={{ color: "#fff" }}
              onClick={startSession}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
              <span className="relative">Jeszcze raz</span>
            </button>
            {lessonReturnHref ? (
              <Link
                href={lessonReturnHref}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Wróć do lekcji
              </Link>
            ) : null}
            <Link
              href="/app"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Strona główna
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-5 px-3 py-8">
      {/* Header */}
      <header className="mb-5">
        <a href="/app" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700">
          ← Strona główna
        </a>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Powtórka z lekcji</h1>
      </header>

      {/* Question card */}
      <section className={`${cardBase} space-y-4`}>
        {/* Progress */}
        <div className="flex items-end justify-between">
          <span className="text-sm text-slate-500">
            <span className="text-lg font-bold text-slate-800">{index + 1}</span>
            <span className="text-slate-400"> / {queue.length}</span>
          </span>
          {index > 0 && (
            <div className="text-right">
              <div
                className={`text-2xl font-black leading-none tabular-nums ${
                  pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-orange-500"
                }`}
              >
                {pct}%
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                poprawnych
              </div>
            </div>
          )}
        </div>

        {/* Dot progress bar */}
        <div className="flex flex-wrap gap-1">
          {queue.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-500 ${
                i < index
                  ? "w-6 bg-emerald-400"
                  : i === index
                    ? "w-6 bg-sky-400"
                    : "w-2 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Eyebrow + Prompt */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {directionHint}
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 break-words">
            {prompt}
          </div>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            if (checked) return;
            setInput(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (checked) handleNext();
            else handleCheck();
          }}
          readOnly={checked}
          placeholder="Wpisz odpowiedź…"
          className="w-full rounded-xl border border-slate-100 bg-white/80 px-4 py-3.5 text-center text-sm text-slate-800 placeholder:text-slate-300 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
          autoComplete="off"
          spellCheck={false}
        />

        {showAnswer && !checked ? (
          <p className="text-xs text-slate-500">
            Podpowiedź: <span className="font-medium text-slate-700">{expected}</span>
          </p>
        ) : null}

        {/* Feedback */}
        {checked && lastCorrect === true && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 space-y-1.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <CorrectIcon size={18} /> Poprawnie!
            </p>
          </div>
        )}
        {checked && lastCorrect === false && (
          <div className="rounded-xl bg-orange-50/80 px-4 py-3.5 space-y-3">
            <div className="flex items-start gap-3">
              <WrongIcon size={28} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                  Twoja odpowiedź
                </p>
                <p className="mt-0.5 text-base font-semibold text-red-600">{input}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CorrectIcon size={28} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Poprawnie
                </p>
                <p className="mt-0.5 text-base font-bold text-slate-900">{expected}</p>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        {!checked ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleCheck}
              disabled={!input.trim()}
              className="relative flex-1 inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-sky-400 to-blue-700 py-3 text-sm font-bold shadow-md shadow-blue-200/50 ring-1 ring-inset ring-white/20 transition hover:brightness-105 hover:shadow-lg disabled:opacity-60"
              style={{ color: "#fff" }}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
              <span className="relative">Sprawdź</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAnswer((s) => !s)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {showAnswer ? "Ukryj odpowiedź" : "Pokaż odpowiedź"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {index >= queue.length - 1 ? "Zakończ" : "Dalej →"}
          </button>
        )}
      </section>
    </main>
  );
}
