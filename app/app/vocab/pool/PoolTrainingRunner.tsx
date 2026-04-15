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

type PoolOverviewSegmentItem = {
  sense_id: string | null;
};

type PoolOverviewPayload = {
  segments: {
    review: PoolOverviewSegmentItem[];
    learning: PoolOverviewSegmentItem[];
    new: PoolOverviewSegmentItem[];
    mastered: PoolOverviewSegmentItem[];
  };
  counts: {
    review: number;
    learning: number;
    new: number;
    mastered: number;
  };
};

type StartMode = "quick" | "errors" | "new" | "mastered";

type NextRecommendedAction =
  | {
      title: string;
      description: string;
      ctaLabel: string;
      mode: StartMode;
      senseIds: string[];
    }
  | {
      title: string;
      description: string;
      ctaLabel: null;
      mode: null;
      senseIds: [];
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

function wordCountLabel(count: number): string {
  if (count === 1) return "słowo";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "słowa";
  return "słów";
}

function takeSenseIds(items: PoolOverviewSegmentItem[], limit = 8): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const id = item.sense_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
}

function buildRecommendedNextAction(overview: PoolOverviewPayload | null): NextRecommendedAction | null {
  if (!overview) return null;

  const reviewIds = takeSenseIds(overview.segments.review);
  if (overview.counts.review > 0 && reviewIds.length > 0) {
    return {
      title: `Masz jeszcze ${overview.counts.review} ${wordCountLabel(overview.counts.review)} do powtórki`,
      description: "Najpierw dokończ to, co wróciło do review.",
      ctaLabel: "Kontynuuj",
      mode: "errors",
      senseIds: reviewIds,
    };
  }

  const learningIds = takeSenseIds(overview.segments.learning);
  if (overview.counts.learning > 0 && learningIds.length > 0) {
    return {
      title: `Kontynuuj naukę (${overview.counts.learning} ${wordCountLabel(overview.counts.learning)})`,
      description: "Utrwal słowa, które są już w trakcie nauki.",
      ctaLabel: "Kontynuuj",
      mode: "quick",
      senseIds: learningIds,
    };
  }

  const newIds = takeSenseIds(overview.segments.new);
  if (overview.counts.new > 0 && newIds.length > 0) {
    return {
      title: `Masz nowe słowa do nauki (${overview.counts.new})`,
      description: "Możesz od razu przejść do kolejnej krótkiej sesji.",
      ctaLabel: "Zacznij nowe",
      mode: "new",
      senseIds: newIds,
    };
  }

  return {
    title: "Na dziś to wszystko",
    description: "Dodaj nowe słowa lub wróć później.",
    ctaLabel: null,
    mode: null,
    senseIds: [],
  };
}

function buildSegmentBySense(overview: PoolOverviewPayload | null): Map<string, "review" | "learning" | "new" | "mastered"> {
  const out = new Map<string, "review" | "learning" | "new" | "mastered">();
  if (!overview) return out;

  (["review", "learning", "new", "mastered"] as const).forEach((segment) => {
    for (const item of overview.segments[segment]) {
      if (item.sense_id) out.set(item.sense_id, segment);
    }
  });

  return out;
}

export default function PoolTrainingRunner(props: {
  sessionId: string;
  cards: PoolTrainingCard[];
  initialOverview: PoolOverviewPayload | null;
  onClose: () => void;
  onFinish: () => void;
  onStartNextSession: (senseIds: string[], mode: StartMode) => void;
  isStartingNextSession: boolean;
}) {
  const { sessionId, cards, initialOverview, onClose, onFinish, onStartNextSession, isStartingNextSession } = props;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [completed, setCompleted] = useState(false);
  const [toast, setToast] = useState("");
  const [completionOverview, setCompletionOverview] = useState<PoolOverviewPayload | null>(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionError, setCompletionError] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const completionFetchStartedRef = useRef(false);
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
  const summaryWrong = total - summaryCorrect;
  const recommendedNextAction = buildRecommendedNextAction(completionOverview);
  const beforeSegments = buildSegmentBySense(initialOverview);
  const afterSegments = buildSegmentBySense(completionOverview);
  const learnedCount = cards.reduce((acc, card) => {
    const before = beforeSegments.get(card.sense_id);
    const after = afterSegments.get(card.sense_id);
    return acc + (after === "mastered" && before !== "mastered" ? 1 : 0);
  }, 0);
  const returnedToReviewCount = cards.reduce((acc, card) => {
    const before = beforeSegments.get(card.sense_id);
    const after = afterSegments.get(card.sense_id);
    return acc + (after === "review" && before !== "review" ? 1 : 0);
  }, 0);

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
      setInput("");
      setToast("");
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
      <div className="space-y-5 transition-opacity duration-300">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Sesja zakończona</h2>
          <p className="text-sm text-slate-500">Krótko: wynik, efekt i następny najlepszy krok.</p>
        </div>

        <section className={`${cardBase} space-y-4`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Wynik</div>
              <div className="mt-1 text-lg font-bold text-emerald-950">✔ {summaryCorrect} poprawnych</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-rose-800">Błędy</div>
              <div className="mt-1 text-lg font-bold text-rose-950">✖ {summaryWrong} błędów</div>
            </div>
          </div>

          {(learnedCount > 0 || returnedToReviewCount > 0) && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Efekt</div>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                {learnedCount > 0 ? <p>Nauczyłeś się {learnedCount} {wordCountLabel(learnedCount)}</p> : null}
                {returnedToReviewCount > 0 ? <p>{returnedToReviewCount} {wordCountLabel(returnedToReviewCount)} wróciło do powtórki</p> : null}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">Co dalej</div>
            {completionLoading ? (
              <p className="mt-2 text-sm text-slate-600">Aktualizuję stan Twojej puli...</p>
            ) : completionError ? (
              <p className="mt-2 text-sm text-amber-900">{completionError}</p>
            ) : recommendedNextAction ? (
              <div className="mt-2 space-y-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{recommendedNextAction.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{recommendedNextAction.description}</p>
                </div>
                {recommendedNextAction.mode && recommendedNextAction.senseIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onStartNextSession(recommendedNextAction.senseIds, recommendedNextAction.mode)}
                    disabled={isStartingNextSession}
                    className="rounded-xl border-2 border-sky-700 bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isStartingNextSession ? "Uruchamiam..." : recommendedNextAction.ctaLabel}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Nie udało się przygotować kolejnej rekomendacji.</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline"
          >
            Wróć do puli
          </button>
        </section>
      </div>
    );
  }

  useEffect(() => {
    if (!completed || completionFetchStartedRef.current) return;
    completionFetchStartedRef.current = true;

    let cancelled = false;

    void (async () => {
      setCompletionLoading(true);
      setCompletionError("");
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          throw new Error("Musisz być zalogowany.");
        }

        const res = await fetch("/api/vocab/pool/overview", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = (await res.json().catch(() => null)) as PoolOverviewPayload | { error?: string } | null;
        if (!res.ok || !payload || "error" in payload) {
          throw new Error((payload as { error?: string } | null)?.error ?? `HTTP ${res.status}`);
        }

        if (!cancelled) {
          setCompletionOverview(payload as PoolOverviewPayload);
          onFinish();
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setCompletionError(e instanceof Error ? e.message : "Nie udało się pobrać aktualnego stanu puli.");
          onFinish();
        }
      } finally {
        if (!cancelled) {
          setCompletionLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [completed, onFinish]);

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
