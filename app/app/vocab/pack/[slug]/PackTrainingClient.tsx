"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { emitTrainingCompleted } from "@/lib/events/trainingEvents";
import { useCurrentWord } from "@/lib/coach/CurrentWordContext";
import { TypewriterText } from "@/lib/coach/TypewriterText";
import { getWordTip } from "@/lib/coach/wordTips";

export type PackMetaDto = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
};

export type PackItemDto = {
  id: string;
  sense_id: string;
  lemma: string | null;
  translation_pl: string | null;
  example_en: string | null;
  definition_en: string | null;
  order_index: number;
};

type AnswerState = {
  given: string;
  expected: string | null;
  isCorrect: boolean;
};

type AwardBadge = {
  slug: string;
  title: string;
  description: string | null;
};

type AwardResult = {
  xp_awarded: number;
  xp_total: number;
  level: number;
  xp_in_current_level: number;
  xp_to_next_level: number;
  newly_awarded_badges: AwardBadge[];
};

type RecommendationItem = {
  sense_id: string;
  lemma: string | null;
  translation_pl: string | null;
  example_en: string | null;
  definition_en: string | null;
};

type SessionSummary = {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  started_at?: string | null;
  finished_at?: string | null;
  wrong_items?: Array<{
    prompt: string | null;
    expected: string | null;
    question_mode?: string | null;
  }>;
};

type Direction = "en-pl" | "pl-en" | "mix";
type CountChoice = "5" | "10" | "all";
type VocabMode = "daily" | "precise";

const OPTIMISTIC_XP = 10;

const cardBase =
  "rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 transition-all duration-200";

const isValidVocabMode = (value: string | null): value is VocabMode =>
  value === "daily" || value === "precise";

