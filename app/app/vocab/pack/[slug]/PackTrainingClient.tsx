"use client";

import Link from "next/link";
import { BackButton } from "@/app/_components/BackButton";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { emitTrainingCompleted } from "@/lib/events/trainingEvents";
import { useCurrentWord } from "@/lib/coach/CurrentWordContext";
import { TypewriterText } from "@/lib/coach/TypewriterText";
import { getWordTip } from "@/lib/coach/wordTips";
import type { TrainingEntryContext } from "@/lib/suggestions/suggestionContext";
import type { XpSkipReasonCode } from "@/lib/xp/award";
import { xpZeroSessionMessage } from "@/lib/xp/xpSkipReasonUi";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

// ── Types ────────────────────────────────────────────────────────────────────

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
  cefr_level?: string | null;
};

/** Each occurrence of a card within one session has a unique sessionKey. */
type SessionItem = PackItemDto & {
  sessionKey: string;
  isRetry?: boolean;
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
  xp_skip_reason: XpSkipReasonCode | null;
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
type TaskMode = "translation" | "multiple-choice" | "mix";
type VocabMode = "daily" | "precise";

const OPTIMISTIC_XP = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

function newSessionKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function polishFiszkiLabel(n: number): string {
  if (n === 1) return "fiszka";
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "fiszki";
  return "fiszek";
}

function cefrColor(level?: string | null): string {
  switch (level) {
    case "A1": return "bg-emerald-100 text-emerald-700";
    case "A2": return "bg-teal-100 text-teal-700";
    case "B1": return "bg-sky-100 text-sky-700";
    case "B2": return "bg-indigo-100 text-indigo-700";
    case "C1": return "bg-violet-100 text-violet-700";
    case "C2": return "bg-purple-100 text-purple-700";
    default:   return "bg-slate-100 text-slate-500";
  }
}

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
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeSpacing(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function stripParens(text: string): string {
  return text.replace(/\s*\([^)]*\)/g, "").trim();
}

function isCorrectAnswer(expected: string, given: string, removeDiacritics: boolean): boolean {
  const normalize = (s: string) =>
    normalizeSpacing(removeDiacritics ? stripDiacritics(s) : s);
  const giv = normalize(given);
  if (normalize(expected) === giv && giv.length > 0) return true;
  const withoutParens = normalize(stripParens(expected));
  if (withoutParens.length > 0 && withoutParens === giv) return true;
  return false;
}

function toSessionItems(items: PackItemDto[]): SessionItem[] {
  return items.map((item) => ({ ...item, sessionKey: newSessionKey() }));
}

function generateMcChoices(
  current: SessionItem,
  allItems: PackItemDto[],
  direction: "en-pl" | "pl-en",
): string[] {
  const getVal = (item: PackItemDto) =>
    direction === "en-pl" ? item.translation_pl : item.lemma;

  const correct = getVal(current);
  if (!correct) return [];

  const distractors = shuffleArray(
    allItems.filter((i) => i.sense_id !== current.sense_id && getVal(i)),
  )
    .slice(0, 3)
    .map((i) => getVal(i) as string);

  return shuffleArray([correct, ...distractors]);
}

const isValidVocabMode = (value: string | null): value is VocabMode =>
  value === "daily" || value === "precise";

// ── Sub-components ───────────────────────────────────────────────────────────

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

function FlipCard({
  item,
  status,
  isFlipped,
  onFlip,
}: {
  item: PackItemDto;
  status: "correct" | "wrong" | null;
  isFlipped: boolean;
  onFlip: () => void;
}) {
  const borderColor =
    status === "correct"
      ? "border-emerald-300"
      : status === "wrong"
        ? "border-rose-300"
        : "border-slate-200/70";

  return (
    <div
      onClick={onFlip}
      className="relative cursor-pointer select-none"
      style={{ perspective: "600px", height: "120px" }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.4s ease",
        }}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 rounded-xl border ${borderColor} bg-white p-3 flex flex-col`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex justify-end min-h-[18px]">
            {item.cefr_level ? (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cefrColor(item.cefr_level)}`}>
                {item.cefr_level}
              </span>
            ) : null}
          </div>
          <div className="flex-1 flex items-center justify-center px-1">
            <span className="text-base font-semibold text-slate-900 text-center leading-snug">
              {item.lemma ?? "—"}
            </span>
          </div>
          <p className="text-sm text-slate-500 text-center truncate">{item.translation_pl ?? "—"}</p>
          <p className="mt-1 text-[9px] text-slate-300 text-center">Kliknij →</p>
        </div>
        {/* Back */}
        <div
          className={`absolute inset-0 rounded-xl border ${borderColor} bg-slate-50 p-3 flex flex-col justify-center gap-1.5`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {item.example_en ? (
            <p className="text-xs italic text-slate-600 text-center line-clamp-3 leading-snug">
              &ldquo;{item.example_en}&rdquo;
            </p>
          ) : null}
          {item.definition_en ? (
            <p className="text-[10px] text-slate-400 text-center line-clamp-2 leading-snug">{item.definition_en}</p>
          ) : null}
          {!item.example_en && !item.definition_en ? (
            <p className="text-xs text-slate-400 text-center">Brak przykładu</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

const cardBase =
  "rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 transition-all duration-200";

export default function PackTrainingClient(props: {
  slug: string;
  pack: PackMetaDto;
  initialItems: PackItemDto[];
  initialDirection: Direction;
  initialCountChoice: CountChoice;
  autoStart: boolean;
  assignmentId: string;
  modeFromUrl: VocabMode | null;
  trainingEntryContext?: TrainingEntryContext;
}) {
  const slug = props.slug;
  const pack = props.pack;
  const allItems = props.initialItems;

  // ── Config state ──────────────────────────────────────────────────────────
  const [direction, setDirection] = useState<Direction>(props.initialDirection);
  const [countChoice, setCountChoice] = useState<CountChoice>(props.initialCountChoice);
  const [taskMode, setTaskMode] = useState<TaskMode>("translation");
  const [vocabMode, setVocabMode] = useState<VocabMode>("daily");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [error, setError] = useState("");
  const [saveToast, setSaveToast] = useState("");
  const [startLoading, setStartLoading] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set()); // keyed by item.id

  // ── Session lifecycle ─────────────────────────────────────────────────────
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  // ── Session items & progress ──────────────────────────────────────────────
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  /** Answers keyed by sessionKey (unique per card occurrence). */
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  /** Per-card direction when direction === "mix", keyed by sessionKey. */
  const [sessionDirections, setSessionDirections] = useState<Record<string, "en-pl" | "pl-en">>({});
  /** Per-card effective task mode when taskMode === "mix", keyed by sessionKey. */
  const [sessionTaskModes, setSessionTaskModes] = useState<Record<string, "translation" | "multiple-choice">>({});
  /** Pre-generated MC choices per card, keyed by sessionKey. */
  const [sessionMcChoices, setSessionMcChoices] = useState<Record<string, string[]>>({});
  /** sense_ids that have already been re-queued once (to prevent infinite loops). */
  const [retriedOnce, setRetriedOnce] = useState<Set<string>>(new Set());
  /** Card grid status after session completion, keyed by sense_id. */
  const [cardStatuses, setCardStatuses] = useState<Record<string, "correct" | "wrong">>({});

  // ── Completion data ───────────────────────────────────────────────────────
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [addStatus, setAddStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [award, setAward] = useState<AwardResult | null>(null);
  const [awardError, setAwardError] = useState("");
  const [awardedSessionId, setAwardedSessionId] = useState("");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [assignmentToast, setAssignmentToast] = useState("");
  const [optimisticXpAwarded, setOptimisticXpAwarded] = useState<number>(0);
  const [displayedXp, setDisplayedXp] = useState(0);
  const [xpBarWidth, setXpBarWidth] = useState(0);

  const assignmentCompleteRef = useRef(false);
  const autoStartRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { setCurrentLemma } = useCurrentWord();

  // ── Derived values ────────────────────────────────────────────────────────
  const current = sessionItems[currentIndex];
  const total = sessionItems.length;

  const currentDirection: "en-pl" | "pl-en" =
    direction === "mix"
      ? (sessionDirections[current?.sessionKey ?? ""] ?? "en-pl")
      : (direction as "en-pl" | "pl-en");

  const currentEffectiveTaskMode: "translation" | "multiple-choice" =
    taskMode === "mix"
      ? (sessionTaskModes[current?.sessionKey ?? ""] ?? "translation")
      : (taskMode as "translation" | "multiple-choice");

  const currentAnswer = current ? answers[current.sessionKey] : undefined;
  const checked = !!currentAnswer;
  const currentMcChoices = current ? (sessionMcChoices[current.sessionKey] ?? []) : [];

  const progress = useMemo(() => Object.keys(answers).length, [answers]);
  const correctCount = useMemo(
    () => sessionItems.filter((item) => answers[item.sessionKey]?.isCorrect === true).length,
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

  /** 3-category breakdown for the completed screen. */
  const sessionSummaryData = useMemo(() => {
    if (!completed) return null;
    const originalItems = sessionItems.filter((i) => !i.isRetry);
    const retryItems = sessionItems.filter((i) => i.isRetry);

    const knowWell: SessionItem[] = [];
    const almost: SessionItem[] = [];
    const needReview: SessionItem[] = [];

    originalItems.forEach((item) => {
      const firstAnswer = answers[item.sessionKey];
      if (!firstAnswer) return; // unanswered
      if (firstAnswer.isCorrect) {
        knowWell.push(item);
      } else {
        const retryItem = retryItems.find((r) => r.sense_id === item.sense_id);
        if (retryItem && answers[retryItem.sessionKey]?.isCorrect) {
          almost.push(item);
        } else {
          needReview.push(item);
        }
      }
    });

    return { knowWell, almost, needReview };
  }, [completed, sessionItems, answers]);

  /** Items for "Ćwicz tylko błędne" button. */
  const wrongItemsForRetry = useMemo(() => {
    if (!sessionSummaryData) return [];
    return sessionSummaryData.needReview
      .map((si) => allItems.find((i) => i.sense_id === si.sense_id))
      .filter(Boolean) as PackItemDto[];
  }, [sessionSummaryData, allItems]);

  // ── Session builder ───────────────────────────────────────────────────────

  function buildSessionFromItems(
    selection: PackItemDto[],
    tMode: TaskMode,
    dir: Direction,
  ): {
    items: SessionItem[];
    directions: Record<string, "en-pl" | "pl-en">;
    taskModes: Record<string, "translation" | "multiple-choice">;
    mcChoices: Record<string, string[]>;
  } {
    const items = toSessionItems(selection);
    const directions: Record<string, "en-pl" | "pl-en"> = {};
    const taskModes: Record<string, "translation" | "multiple-choice"> = {};
    const mcChoices: Record<string, string[]> = {};

    items.forEach((item) => {
      const itemDir: "en-pl" | "pl-en" =
        dir === "mix"
          ? Math.random() < 0.5 ? "en-pl" : "pl-en"
          : (dir as "en-pl" | "pl-en");
      if (dir === "mix") directions[item.sessionKey] = itemDir;

      const itemTaskMode: "translation" | "multiple-choice" =
        tMode === "mix"
          ? Math.random() < 0.5 ? "translation" : "multiple-choice"
          : (tMode as "translation" | "multiple-choice");
      if (tMode === "mix") taskModes[item.sessionKey] = itemTaskMode;

      if (itemTaskMode === "multiple-choice") {
        mcChoices[item.sessionKey] = generateMcChoices(item, selection, itemDir);
      }
    });

    return { items, directions, taskModes, mcChoices };
  }

  function resetSessionState(
    items: SessionItem[],
    directions: Record<string, "en-pl" | "pl-en">,
    taskModes: Record<string, "translation" | "multiple-choice">,
    mcChoices: Record<string, string[]>,
    sid: string,
  ) {
    setSessionItems(items);
    setSessionId(sid);
    setAnswers({});
    setInput("");
    setSessionDirections(directions);
    setSessionTaskModes(taskModes);
    setSessionMcChoices(mcChoices);
    setCurrentIndex(0);
    setCompleted(false);
    setRetriedOnce(new Set());
    setRecommendations([]);
    setAddStatus("");
    setAward(null);
    setAwardError("");
    setAwardedSessionId("");
    setSummary(null);
    setOptimisticXpAwarded(0);
    assignmentCompleteRef.current = false;
  }

  // ── Session starters ──────────────────────────────────────────────────────

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          slug,
          countMode: countChoice,
          ...(props.trainingEntryContext ? { context: props.trainingEntryContext } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Nie udało się rozpocząć sesji.");
      if (!data.sessionId || !Array.isArray(data.items)) throw new Error("Nieprawidłowa odpowiedź serwera.");

      const { items, directions, taskModes, mcChoices } = buildSessionFromItems(
        data.items as PackItemDto[],
        taskMode,
        direction,
      );
      resetSessionState(items, directions, taskModes, mcChoices, data.sessionId);
      setStarted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się rozpocząć sesji.");
    } finally {
      setStartLoading(false);
    }
  };

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
    const { items, directions, taskModes, mcChoices } = buildSessionFromItems(
      selection,
      taskMode,
      direction,
    );
    resetSessionState(items, directions, taskModes, mcChoices, createSessionId());
    setStarted(true);
  };

  // ── Answer handlers ───────────────────────────────────────────────────────

  const logAnswerToApi = async (
    given: string,
    expectedValue: string | null,
    isCorrect: boolean,
  ) => {
    if (!current) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/vocab/packs/${slug}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sense_id: current.sense_id,
          given,
          direction: currentDirection,
          session_id: sessionId,
        }),
      });
      if (!res.ok) setSaveToast("Nie udało się zapisać odpowiedzi (w tle).");
    } catch {
      setSaveToast("Nie udało się zapisać odpowiedzi (w tle).");
    }
  };

  const insertRetryItem = (item: SessionItem) => {
    if (retriedOnce.has(item.sense_id)) return;

    const retryDir: "en-pl" | "pl-en" =
      direction === "mix"
        ? Math.random() < 0.5 ? "en-pl" : "pl-en"
        : (direction as "en-pl" | "pl-en");

    const retryTMode: "translation" | "multiple-choice" =
      taskMode === "mix"
        ? Math.random() < 0.5 ? "translation" : "multiple-choice"
        : (taskMode as "translation" | "multiple-choice");

    const retryItem: SessionItem = { ...item, sessionKey: newSessionKey(), isRetry: true };
    const insertAt = Math.min(currentIndex + 2, sessionItems.length);

    setSessionItems((prev) => {
      const next = [...prev];
      next.splice(insertAt, 0, retryItem);
      return next;
    });
    if (direction === "mix") {
      setSessionDirections((prev) => ({ ...prev, [retryItem.sessionKey]: retryDir }));
    }
    if (taskMode === "mix") {
      setSessionTaskModes((prev) => ({ ...prev, [retryItem.sessionKey]: retryTMode }));
    }
    if (retryTMode === "multiple-choice") {
      const choices = generateMcChoices(retryItem, allItems, retryDir);
      setSessionMcChoices((prev) => ({ ...prev, [retryItem.sessionKey]: choices }));
    }
    setRetriedOnce((prev) => new Set([...prev, item.sense_id]));
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
    let isCorrect = false;
    if (expectedValue) {
      isCorrect = isCorrectAnswer(expectedValue, input, currentDirection === "en-pl");
    }
    if (!isCorrect && currentDirection === "pl-en" && current.translation_pl) {
      isCorrect = isCorrectAnswer(current.translation_pl, input, true);
    }
    setAnswers((prev) => ({
      ...prev,
      [current.sessionKey]: { given: input, expected: expectedValue, isCorrect },
    }));
    if (!isCorrect) insertRetryItem(current);
    void logAnswerToApi(input, expectedValue, isCorrect);
  };

  const handleMcAnswer = (chosen: string) => {
    if (!current || checked) return;
    const expectedValue =
      currentDirection === "en-pl" ? current.translation_pl ?? null : current.lemma ?? null;
    const isCorrect = expectedValue !== null && chosen === expectedValue;
    setAnswers((prev) => ({
      ...prev,
      [current.sessionKey]: { given: chosen, expected: expectedValue, isCorrect },
    }));
    if (!isCorrect) insertRetryItem(current);
    void logAnswerToApi(chosen, expectedValue, isCorrect);
  };

  const goNext = () => {
    if (currentIndex >= sessionItems.length - 1) {
      // Snapshot card statuses
      const newStatuses: Record<string, "correct" | "wrong"> = {};
      sessionItems.forEach((item) => {
        if (item.isRetry) return;
        const a = answers[item.sessionKey];
        if (a) newStatuses[item.sense_id] = a.isCorrect ? "correct" : "wrong";
      });
      setCardStatuses(newStatuses);
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

  // ── Effects ───────────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (!props.autoStart) return;
    if (started) return;
    if (autoStartRef.current) return;
    autoStartRef.current = true;
    void startSessionWithApi();
  }, [props.autoStart, started]);

  // Reset input when card changes (fresh start for each card, including retries)
  useEffect(() => {
    if (!current) return;
    if (currentEffectiveTaskMode !== "translation") {
      setInput("");
      return;
    }
    const existing = answers[current.sessionKey];
    setInput(existing?.given ?? "");
  }, [current?.sessionKey]); // intentionally omit answers/currentEffectiveTaskMode

  // Coach context
  useEffect(() => {
    if (started && !completed && current?.lemma) {
      setCurrentLemma(current.lemma);
    } else {
      setCurrentLemma(null);
    }
    return () => setCurrentLemma(null);
  }, [started, completed, current?.lemma, setCurrentLemma]);

  // Auto-focus input in translation mode
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

  // Load recommendations after completion
  useEffect(() => {
    if (!completed || !sessionId) return;
    const load = async () => {
      try {
        setLoadingRecs(true);
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;
        const res = await fetch(
          `/api/vocab/packs/${slug}/recommendations?sessionId=${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && Array.isArray(data.items)) setRecommendations(data.items);
      } finally {
        setLoadingRecs(false);
      }
    };
    void load();
  }, [completed, slug, sessionId]);

  // Enter → goNext when answer is already checked
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (!checked) return;
      if (completed) return;
      // Don't interfere if focus is inside an input or button
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "BUTTON" || tag === "TEXTAREA") return;
      e.preventDefault();
      goNext();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [checked, completed, goNext]);

  // Animate XP counter and progress bar when completed screen appears
  useEffect(() => {
    if (!completed) return;
    const xpTarget = award?.xp_awarded ?? optimisticXpAwarded ?? OPTIMISTIC_XP;
    setDisplayedXp(0);
    const duration = 1000;
    const startTime = Date.now();
    let rafId: number;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedXp(Math.round(xpTarget * eased));
      if (t < 1) { rafId = requestAnimationFrame(tick); }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [completed, award, optimisticXpAwarded]);

  useEffect(() => {
    if (!completed || !award) return;
    const pct = award.xp_to_next_level > 0
      ? Math.min((award.xp_in_current_level / award.xp_to_next_level) * 100, 100)
      : 0;
    const timer = setTimeout(() => setXpBarWidth(pct), 200);
    return () => clearTimeout(timer);
  }, [completed, award]);

  // Award XP after completion
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
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Nie udało się przyznać XP.");
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
          xp_skip_reason: data.xp_skip_reason ?? null,
        });
        setSummary(data.summary ?? null);
        emitTrainingCompleted({ type: "pack", slug });

        if (props.assignmentId && !assignmentCompleteRef.current) {
          try {
            const cr = await fetch(`/api/lessons/assignments/${props.assignmentId}/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                session_id: sessionId,
                exercise_type: "pack",
                context_slug: slug,
              }),
            });
            if (cr.ok) {
              const cd = await cr.json();
              if (cd.ok) {
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
      if (!res.ok) throw new Error("Nie udało się dodać słówek.");
      const data = await res.json();
      if (!data.ok) throw new Error("Nie udało się dodać słówek.");
      setAddStatus(`Dodano do puli: ${data.added ?? 0}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się dodać słówek.");
    } finally {
      setAdding(false);
    }
  };

  // ── Shared UI blocks ──────────────────────────────────────────────────────

  const errorBlock = error ? (
    <div className="mb-4 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
      <p className="text-sm text-rose-700">
        <span className="font-semibold">Błąd: </span>
        {error}
      </p>
    </div>
  ) : null;

  const toastBlock = saveToast ? (
    <div className="mb-4 rounded-2xl border border-slate-200/50 bg-white/90 px-4 py-2.5 text-xs text-slate-500">
      {saveToast}
    </div>
  ) : null;

  // ══════════════════════════════════════════════════════════════════════════
  // PRE-START SCREEN
  // ══════════════════════════════════════════════════════════════════════════

  if (!started) {
    if (startLoading) {
      return (
        <div>
          <header className="mb-5">
            <BackButton href="/app/vocab/packs" />
            <h1 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">{pack.title ?? slug}</h1>
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
          <BackButton href="/app/vocab/packs" />
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">{pack.title ?? slug}</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">{pack.description ?? "Ćwicz szybkie tłumaczenia"}</p>
          {allItems.length > 0 ? (
            <p className="mt-2 text-sm font-medium tabular-nums text-slate-600">
              {allItems.length} {polishFiszkiLabel(allItems.length)} w zestawie
            </p>
          ) : null}
        </header>

        {errorBlock}
        {toastBlock}

        <div className="space-y-4">
          {/* ── Row 1: Direction + Count + CTA ── */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/50 bg-white/90 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <OptionButton active={direction === "en-pl"} onClick={() => setDirection("en-pl")}>ENG → PL</OptionButton>
            <OptionButton active={direction === "pl-en"} onClick={() => setDirection("pl-en")}>PL → ENG</OptionButton>
            <OptionButton active={direction === "mix"} onClick={() => setDirection("mix")}>MIX</OptionButton>
            <div className="mx-1 h-6 w-px bg-slate-200" />
            {(["5", "10", "all"] as CountChoice[]).map((c) => (
              <OptionButton key={c} active={countChoice === c} onClick={() => setCountChoice(c)}>
                {c === "all" ? "Wszystkie" : c}
              </OptionButton>
            ))}
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => void startSessionWithApi()}
                disabled={startLoading}
                className="btn-primary shadow-sm"
              >
                {startLoading ? "Ładowanie…" : "Zacznij →"}
              </button>
            </div>
          </div>

          {/* ── Row 2: Task mode ── */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/50 bg-white/90 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Tryb:
            </span>
            <OptionButton active={taskMode === "translation"} onClick={() => setTaskMode("translation")}>
              Tłumaczenie
            </OptionButton>
            <OptionButton active={taskMode === "multiple-choice"} onClick={() => setTaskMode("multiple-choice")}>
              Wielokrotny wybór
            </OptionButton>
            <OptionButton active={taskMode === "mix"} onClick={() => setTaskMode("mix")}>Mix</OptionButton>
          </div>

          {/* ── Card grid ── */}
          {allItems.length > 0 ? (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
            >
              {allItems.map((item) => (
                <FlipCard
                  key={item.id}
                  item={item}
                  status={cardStatuses[item.sense_id] ?? null}
                  isFlipped={flippedCards.has(item.id)}
                  onFlip={() =>
                    setFlippedCards((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                />
              ))}
            </div>
          ) : null}

        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMPLETED SCREEN
  // ══════════════════════════════════════════════════════════════════════════

  if (completed) {
    const xpTarget = award?.xp_awarded ?? optimisticXpAwarded ?? OPTIMISTIC_XP;
    const almostCount = sessionSummaryData?.almost.length ?? 0;
    const knowWellCount = sessionSummaryData?.knowWell.length ?? summaryCorrect;
    const needReviewCount = sessionSummaryData?.needReview.length ?? summaryWrong;

    return (
      <div className="space-y-4">
        {/* ── Header ── */}
        <header>
          <Link href="/app/vocab/packs" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700">
            ← Fiszki
          </Link>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Sesja zakończona</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">{pack.title ?? slug}</p>
        </header>

        {errorBlock}
        {toastBlock}
        {assignmentToast ? (
          <div className="rounded-2xl border border-slate-200/50 bg-white/90 px-4 py-2.5 text-xs text-slate-600">
            {assignmentToast}
          </div>
        ) : null}

        {/* ── CTA buttons — top ── */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setCompleted(false); setStarted(false); }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Konfiguruj
          </button>
          <button
            type="button"
            onClick={() => void startSessionWithApi()}
            disabled={startLoading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            Jeszcze raz
          </button>
          <button
            type="button"
            onClick={() => startSession(wrongItemsForRetry)}
            disabled={wrongItemsForRetry.length === 0 || startLoading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ćwicz tylko błędne
          </button>
          <Link
            href="/app/vocab/packs"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Wróć do fiszek
          </Link>
        </div>

        {/* ── Wyniki + XP — side by side ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Wyniki */}
          <section className={cardBase}>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Wyniki</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CorrectIcon size={18} /> Znam dobrze
                </span>
                <span className="text-sm font-bold tabular-nums text-emerald-800">{knowWellCount}</span>
              </div>
              {almostCount > 0 ? (
                <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-amber-700">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "inline-block", flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="9" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.6" />
                      <path d="M12 8v5" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
                      <circle cx="12" cy="15.5" r="1.1" fill="#f59e0b" />
                    </svg>
                    Prawie
                  </span>
                  <span className="text-sm font-bold tabular-nums text-amber-800">{almostCount}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium text-rose-700">
                  <WrongIcon size={18} /> Do powtórki
                </span>
                <span className="text-sm font-bold tabular-nums text-rose-800">{needReviewCount}</span>
              </div>
            </div>
            <p className="mt-3 text-right text-xs text-slate-400">
              {summaryTotal ? Math.round(summaryAccuracy * 100) : 0}% skuteczności
            </p>
          </section>

          {/* XP */}
          <section className={cardBase}>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">XP</h2>
            {award?.xp_awarded === 0 ? (
              <p className="text-sm text-amber-700">{xpZeroSessionMessage(award.xp_skip_reason)}</p>
            ) : (
              <>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  +{displayedXp} <span className="text-base font-semibold text-slate-400">XP</span>
                </p>
                {award ? (
                  <>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#178CF2] transition-all duration-1000 ease-out"
                        style={{ width: `${xpBarWidth}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      Poziom {award.level} · {award.xp_in_current_level}/{award.xp_to_next_level} XP
                    </p>
                  </>
                ) : awardError ? (
                  <p className="mt-1 text-xs text-rose-500">{awardError}</p>
                ) : (
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100" />
                )}
              </>
            )}
            {award?.newly_awarded_badges?.length ? (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Nowe odznaki</p>
                {award.newly_awarded_badges.map((badge) => (
                  <p key={badge.slug} className="text-xs text-slate-700">
                    {badge.title}{badge.description ? ` — ${badge.description}` : ""}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        {/* ── Dodaj do puli ── */}
        {loadingRecs ? <p className="text-xs text-slate-400">Pobieram rekomendacje…</p> : null}
        {!loadingRecs && recommendations.length > 0 ? (
          <section className={cardBase}>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Dodaj do puli</h2>
            <ul className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1">
              {recommendations.map((item) => (
                <li key={item.sense_id} className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
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
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVE SESSION
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-5">
        <Link href="/app/vocab/packs" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700">
          ← Fiszki
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{pack.title ?? slug}</h1>
      </header>

      {errorBlock}
      {toastBlock}

      {current ? (
        <div className="space-y-4">
          {/* ── Progress header ── */}
          <div className="flex items-end justify-between">
            {/* Card counter */}
            <span className="text-base text-slate-500">
              <span className="text-xl font-bold text-slate-800">{currentIndex + 1}</span>
              <span className="text-slate-400"> / {total}</span>
              {current.isRetry ? <span className="ml-2 text-xs font-medium text-amber-500">↩ powtórka</span> : null}
            </span>
            {/* % correct — big, color-coded */}
            <div className="text-right">
              <div
                className={`text-3xl font-black leading-none tabular-nums ${
                  progress === 0
                    ? "text-slate-300"
                    : percentCorrect >= 70
                      ? "text-emerald-500"
                      : percentCorrect >= 40
                        ? "text-amber-500"
                        : "text-orange-500"
                }`}
              >
                {progress === 0 ? "—" : `${percentCorrect}%`}
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                poprawnych
              </div>
            </div>
          </div>

          {/* ── Segmented dot progress ── */}
          {total <= 25 ? (
            <div className="flex flex-wrap gap-1">
              {sessionItems.map((item, i) => {
                const ans = answers[item.sessionKey];
                const isCurrent = i === currentIndex && !ans;
                return (
                  <span
                    key={item.sessionKey}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      ans?.isCorrect
                        ? "w-6 bg-emerald-400"
                        : ans && !ans.isCorrect
                          ? "w-6 bg-orange-400"
                          : isCurrent
                            ? "w-6 bg-sky-400"
                            : "w-2 bg-slate-200"
                    }`}
                  />
                );
              })}
            </div>
          ) : (
            /* Stacked color bar for large decks */
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="flex h-full">
                <div
                  className="bg-emerald-400 transition-all duration-500"
                  style={{ width: `${total ? (correctCount / total) * 100 : 0}%` }}
                />
                <div
                  className="bg-orange-400 transition-all duration-500"
                  style={{ width: `${total ? ((progress - correctCount) / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Main card ── */}
          <section className={cardBase}>
            {/* Prompt */}
            <div className="mb-6 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {currentDirection === "en-pl" ? "Przetłumacz na polski" : "Przetłumacz na angielski"}
              </div>
              {current.cefr_level ? (
                <span className={`mt-2 inline-block rounded-md px-2.5 py-1 text-sm font-bold tracking-wide ${cefrColor(current.cefr_level)}`}>
                  {current.cefr_level}
                </span>
              ) : null}
              <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {currentDirection === "en-pl" ? current.lemma ?? "—" : current.translation_pl ?? "—"}
              </div>
            </div>

            {/* ── Translation mode: text input ── */}
            {currentEffectiveTaskMode === "translation" && !checked ? (
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentDirection === "en-pl" ? "Wpisz tłumaczenie…" : "Wpisz słowo po angielsku…"}
                className="w-full rounded-xl border border-slate-100 bg-white/80 px-4 py-4 text-center text-base text-slate-800 placeholder:text-slate-300 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  checkAnswer();
                }}
              />
            ) : null}

            {/* ── Multiple Choice: 2×2 grid ── */}
            {currentEffectiveTaskMode === "multiple-choice" && !checked ? (
              <div className="grid grid-cols-2 gap-2">
                {currentMcChoices.map((choice, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleMcAnswer(choice)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-base text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : null}

            {/* ── Feedback after answer ── */}
            {checked ? (
              <div className="mt-5 space-y-3">
                {currentAnswer?.isCorrect ? (
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 space-y-1.5 max-w-sm mx-auto">
                    <p className="flex items-center gap-1.5 text-base font-semibold text-emerald-700">
                      <CorrectIcon size={20} /> Poprawnie!
                    </p>
                    {current.definition_en ? (
                      <p className="text-sm text-slate-500 pl-7">{current.definition_en}</p>
                    ) : null}
                    {current.example_en ? (
                      <p className="text-sm italic text-slate-400 pl-7">&ldquo;{current.example_en}&rdquo;</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl bg-orange-50/80 px-4 py-3.5 space-y-3 max-w-sm mx-auto">
                    {/* Wrong answer row */}
                    <div className="flex items-start gap-3">
                      <WrongIcon size={28} />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Twoja odpowiedź</p>
                        <p className="mt-0.5 text-lg font-semibold text-red-600">{currentAnswer?.given || "—"}</p>
                      </div>
                    </div>
                    {/* Correct answer row */}
                    <div className="flex items-start gap-3">
                      <CorrectIcon size={32} />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Poprawnie</p>
                        <p className="mt-0.5 text-lg font-bold text-slate-900">{currentAnswer?.expected ?? "—"}</p>
                      </div>
                    </div>
                    {current.definition_en ? (
                      <p className="pt-0.5 border-t border-orange-100 text-sm text-slate-500">{current.definition_en}</p>
                    ) : null}
                    {current.example_en ? (
                      <p className="text-sm italic text-slate-400">&ldquo;{current.example_en}&rdquo;</p>
                    ) : null}
                  </div>
                )}

                {/* Word tip */}
                {(() => {
                  const tip = getWordTip(
                    current.lemma,
                    !currentAnswer?.isCorrect ? currentAnswer?.given : undefined,
                  );
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

            {/* ── Navigation ── */}
            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                ←
              </button>

              {currentEffectiveTaskMode === "translation" && !checked ? (
                <button
                  type="button"
                  onClick={checkAnswer}
                  className="relative flex-1 inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-sky-400 to-blue-700 px-5 py-3 text-base font-bold shadow-md shadow-blue-200/50 ring-1 ring-inset ring-white/20 transition hover:brightness-105 hover:shadow-lg"
                  style={{ color: "#fff" }}
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                  <span className="relative">Sprawdź</span>
                </button>
              ) : checked ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {currentIndex === sessionItems.length - 1 ? "Zakończ" : "Dalej"}
                </button>
              ) : null /* MC mode: no center button while waiting for choice */}

              <button
                type="button"
                onClick={goNext}
                disabled={!checked}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
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
