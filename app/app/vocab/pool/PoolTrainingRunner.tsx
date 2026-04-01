"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getWordTip } from "@/lib/coach/wordTips";
import { TypewriterText } from "@/lib/coach/TypewriterText";

export type PoolTrainingCard = {
  sense_id: string;
  lemma: string | null;
  definition_en: string | null;
  translation_pl: string | null;
  example_en: string | null;
};

type AnswerState = {
  given: string;
  expected: string | null;
  isCorrect: boolean;
};

const cardBase =
  "rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 transition-all duration-200";

function normalizeSpacing(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isCorrectAnswer(expected: string, given: string, removeDiacriticsFlag: boolean): boolean {
  const exp = normalizeSpacing(removeDiacriticsFlag ? stripDiacritics(expected) : expected);
  const giv = normalizeSpacing(removeDiacriticsFlag ? stripDiacritics(given) : given);
  return exp.length > 0 && exp === giv;
}

export default function PoolTrainingRunner(props: {
  sessionId: string;
  cards: PoolTrainingCard[];
  onClose: () => void;
  onFinish: () => void;
}) {
  const { sessionId, cards, onClose, onFinish } = props;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [completed, setCompleted] = useState(false);
  const [toast, setToast] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const total = cards.length;
  const current = cards[currentIndex];
  const direction: "en-pl" = "en-pl";
  const currentAnswer = current ? answers[current.sense_id] : null;
  const checked = !!currentAnswer;

  useEffect(() => {
    if (!checked) inputRef.current?.focus();
  }, [checked, currentIndex]);

  const summaryCorrect = cards.filter((c) => answers[c.sense_id]?.isCorrect).length;
  const progressAnswered = Object.keys(answers).length;

  const checkAnswer = () => {
    if (!current || checked) return;
    if (!input.trim()) {
      setToast("Wpisz tłumaczenie.");
      return;
    }
    setToast("");
    const expectedValue = current.translation_pl ?? null;
    let isCorrect = false;
    if (expectedValue) {
      isCorrect = isCorrectAnswer(expectedValue, input, true);
    }

    setAnswers((prev) => ({
      ...prev,
      [current.sense_id]: { given: input, expected: expectedValue, isCorrect },
    }));

    void (async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/vocab/training/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            sense_id: current.sense_id,
            given: input,
            direction,
            session_id: sessionId,
          }),
        });
        if (!res.ok) setToast("Nie udało się zapisać odpowiedzi (w tle).");
      } catch {
        setToast("Nie udało się zapisać odpowiedzi (w tle).");
      }
    })();
  };

  const goNext = () => {
    if (currentIndex >= total - 1) {
      setCompleted(true);
      onFinish();
      return;
    }
    setCurrentIndex((i) => i + 1);
    setInput("");
  };

  const goPrev = () => {
    if (currentIndex <= 0) return;
    setCurrentIndex((i) => i - 1);
    setInput("");
  };

  if (total === 0) {
    return (
      <div className={cardBase}>
        <p className="text-sm text-slate-600">Brak kart w tej sesji.</p>
        <button type="button" className="mt-3 text-sm font-medium text-sky-800 underline-offset-2 hover:underline" onClick={onClose}>
          Wróć
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="space-y-4 transition-opacity duration-300">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Sesja zakończona</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
          >
            Wróć do puli
          </button>
        </div>
        <div className={cardBase}>
          <p className="text-sm text-slate-700">
            Poprawne: <span className="font-semibold">{summaryCorrect}</span> / {total}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 transition-opacity duration-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (progressAnswered > 0 && !confirm("Zakończyć trening? Postęp zostanie utracony.")) return;
            onClose();
          }}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Anuluj
        </button>
        <span className="text-xs text-slate-500">
          Karta {currentIndex + 1} / {total}
        </span>
      </div>

      {toast ? <p className="text-sm text-amber-800">{toast}</p> : null}

      {current ? (
        <section className={cardBase}>
          <div className="mb-6 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Przetłumacz na polski</div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{current.lemma ?? "—"}</div>
            {current.definition_en ? <p className="mt-2 text-xs text-slate-500">{current.definition_en}</p> : null}
            {current.example_en ? (
              <p className="mt-1 text-xs italic text-slate-400">&ldquo;{current.example_en}&rdquo;</p>
            ) : null}
          </div>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              if (checked) return;
              setInput(e.target.value);
            }}
            placeholder="Wpisz tłumaczenie…"
            className={`w-full rounded-xl border border-slate-100 bg-white/80 px-4 py-3.5 text-center text-sm text-slate-800 placeholder:text-slate-300 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 ${
              checked ? "opacity-70" : ""
            }`}
            readOnly={checked}
            aria-readonly={checked}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (!checked) checkAnswer();
              else goNext();
            }}
          />

          {checked ? (
            <div className="mt-5 space-y-3">
              <div
                className={`rounded-xl px-4 py-3 text-center text-sm font-semibold ${
                  currentAnswer?.isCorrect ? "bg-slate-50 text-slate-800" : "bg-rose-50/80 text-rose-700"
                }`}
              >
                {currentAnswer?.isCorrect ? "Poprawnie!" : `Poprawna odpowiedź: ${currentAnswer?.expected ?? "—"}`}
              </div>
              {(() => {
                const tip = getWordTip(current.lemma, !currentAnswer?.isCorrect ? currentAnswer?.given : undefined);
                if (!tip) return null;
                const text = Array.isArray(tip) ? tip.join("\n") : tip;
                return (
                  <div className="rounded-xl border border-slate-200/50 bg-slate-50/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Wskazówka</p>
                    <div className="mt-1 whitespace-pre-line text-sm text-slate-700">
                      <TypewriterText text={text} speed={30} />
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              ←
            </button>
            {!checked ? (
              <button
                type="button"
                onClick={checkAnswer}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Sprawdź
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {currentIndex === total - 1 ? "Zakończ" : "Dalej"}
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={!checked}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
