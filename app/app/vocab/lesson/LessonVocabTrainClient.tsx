"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LessonVocabPair } from "@/lib/lessons/vocabPairs";
import { normalizeLessonAnswer } from "@/lib/lessons/vocabPairs";

/** Isolated training mode id: `lesson_vocab` — session is fully client-side (no API / knowledge). */

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

const btnPrimary =
  "rounded-xl border border-slate-900 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50";

function InlineResultGlyph({ ok }: { ok: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium leading-none ${
        ok ? "border-green-600 text-green-600" : "border-red-500 text-red-500"
      }`}
      aria-hidden
    >
      {ok ? "✓" : "✕"}
    </span>
  );
}

export default function LessonVocabTrainClient({
  initialPairs,
  returnLessonId,
}: {
  initialPairs: LessonVocabPair[] | null;
  /** Set when opening „Przećwicz” from a lesson — enables „Wróć do lekcji” after session. */
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

  const inputBorderClass = checked
    ? lastCorrect
      ? "border-green-400"
      : "border-red-400"
    : "border-slate-300";

  if (!initialPairs || initialPairs.length === 0) {
    return (
      <main className="mx-auto max-w-lg space-y-4 px-3 py-8">
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

    return (
      <main className="mx-auto max-w-lg space-y-6 px-3 py-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Powtórka z lekcji</h1>
        </header>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <p className="text-base font-semibold text-slate-900">
              {correct}/{totalItems} poprawne
            </p>
            {ratio >= 1 ? (
              <p className="text-sm font-medium text-emerald-700">Brawo! Wszystko dobrze!</p>
            ) : ratio < 0.5 ? (
              <p className="text-sm text-slate-600">Spróbuj jeszcze raz</p>
            ) : (
              <p className="text-sm text-slate-600">Powtórzyłeś słownictwo z lekcji.</p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={startSession}>
              Jeszcze raz
            </button>
            {lessonReturnHref ? (
              <Link href={lessonReturnHref} className={`${btnPrimary} w-full text-center sm:w-auto`}>
                Wróć do lekcji
              </Link>
            ) : null}
            <Link
              href="/app"
              className="text-center text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 sm:text-left"
            >
              Wróć do strony głównej
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 px-3 py-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Powtórka z lekcji</h1>
            <p className="text-sm text-slate-500">
              Postęp: {index + 1} / {queue.length}
            </p>
          </div>
          <Link
            href="/app"
            className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
          >
            Wróć do strony głównej
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-slate-900 break-words">{prompt}</div>
          <div className="text-sm text-slate-500">{directionHint}</div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Odpowiedź</label>
          <div className="flex items-center gap-3">
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
              className={`min-w-0 flex-1 rounded-xl border bg-white px-4 py-3 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 ${inputBorderClass}`}
              autoComplete="off"
              spellCheck={false}
            />
            {checked && lastCorrect !== null ? <InlineResultGlyph ok={lastCorrect} /> : null}
          </div>

          {checked && lastCorrect === true ? (
            <p className="text-xs text-slate-500">Poprawnie</p>
          ) : null}

          {checked && lastCorrect === false ? (
            <p className="text-xs text-slate-500">
              Oczekiwano: <span className="text-slate-700">{expected}</span>
            </p>
          ) : null}

          {showAnswer && !checked ? (
            <p className="text-xs text-slate-500">
              Podpowiedź: <span className="text-slate-700">{expected}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {!checked ? (
            <>
              <button
                type="button"
                className={`${btnPrimary} flex-1`}
                onClick={handleCheck}
                disabled={!input.trim()}
              >
                Sprawdź
              </button>
              <button type="button" className={`${btnPrimary} flex-1`} onClick={() => setShowAnswer((s) => !s)}>
                {showAnswer ? "Ukryj odpowiedź" : "Pokaż odpowiedź"}
              </button>
            </>
          ) : (
            <button type="button" className={`${btnPrimary} w-full`} onClick={handleNext}>
              {index >= queue.length - 1 ? "Zakończ" : "Dalej"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
