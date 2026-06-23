"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

type QuizItem = {
  senseId: string;
  lemma: string;
  translation: string;
  knowledgeState: string;
};

type QuizQuestion = {
  senseId: string;
  lemma: string;
  correctTranslation: string;
  options: string[];
  correctIndex: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(items: QuizItem[], limit = 10): QuizQuestion[] {
  const priority: Record<string, number> = { unstable: 0, improving: 1, new: 2, mastered: 3 };
  const sorted = [...items].sort(
    (a, b) => (priority[a.knowledgeState] ?? 2) - (priority[b.knowledgeState] ?? 2)
  );

  const allTranslations = items.map((i) => i.translation);
  const questions: QuizQuestion[] = [];

  for (const item of sorted.slice(0, limit)) {
    const distractors = shuffle(allTranslations.filter((t) => t !== item.translation)).slice(0, 3);
    if (distractors.length < 3) continue;

    const options = shuffle([item.translation, ...distractors]);
    const correctIndex = options.indexOf(item.translation);

    questions.push({
      senseId: item.senseId,
      lemma: item.lemma,
      correctTranslation: item.translation,
      options,
      correctIndex,
    });
  }

  return questions;
}

type QuizState = "loading" | "question" | "answered" | "done" | "error" | "empty";

export default function PoolQuizRunner({ onExit }: { onExit: () => void }) {
  const [state, setState] = useState<QuizState>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [results, setResults] = useState<boolean[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const loadItems = useCallback(async () => {
    setState("loading");
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore({ correct: 0, wrong: 0 });
    setResults([]);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Brak sesji");

      const res = await fetch("/api/vocab/pool/overview", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Nie udało się załadować słówek");

      const data = (await res.json()) as {
        segments: {
          review: { sense_id: string | null; lemma: string; translation: string | null }[];
          learning: { sense_id: string | null; lemma: string; translation: string | null }[];
          new: { sense_id: string | null; lemma: string; translation: string | null }[];
          mastered: { sense_id: string | null; lemma: string; translation: string | null }[];
        };
      };

      const segMap: [keyof typeof data.segments, string][] = [
        ["review", "unstable"],
        ["learning", "improving"],
        ["new", "new"],
        ["mastered", "mastered"],
      ];

      const items: QuizItem[] = [];
      for (const [seg, state] of segMap) {
        for (const i of data.segments[seg]) {
          if (i.sense_id && i.lemma && i.translation) {
            items.push({
              senseId: i.sense_id,
              lemma: i.lemma,
              translation: i.translation,
              knowledgeState: state,
            });
          }
        }
      }

      if (items.length < 4) {
        setState("empty");
        return;
      }

      const qs = buildQuestions(items, 10);
      if (qs.length === 0) {
        setState("empty");
        return;
      }

      setQuestions(qs);
      setState("question");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Nieznany błąd");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const registerAnswer = async (senseId: string, isCorrect: boolean) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      await fetch("/api/vocab/training/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sense_id: senseId, is_correct: isCorrect }),
      });
    } catch {
      // Non-blocking — quiz continues regardless
    }
  };

  const handleOptionSelect = async (optionIndex: number) => {
    if (state !== "question" || selectedOption !== null) return;
    const q = questions[currentIndex];
    if (!q) return;

    const isCorrect = optionIndex === q.correctIndex;
    setSelectedOption(optionIndex);
    setState("answered");
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
    }));
    setResults((prev) => [...prev, isCorrect]);

    await registerAnswer(q.senseId, isCorrect);
  };

  const handleNext = () => {
    const next = currentIndex + 1;
    if (next >= questions.length) {
      setState("done");
    } else {
      setCurrentIndex(next);
      setSelectedOption(null);
      setState("question");
    }
  };

  const q = questions[currentIndex];
  const total = questions.length;
  const answeredCount = score.correct + score.wrong;
  const percentCorrect = answeredCount > 0 ? Math.round((score.correct / answeredCount) * 100) : 0;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-slate-500">Przygotowuję quiz…</div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {errorMsg}
        <button onClick={onExit} className="ml-3 underline">
          Wróć
        </button>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (state === "empty") {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-800">Za mało słówek z tłumaczeniami.</p>
        <p className="mt-1 text-sm text-slate-500">
          Dodaj przynajmniej 4 słówka z tłumaczeniami, by zagrać w quiz.
        </p>
        <button
          onClick={onExit}
          className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          ← Wróć
        </button>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (state === "done") {
    const total = score.correct + score.wrong;
    const pct = total > 0 ? Math.round((score.correct / total) * 100) : 0;
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚";

    return (
      <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-8 text-center shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Wynik quizu</p>
        <p className="mt-3 text-5xl" role="img" aria-label={`${pct}%`}>
          {emoji}
        </p>
        <p className="mt-3 text-4xl font-black tracking-tight text-slate-900">{pct}%</p>
        <p className="mt-1 text-sm text-slate-500">
          {score.correct} z {total} poprawnych
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={loadItems}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Zagraj znowu
          </button>
          <button
            onClick={onExit}
            className="relative inline-flex items-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold transition hover:brightness-110"
            style={{ color: "#fff" }}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
            <span className="relative">Wróć →</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Question / Answered ───────────────────────────────────────────────────
  if (!q) return null;
  const isAnswered = state === "answered";

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <span className="text-base text-slate-500">
            <span className="text-xl font-bold text-slate-800">{currentIndex + 1}</span>
            <span className="text-slate-400"> / {total}</span>
          </span>
          <div className="flex items-end gap-4">
            <div className="text-right">
              <div className={`text-3xl font-black leading-none tabular-nums ${
                answeredCount === 0 ? "text-slate-300"
                : percentCorrect >= 70 ? "text-emerald-500"
                : percentCorrect >= 40 ? "text-amber-500"
                : "text-orange-500"
              }`}>
                {answeredCount === 0 ? "—" : `${percentCorrect}%`}
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                poprawnych
              </div>
            </div>
            <button
              onClick={onExit}
              className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              Zakończ
            </button>
          </div>
        </div>
        {total <= 25 ? (
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: total }).map((_, i) => {
              const isAnsweredCorrect = i < currentIndex && results[i] === true;
              const isAnsweredWrong = i < currentIndex && results[i] === false;
              const isCurrent = i === currentIndex;
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
        ) : (
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="flex h-full">
              <div className="bg-emerald-400 transition-all duration-500"
                style={{ width: `${total ? (score.correct / total) * 100 : 0}%` }} />
              <div className="bg-orange-400 transition-all duration-500"
                style={{ width: `${total ? (score.wrong / total) * 100 : 0}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-6 text-center shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
          Jak przetłumaczyć?
        </p>
        <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{q.lemma}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {q.options.map((option, idx) => {
          const isCorrectOpt = idx === q.correctIndex;
          const isSelected = selectedOption === idx;

          let cls =
            "relative flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all duration-150 ";

          if (!isAnswered) {
            cls +=
              "border-slate-200/70 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm";
          } else if (isCorrectOpt) {
            cls += "border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300";
          } else if (isSelected && !isCorrectOpt) {
            cls += "border-rose-300 bg-rose-50 text-rose-700";
          } else {
            cls += "border-slate-100 bg-slate-50/50 text-slate-400";
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswered}
              onClick={() => void handleOptionSelect(idx)}
              className={cls}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{option}</span>
              {isAnswered && isCorrectOpt && (
                <span className="ml-auto"><CorrectIcon size={18} /></span>
              )}
              {isAnswered && isSelected && !isCorrectOpt && (
                <span className="ml-auto"><WrongIcon size={18} /></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Next */}
      {isAnswered && (
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${selectedOption === q.correctIndex ? "text-emerald-700" : "text-rose-700"}`}>
            {selectedOption === q.correctIndex ? "Dobrze!" : `Poprawnie: ${q.correctTranslation}`}
          </span>
          <button
            onClick={handleNext}
            className="relative inline-flex items-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold transition hover:brightness-110"
            style={{ color: "#fff" }}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
            <span className="relative">
              {currentIndex + 1 >= questions.length ? "Wynik →" : "Dalej →"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