function shuffleArray<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeSpacing(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function isCorrectAnswer(expected: string, given: string, removeDiacritics: boolean): boolean {
  const exp = normalizeSpacing(removeDiacritics ? stripDiacritics(expected) : expected);
  const giv = normalizeSpacing(removeDiacritics ? stripDiacritics(given) : given);
  return exp.length > 0 && exp === giv;
}

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150 ${
        active
          ? "border border-slate-300 bg-white text-slate-900 shadow-sm"
          : "border border-slate-200/60 bg-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

export default function PackTrainingClient(props: {
  slug: string;
  pack: PackMetaDto;
  initialItems: PackItemDto[];
  initialDirection: Direction;
  initialCountChoice: CountChoice;
  autoStart: boolean;
  assignmentId: string;
  modeFromUrl: VocabMode | null;
}) {
  const router = useRouter();

  const slug = props.slug;
  const pack = props.pack;
  const allItems = props.initialItems;

  const [error, setError] = useState("");
  const [saveToast, setSaveToast] = useState("");
  const [startLoading, setStartLoading] = useState(false);

  const [direction, setDirection] = useState<Direction>(props.initialDirection);
  const [countChoice, setCountChoice] = useState<CountChoice>(props.initialCountChoice);
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  const [sessionItems, setSessionItems] = useState<PackItemDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [completed, setCompleted] = useState(false);
  const [sessionDirections, setSessionDirections] = useState<Record<string, "en-pl" | "pl-en">>({});

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [addStatus, setAddStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [award, setAward] = useState<AwardResult | null>(null);
  const [xpAlreadyAwarded, setXpAlreadyAwarded] = useState(false);
  const [awardError, setAwardError] = useState("");
  const [awardedSessionId, setAwardedSessionId] = useState("");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [assignmentToast, setAssignmentToast] = useState("");
  const assignmentCompleteRef = useRef(false);
  const autoStartRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [vocabMode, setVocabMode] = useState<VocabMode>("daily");
  const [optimisticXpAwarded, setOptimisticXpAwarded] = useState<number>(0);
  const [showWordList, setShowWordList] = useState(false);

  const { setCurrentLemma } = useCurrentWord();
  const current = sessionItems[currentIndex];
  const currentDirection =
    direction === "mix" ? sessionDirections[current?.sense_id ?? ""] ?? "en-pl" : direction;
  const currentAnswer = current ? answers[current.sense_id] : null;
  const checked = !!currentAnswer;

  useEffect(() => {
    if (props.modeFromUrl) {
      setVocabMode(props.modeFromUrl);
      localStorage.setItem("vocabMode", props.modeFromUrl);
      return;
    }
    const stored = localStorage.getItem("vocabMode");
    if (isValidVocabMode(stored)) {
      setVocabMode(stored);
      return;
    }
    setVocabMode("daily");
  }, [props.modeFromUrl]);

  const startSessionWithApi = async () => {
    setStartLoading(true);
    setError("");
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError("Zaloguj się, aby rozpocząć sesję.");
        return;
      }
      const res = await fetch("/api/training/pack/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug, countMode: countChoice }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Nie udało się rozpocząć sesji.");
      }
      if (!data.sessionId || !Array.isArray(data.items)) {
        throw new Error("Nieprawidłowa odpowiedź serwera.");
      }
      const selection = data.items as PackItemDto[];
      setSessionItems(selection);
      setSessionId(data.sessionId);
      setAnswers({});
      setInput("");
      setSessionDirections(
        direction === "mix"
          ? selection.reduce<Record<string, "en-pl" | "pl-en">>((acc, item) => {
              acc[item.sense_id] = Math.random() < 0.5 ? "en-pl" : "pl-en";
              return acc;
            }, {})
          : {},
      );
      setCurrentIndex(0);
      setCompleted(false);
      setRecommendations([]);
      setAddStatus("");
      setAward(null);
      setAwardError("");
      setAwardedSessionId("");
      setXpAlreadyAwarded(false);
      setSummary(null);
      setOptimisticXpAwarded(0);
      assignmentCompleteRef.current = false;
      setStarted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się rozpocząć sesji.");
    } finally {
      setStartLoading(false);
    }
  };

  useEffect(() => {
    if (!props.autoStart) return;
    if (started) return;
    if (autoStartRef.current) return;
    autoStartRef.current = true;
    void startSessionWithApi();
  }, [props.autoStart, started]);

  useEffect(() => {
    if (!current) return;
    const existing = answers[current.sense_id];
    setInput(existing?.given ?? "");
  }, [current?.sense_id, answers]);

  useEffect(() => {
    if (started && !completed && current?.lemma) {
      setCurrentLemma(current.lemma);
    } else {
      setCurrentLemma(null);
    }
    return () => setCurrentLemma(null);
  }, [started, completed, current?.lemma, setCurrentLemma]);

  useEffect(() => {
    if (!started || completed) return;
    inputRef.current?.focus();
  }, [started, completed, currentIndex]);

  useEffect(() => {
    if (!saveToast) return;
    const timer = setTimeout(() => setSaveToast(""), 3500);
    return () => clearTimeout(timer);
  }, [saveToast]);

  useEffect(() => {
    if (!assignmentToast) return;
    const timer = setTimeout(() => setAssignmentToast(""), 4000);
    return () => clearTimeout(timer);
  }, [assignmentToast]);

  const total = sessionItems.length;
  const progress = useMemo(() => Object.keys(answers).length, [answers]);
  const correctCount = useMemo(
    () => sessionItems.filter((item) => answers[item.sense_id]?.isCorrect).length,
    [answers, sessionItems],
  );
  const percentCorrect = useMemo(() => {
    if (progress === 0) return 0;
    return Math.round((correctCount / progress) * 100);
  }, [correctCount, progress]);
  const summaryTotal = summary?.total ?? total;
  const summaryCorrect = summary?.correct ?? correctCount;
  const summaryWrong = summary?.wrong ?? Math.max(summaryTotal - summaryCorrect, 0);
  const summaryAccuracy = summary?.accuracy ?? (summaryTotal ? summaryCorrect / summaryTotal : 0);

  const startSession = (itemsOverride?: PackItemDto[]) => {
    if (allItems.length === 0 && !itemsOverride) {
      setError("Brak fiszek w tym packu.");
      return;
    }
    const source = itemsOverride ?? allItems;
    let selection = shuffleArray(source);
    if (!itemsOverride && countChoice !== "all") {
      const size = countChoice === "5" ? 5 : 10;
      selection = selection.slice(0, Math.min(size, selection.length));
    }
    setSessionItems(selection);
    setSessionId(createSessionId());
    setAnswers({});
    setInput("");
    setSessionDirections(
      direction === "mix"
        ? selection.reduce<Record<string, "en-pl" | "pl-en">>((acc, item) => {
            acc[item.sense_id] = Math.random() < 0.5 ? "en-pl" : "pl-en";
            return acc;
          }, {})
        : {},
    );
    setCurrentIndex(0);
    setCompleted(false);
    setRecommendations([]);
    setAddStatus("");
    setAward(null);
    setAwardError("");
    setAwardedSessionId("");
    setXpAlreadyAwarded(false);
    setSummary(null);
    setOptimisticXpAwarded(0);
    assignmentCompleteRef.current = false;
    setStarted(true);
  };

  const checkAnswer = () => {
    if (!current || checked) return;
    if (!input.trim()) {
      setError("Wpisz tłumaczenie.");
      return;
    }
    setError("");
    const expectedValue =
      currentDirection === "en-pl" ? current.translation_pl ?? null : current.lemma ?? null;
    const expectedForDisplay = expectedValue;
    let isCorrect = false;
    if (expectedValue) {
      isCorrect = isCorrectAnswer(expectedValue, input, currentDirection === "en-pl");
    }
    if (!isCorrect && currentDirection === "pl-en" && current.translation_pl) {
      isCorrect = isCorrectAnswer(current.translation_pl, input, true);
    }
    setAnswers((prev) => ({
      ...prev,
      [current.sense_id]: { given: input, expected: expectedForDisplay, isCorrect },
    }));

    void (async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;
        const res = await fetch(`/api/vocab/packs/${slug}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sense_id: current.sense_id, given: input, direction: currentDirection, session_id: sessionId }),
        });
        if (!res.ok) setSaveToast("Nie udało się zapisać odpowiedzi (w tle).");
      } catch {
        setSaveToast("Nie udało się zapisać odpowiedzi (w tle).");
      }
    })();
  };

  const goNext = () => {
    if (currentIndex >= total - 1) {
      setOptimisticXpAwarded(OPTIMISTIC_XP);
      setCompleted(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
  };

  const goPrev = () => {
    if (currentIndex <= 0) return;
    setCurrentIndex((i) => i - 1);
  };

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!completed || !sessionId) return;
      try {
        setLoadingRecs(true);
        setError("");
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;
        const res = await fetch(`/api/vocab/packs/${slug}/recommendations?sessionId=${sessionId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errorData.error || "Nie udało się wczytać rekomendacji.");
        }
        const data = await res.json();
        if (!data.ok || !Array.isArray(data.items)) throw new Error("Nieprawidłowa odpowiedź serwera.");
        setRecommendations(data.items);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Nie udało się wczytać rekomendacji.");
      } finally {
        setLoadingRecs(false);
      }
    };
    void loadRecommendations();
  }, [completed, slug, sessionId]);

  useEffect(() => {
    if (!completed || !sessionId) return;
    if (awardedSessionId === sessionId) return;
    setAwardedSessionId(sessionId);
    setOptimisticXpAwarded((v) => (v > 0 ? v : OPTIMISTIC_XP));
    setAwardError("");

    void (async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;
        const res = await fetch(`/api/vocab/packs/${slug}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ session_id: sessionId, direction, count_mode: countChoice }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errorData.error || "Nie udało się przyznać XP.");
        }
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Nie udało się przyznać XP.");
        setAward({
          xp_awarded: data.xp_awarded ?? 0,
          xp_total: data.xp_total ?? 0,
          level: data.level ?? 0,
          xp_in_current_level: data.xp_in_current_level ?? 0,
          xp_to_next_level: data.xp_to_next_level ?? 0,
          newly_awarded_badges: data.newly_awarded_badges ?? [],
        });
        setSummary(data.summary ?? null);
        setXpAlreadyAwarded((data.xp_awarded ?? 0) === 0);
        emitTrainingCompleted({ type: "pack", slug });

        if (props.assignmentId && !assignmentCompleteRef.current) {
          try {
            const completeRes = await fetch(`/api/lessons/assignments/${props.assignmentId}/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ session_id: sessionId, exercise_type: "pack", context_slug: slug }),
            });
            if (completeRes.ok) {
              const completeData = await completeRes.json();
              if (completeData.ok) {
                assignmentCompleteRef.current = true;
                setAssignmentToast("Zadanie z lekcji oznaczone jako wykonane");
              }
            }
          } catch (e) {
            console.warn("[pack] assignment complete failed", e);
          }
        }
      } catch (e: unknown) {
        setAwardError(e instanceof Error ? e.message : "Nie udało się przyznać XP.");
        setSaveToast("Nie udało się zapisać wyniku (w tle).");
      }
    })();
  }, [props.assignmentId, awardedSessionId, completed, countChoice, direction, sessionId, slug]);

  const wrongItems = useMemo(
    () => sessionItems.filter((item) => answers[item.sense_id]?.isCorrect === false),
    [answers, sessionItems],
  );

  const addRecommendations = async () => {
    if (recommendations.length === 0) return;
    try {
      setAdding(true);
      setAddStatus("");
      setError("");
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/vocab/add-words", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sense_ids: recommendations.map((r) => r.sense_id) }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || "Nie udało się dodać słówek.");
      }
      const data = await res.json();
      if (!data.ok) throw new Error("Nie udało się dodać słówek.");
      setAddStatus(`Dodano do puli: ${data.added ?? 0}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się dodać słówek.");
    } finally {
      setAdding(false);
    }
  };

  const errorBlock = error ? (
    <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
      <p className="text-sm text-rose-700">
        <span className="font-semibold">Błąd: </span>
        {error}
      </p>
    </div>
  ) : null;

  const toastBlock = saveToast ? (
    <div className="rounded-2xl border border-slate-200/50 bg-white/90 px-4 py-2.5 text-xs text-slate-500">
      {saveToast}
    </div>
  ) : null;

  /* ─── PRE-START ─── */
  if (!started) {
    if (startLoading) {
      return (
        <div>
          <header className="mb-5">
            <Link href="/app/vocab/packs" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700">← Fiszki</Link>
            <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{pack.title ?? slug}</h1>
          </header>
          <div className={`${cardBase} animate-pulse`}>
            <div className="h-4 w-48 rounded bg-slate-100" />
            <div className="mt-4 h-24 rounded-xl bg-slate-100" />
          </div>
        </div>
      );
    }

    return (
      <div>
        <header className="mb-5">
          <Link href="/app/vocab/packs" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700">← Fiszki</Link>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{pack.title ?? slug}</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">{pack.description ?? "Ćwicz szybkie tłumaczenia"}</p>
        </header>

        {errorBlock}
        {toastBlock}

        <div className="space-y-5">
          <section className={cardBase}>
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Kierunek</h2>
            <div className="flex flex-wrap gap-2">
              <OptionButton active={direction === "en-pl"} onClick={() => setDirection("en-pl")}>ENG → PL</OptionButton>
              <OptionButton active={direction === "pl-en"} onClick={() => setDirection("pl-en")}>PL → ENG</OptionButton>
              <OptionButton active={direction === "mix"} onClick={() => setDirection("mix")}>MIX</OptionButton>
            </div>
          </section>

          <section className={cardBase}>
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Liczba fiszek</h2>
            <div className="flex flex-wrap gap-2">
              {(["5", "10", "all"] as CountChoice[]).map((c) => (
                <OptionButton key={c} active={countChoice === c} onClick={() => setCountChoice(c)}>
                  {c === "all" ? "Wszystkie" : c}
                </OptionButton>
              ))}
            </div>
          </section>

          <section className={cardBase}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowWordList(!showWordList)}
                className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400"
              >
                <svg
                  className={`transition-transform duration-200 ${showWordList ? "" : "-rotate-90"}`}
                  width="12" height="12" viewBox="0 0 16 16" fill="none"
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Słówka w zestawie
                <span className="font-medium normal-case tracking-normal text-slate-300">{allItems.length}</span>
              </button>
            </div>
            {showWordList ? (
              <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {allItems.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                    <span className="font-medium text-slate-800">{item.lemma ?? "—"}</span>
                    <span className="text-xs text-slate-400">{item.translation_pl ?? "—"}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <button
            type="button"
            onClick={() => void startSessionWithApi()}
            disabled={startLoading}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {startLoading ? "Ładowanie…" : "Zacznij sesję"}
          </button>
        </div>
      </div>
    );
  }

  /* ─── COMPLETED ─── */
  if (completed) {
    const xpToShow = award ? award.xp_awarded : optimisticXpAwarded || OPTIMISTIC_XP;

    return (
      <div>
        <header className="mb-5">
          <Link href="/app/vocab/packs" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700">← Fiszki</Link>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Sesja zakończona</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">{pack.title ?? slug}</p>
        </header>

        {errorBlock}
        {toastBlock}
        {assignmentToast ? (
          <div className="mb-5 rounded-2xl border border-slate-200/50 bg-white/90 px-4 py-2.5 text-xs text-slate-600">{assignmentToast}</div>
        ) : null}

        <div className="space-y-5">
          <section className={cardBase}>
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Podsumowanie</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-slate-900">{summaryCorrect}</div>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">Poprawne</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{summaryWrong}</div>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">Błędne</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{summaryTotal ? Math.round(summaryAccuracy * 100) : 0}%</div>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">Skuteczność</div>
              </div>
            </div>
          </section>

          {summary?.wrong_items?.length ? (
            <section className={cardBase}>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Błędy</h2>
              <ul className="space-y-1.5">
                {summary.wrong_items.slice(0, 10).map((item, idx) => (
                  <li key={`${item.prompt ?? "?"}-${idx}`} className="flex items-baseline justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                    <span className="text-slate-600">{item.prompt ?? "—"}</span>
                    <span className="text-xs font-medium text-slate-800">{item.expected ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className={cardBase}>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">XP</h2>
            {award && xpAlreadyAwarded ? (
              <p className="text-sm text-slate-400">Już otrzymałeś XP za to ćwiczenie dziś.</p>
            ) : (
              <p className="text-sm text-slate-600">
                Zdobyte XP: <span className="font-semibold text-slate-900">+{xpToShow}</span>
              </p>
            )}
            {award ? (
              <p className="mt-1 text-xs text-slate-400">
                Poziom {award.level} · {award.xp_in_current_level}/{award.xp_to_next_level} XP
              </p>
            ) : awardError ? (
              <p className="mt-1 text-xs text-rose-500">{awardError}</p>
            ) : null}
          </section>

          {award?.newly_awarded_badges?.length ? (
            <section className={cardBase}>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Nowe odznaki</h2>
              {award.newly_awarded_badges.map((badge) => (
                <p key={badge.slug} className="text-sm text-slate-700">
                  {badge.title}{badge.description ? ` — ${badge.description}` : ""}
                </p>
              ))}
            </section>
          ) : null}

          {loadingRecs ? <p className="text-xs text-slate-400">Pobieram rekomendacje…</p> : null}
          {!loadingRecs && recommendations.length > 0 ? (
            <section className={cardBase}>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Dodaj do puli</h2>
              <ul className="mb-4 space-y-1.5">
                {recommendations.map((item) => (
                  <li key={item.sense_id} className="flex items-baseline justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                    <span className="font-medium text-slate-800">{item.lemma ?? "—"}</span>
                    <span className="text-xs text-slate-400">{item.translation_pl ?? "—"}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void addRecommendations()}
                disabled={adding}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                {adding ? "Dodaję…" : "Dodaj do mojej puli"}
              </button>
              {addStatus ? <p className="mt-2 text-xs text-slate-500">{addStatus}</p> : null}
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void startSessionWithApi()}
              disabled={sessionItems.length === 0 || startLoading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              Jeszcze raz
            </button>
            <button
              type="button"
              onClick={() => startSession(wrongItems)}
              disabled={wrongItems.length === 0 || startLoading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              Tylko błędne
            </button>
            <Link
              href="/app/vocab/packs"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Wróć do fiszek
            </Link>
            <Link
              href="/app"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ─── ACTIVE SESSION ─── */
  return (
    <div>
      <header className="mb-5">
        <Link href="/app/vocab/packs" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700">← Fiszki</Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{pack.title ?? slug}</h1>
      </header>

      {errorBlock}
      {toastBlock}

      {current ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              <span className="font-semibold text-slate-600">{currentIndex + 1}</span> / {total}
            </span>
            <span>
              <span className="font-semibold text-slate-600">{percentCorrect}%</span> poprawnych
            </span>
          </div>

          <div className="h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-800 transition-all duration-300"
              style={{ width: `${total ? ((currentIndex + 1) / total) * 100 : 0}%` }}
            />
          </div>

          <section className={cardBase}>
            <div className="mb-6 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {currentDirection === "en-pl" ? "Przetłumacz na polski" : "Przetłumacz na angielski"}
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                {currentDirection === "en-pl" ? current.lemma ?? "—" : current.translation_pl ?? "—"}
              </div>
            </div>

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                if (checked) return;
                setInput(e.target.value);
              }}
              placeholder={currentDirection === "en-pl" ? "Wpisz tłumaczenie…" : "Wpisz słowo po angielsku…"}
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
                <div className={`rounded-xl px-4 py-3 text-center text-sm font-semibold ${
                  currentAnswer?.isCorrect
                    ? "bg-slate-50 text-slate-800"
                    : "bg-rose-50/80 text-rose-700"
                }`}>
                  {currentAnswer?.isCorrect ? "Poprawnie!" : `Poprawna odpowiedź: ${currentAnswer?.expected ?? "—"}`}
                </div>
                {current.definition_en ? (
                  <p className="text-center text-xs text-slate-400">{current.definition_en}</p>
                ) : null}
                {current.example_en ? (
                  <p className="text-center text-xs italic text-slate-400">&ldquo;{current.example_en}&rdquo;</p>
                ) : null}
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
        </div>
      ) : (
        <div className={cardBase}>
          <p className="text-sm text-slate-400">Brak fiszek w tym packu.</p>
        </div>
      )}
    </div>
  );
}
