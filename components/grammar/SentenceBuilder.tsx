"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateChallenge,
  validateChallengeAnswer,
} from "@/lib/grammar/sentence-builder/challengeEngine";
import {
  fetchChallengeExamples,
  pickRandomExample,
  type DbSentenceExample,
} from "@/lib/grammar/sentence-builder/dbExamples";
import {
  pickValidVerbPlace,
  pickValidVerbPlaceWithDifferentVerb,
  SENTENCE_BUILDER_MODALS,
} from "@/lib/grammar/sentence-builder/constants";
import { buildSentence } from "@/lib/grammar/sentence-builder/sentenceEngine";
import {
  SENTENCE_BUILDER_SUBJECTS,
  SENTENCE_BUILDER_TENSES,
  SENTENCE_BUILDER_TYPES,
  type SentenceBuilderPreset,
  type SentenceBuilderSubject,
  type SentenceBuilderTense,
  type SentenceBuilderType,
  type SentenceBuilderVerb,
} from "@/lib/grammar/sentence-builder/types";
import { registerSentenceBuilderVerbs } from "@/lib/grammar/sentence-builder/verbEngine";
import { deEdToBase, deIngToBase, deSToBase, parseSentence, type SentenceParseResult } from "@/lib/grammar/sentence-builder/verbParser";

type SentenceBuilderProps = {
  verbs: SentenceBuilderVerb[];
  presetType?: SentenceBuilderPreset["type"];
  presetTense?: SentenceBuilderPreset["tense"];
  presetModal?: SentenceBuilderPreset["modal"];
};

// UI-only mode — extends the backend "builder" | "challenge" with "analyze"
type UIMode = "builder" | "challenge" | "analyze";

const UI_MODES: { id: UIMode; label: string }[] = [
  { id: "builder",   label: "Buduj" },
  { id: "challenge", label: "Challenge" },
  { id: "analyze",   label: "Analizuj zdanie" },
];

const TENSE_LABELS: Record<SentenceBuilderTense, string> = {
  "present-simple":    "Present Simple",
  "past-simple":       "Past Simple",
  "future-simple":     "Future Simple",
  "present-continuous": "Present Continuous",
  "present-perfect":   "Present Perfect",
  "past-continuous":   "Past Continuous",
  "past-perfect":      "Past Perfect",
  "future-continuous": "Future Continuous",
  "future-perfect":    "Future Perfect",
};

const TYPE_LABELS: Record<SentenceBuilderType, string> = {
  tense: "Czasy",
  modal: "Modal verbs",
};

const VERB_TOKEN_TYPES = new Set(["auxiliary", "modal", "perfect", "continuous", "verb"]);

function renderSentenceWithBoldVerb(
  tokens: { type: string; value: string }[] | undefined,
  punctuation: string
) {
  if (!tokens?.length) return null;
  return (
    <>
      {tokens.map((t, i) => {
        const isVerbPart = VERB_TOKEN_TYPES.has(t.type);
        return (
          <span key={i}>
            {i > 0 && " "}
            {isVerbPart ? <strong>{t.value}</strong> : t.value}
          </span>
        );
      })}
      {punctuation}
    </>
  );
}

function ChallengePanel({
  challengeKey,
  prompt,
  expectedSentence,
  onGenerateNewChallenge,
}: {
  challengeKey: string;
  prompt: string;
  expectedSentence: string;
  onGenerateNewChallenge: () => void;
}) {
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [challengeFeedback, setChallengeFeedback] = useState<null | {
    correct: boolean;
    expectedSentence: string;
  }>(null);

  const checkChallengeAnswer = () => {
    setChallengeFeedback(validateChallengeAnswer(challengeAnswer, expectedSentence));
  };

  return (
    <div key={challengeKey} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-slate-900">Przetłumacz na angielski:</div>
        <p className="text-base text-slate-800">{prompt}</p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">Twoja odpowiedź:</span>
        <input
          type="text"
          value={challengeAnswer}
          onChange={(event) => setChallengeAnswer(event.target.value)}
          onKeyDown={(e) => e.key === "Enter" && checkChallengeAnswer()}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          placeholder="Wpisz zdanie po angielsku"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={checkChallengeAnswer}
          className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          Sprawdź
        </button>
        <button
          type="button"
          onClick={onGenerateNewChallenge}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
        >
          Nowy challenge
        </button>
      </div>

      {challengeFeedback && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            challengeFeedback.correct
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <p className="font-medium">
            {challengeFeedback.correct ? "Poprawnie! ✓" : "Niepoprawnie."}
          </p>
          {!challengeFeedback.correct && (
            <p className="mt-1">
              Poprawne zdanie: <span className="font-medium">{challengeFeedback.expectedSentence}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Custom verb section ──────────────────────────────────────────────────────

type CustomVerbProps = {
  verb: string;
  complement: string;
  onVerbChange: (v: string) => void;
  onComplementChange: (c: string) => void;
};

function CustomVerbInputs({ verb, complement, onVerbChange, onComplementChange }: CustomVerbProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-800">
          Czasownik <span className="font-normal text-slate-500">(base form)</span>
        </span>
        <input
          type="text"
          value={verb}
          onChange={(e) => onVerbChange(e.target.value.trim().toLowerCase())}
          placeholder="np. eat, run, think…"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 placeholder:text-slate-400"
          spellCheck={false}
          autoComplete="off"
        />
        <p className="text-xs text-slate-500">
          Wpisz czasownik w formie podstawowej. Koniugacja następuje automatycznie.
        </p>
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-800">
          Dopełnienie <span className="font-normal text-slate-500">(opcjonalnie)</span>
        </span>
        <input
          type="text"
          value={complement}
          onChange={(e) => onComplementChange(e.target.value)}
          placeholder="np. an apple, at home, my friend…"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 placeholder:text-slate-400"
          autoComplete="off"
        />
        <p className="text-xs text-slate-500">
          Dodaj obiekt lub miejsce — system doda go do zdania bez koniugacji.
        </p>
      </label>
    </div>
  );
}

// ─── Base-form hint ───────────────────────────────────────────────────────────

function hasVowel(s: string): boolean {
  return /[aeiou]/i.test(s);
}

/**
 * If `word` looks like an inflected form (-ing / -ed / -s/-es/-ies),
 * returns the likely base form. Returns null for genuine base forms.
 */
function getSuggestedBase(word: string): string | null {
  if (!word || word.length < 3) return null;
  const w = word.toLowerCase().trim();

  // -ing (eating, running, making…) — require result has a vowel to avoid "br" from "bring"
  if (w.endsWith("ing") && w.length >= 5) {
    const base = deIngToBase(w);
    if (base !== w && base.length >= 2 && hasVowel(base)) return base;
  }

  // -ed (walked, stopped, loved…)
  if (w.endsWith("ed") && w.length >= 4) {
    const base = deEdToBase(w);
    if (base !== w && base.length >= 2 && hasVowel(base)) return base;
  }

  // -ies / -es / plain -s  (studies, goes, eats…) — skip -ss words
  if (!w.endsWith("ss") && (w.endsWith("ies") || w.endsWith("es") || (w.endsWith("s") && w.length >= 4))) {
    const base = deSToBase(w);
    if (base !== w && base.length >= 2 && hasVowel(base)) return base;
  }

  return null;
}

// ─── Analyze panel ────────────────────────────────────────────────────────────

function AnalyzePanel({
  verbs,
  onApply,
}: {
  verbs: SentenceBuilderVerb[];
  onApply: (verb: string, complement: string) => void;
}) {
  const [sentence, setSentence] = useState("");
  const [result, setResult] = useState<SentenceParseResult | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [editedVerb, setEditedVerb] = useState("");
  const [editedComplement, setEditedComplement] = useState("");

  const handleAnalyze = () => {
    const r = parseSentence(sentence, verbs);
    setResult(r);
    setAnalyzed(true);
    if (r) {
      setEditedVerb(r.verb);
      setEditedComplement(r.complement);
    }
  };

  const handleSentenceChange = (value: string) => {
    setSentence(value);
    setAnalyzed(false);
    setResult(null);
  };

  const confidenceMeta: Record<
    SentenceParseResult["confidence"],
    { label: string; cls: string }
  > = {
    high:   { label: "Pewność: wysoka",  cls: "bg-emerald-100 text-emerald-800" },
    medium: { label: "Pewność: średnia", cls: "bg-amber-100 text-amber-800" },
    low:    { label: "Pewność: niska",   cls: "bg-rose-100 text-rose-800" },
  };

  return (
    <div className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">Wklej zdanie po angielsku:</span>
        <textarea
          value={sentence}
          onChange={(e) => handleSentenceChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (sentence.trim()) handleAnalyze();
            }
          }}
          placeholder="np. She was eating an apple. / He can't have forgotten already. / Did they go home?"
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 placeholder:text-slate-400"
        />
        <p className="text-xs text-slate-500">
          Naciśnij Enter lub kliknij „Analizuj" — system wykryje czasownik i dopełnienie.
        </p>
      </label>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!sentence.trim()}
        className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Analizuj
      </button>

      {analyzed && !result && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 space-y-1">
          <p className="text-sm font-medium text-rose-700">Zdanie nierozpoznane</p>
          <p className="text-sm text-rose-600">
            Nie udało się wykryć angielskiego czasownika. Wklej poprawne zdanie po angielsku
            lub skorzystaj z trybu „Własny", aby wpisać czasownik ręcznie.
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          {/* Confidence + note */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                confidenceMeta[result.confidence].cls
              }`}
            >
              {confidenceMeta[result.confidence].label}
            </span>
            <span className="text-xs text-slate-500">{result.note}</span>
          </div>

          {/* Editable verb + complement */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Wykryty czasownik{" "}
                <span className="font-normal text-slate-500">(base form)</span>
              </span>
              <input
                type="text"
                value={editedVerb}
                onChange={(e) => setEditedVerb(e.target.value.trim().toLowerCase())}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Dopełnienie{" "}
                <span className="font-normal text-slate-500">(opcjonalnie)</span>
              </span>
              <input
                type="text"
                value={editedComplement}
                onChange={(e) => setEditedComplement(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                autoComplete="off"
              />
            </label>
          </div>

          <p className="text-xs text-slate-500">
            Możesz poprawić wykryty czasownik lub dopełnienie przed zastosowaniem.
          </p>

          <button
            type="button"
            onClick={() => onApply(editedVerb, editedComplement)}
            disabled={!editedVerb}
            className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ color: "#fff" }}
          >
            Zastosuj i buduj →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SentenceBuilder({
  verbs,
  presetType,
  presetTense,
  presetModal,
}: SentenceBuilderProps) {
  useEffect(() => {
    registerSentenceBuilderVerbs(verbs);
  }, [verbs]);

  const initialType: SentenceBuilderType =
    presetType && SENTENCE_BUILDER_TYPES.includes(presetType) ? presetType : "tense";
  const initialTense: SentenceBuilderTense =
    presetTense && SENTENCE_BUILDER_TENSES.includes(presetTense as SentenceBuilderTense)
      ? (presetTense as SentenceBuilderTense)
      : "present-simple";
  const initialModal: (typeof SENTENCE_BUILDER_MODALS)[number] =
    presetModal &&
    SENTENCE_BUILDER_MODALS.includes(presetModal as (typeof SENTENCE_BUILDER_MODALS)[number])
      ? (presetModal as (typeof SENTENCE_BUILDER_MODALS)[number])
      : "should";

  const [mode, setMode] = useState<UIMode>("builder");
  const [type, setType] = useState<SentenceBuilderType>(initialType);
  const [tense, setTense] = useState<SentenceBuilderTense>(initialTense);
  const [modal, setModal] = useState<(typeof SENTENCE_BUILDER_MODALS)[number]>(initialModal);
  const [subject, setSubject] = useState<SentenceBuilderSubject>("I");
  const regenerateCounterRef = useRef(0);
  const [verbPlacePair, setVerbPlacePair] = useState(() => pickValidVerbPlace(0));
  const [showStructure, setShowStructure] = useState(false);

  // ── Custom verb mode ──────────────────────────────────────────────────────
  const [verbSource, setVerbSource] = useState<"auto" | "custom">("auto");
  const [customVerb, setCustomVerb] = useState("");
  const [customComplement, setCustomComplement] = useState("");

  const verb = verbSource === "custom" ? (customVerb || "go") : verbPlacePair.verb;
  const place = verbSource === "custom" ? (customComplement || undefined) : verbPlacePair.place;

  const handleRegenerateSentence = () => {
    regenerateCounterRef.current += 1;
    const nextStep = regenerateCounterRef.current;
    setVerbPlacePair((prev) => pickValidVerbPlaceWithDifferentVerb(prev.verb, nextStep));
  };

  const handleApplyAnalysis = (verb: string, complement: string) => {
    setCustomVerb(verb);
    setCustomComplement(complement);
    setVerbSource("custom");
    setMode("builder");
  };

  const inferredTime = useMemo(() => {
    if (type === "modal") return "today";
    switch (tense) {
      case "present-simple":     return "every day";
      case "past-simple":        return "yesterday";
      case "future-simple":      return "tomorrow";
      case "present-continuous": return "now";
      case "present-perfect":    return "today";
      case "past-continuous":    return "yesterday";
      case "past-perfect":       return "yesterday";
      case "future-continuous":  return "tomorrow";
      case "future-perfect":     return "tomorrow";
      default:                   return "today";
    }
  }, [type, tense]);

  const [challengeStep, setChallengeStep] = useState(0);

  const challengePreset = useMemo(
    () => ({
      type,
      tense: type === "tense" ? tense : undefined,
      modal: type === "modal" ? modal : undefined,
    }),
    [modal, tense, type]
  );

  // All three forms — computed once, displayed in parallel
  const results = useMemo(() => {
    const base = { type, tense, modal, subject, verb, place, time: inferredTime };
    return {
      affirmative: buildSentence({ ...base, form: "affirmative" }),
      negative:    buildSentence({ ...base, form: "negative" }),
      question:    buildSentence({ ...base, form: "question" }),
    };
  }, [inferredTime, modal, place, subject, tense, type, verb]);

  // ── DB-backed challenge ───────────────────────────────────────────────────
  const [dbExamples, setDbExamples] = useState<DbSentenceExample[]>([]);
  const [dbChallenge, setDbChallenge] = useState<DbSentenceExample | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  const loadDbExamples = useCallback(async () => {
    setDbLoading(true);
    const examples = await fetchChallengeExamples({
      tense: type === "tense" ? tense : null,
      modal: type === "modal" ? modal : null,
    });
    setDbExamples(examples);
    setDbChallenge(pickRandomExample(examples));
    setDbLoading(false);
  }, [type, tense, modal]);

  // Load when entering challenge mode or when tense/modal changes
  useEffect(() => {
    if (mode === "challenge") {
      void loadDbExamples();
    }
  }, [mode, loadDbExamples]);

  const handleNewDbChallenge = useCallback(() => {
    setDbChallenge((prev) => pickRandomExample(dbExamples, prev?.id ?? undefined));
    setChallengeStep((c) => c + 1);
  }, [dbExamples]);

  // Fallback to generated challenge if DB is empty
  const challenge = useMemo(
    () =>
      generateChallenge({
        verbs,
        preset: challengePreset,
        step: challengeStep,
      }),
    [challengePreset, challengeStep, verbs]
  );

  const activeChallenge = dbChallenge
    ? { prompt: dbChallenge.sentence_pl, expectedSentence: dbChallenge.sentence_en }
    : { prompt: challenge.prompt, expectedSentence: challenge.expectedSentence };

  return (
    <section className="space-y-5">
      {/* Mode toggle */}
      <div className="flex flex-wrap gap-2">
        {UI_MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-xl border px-4 py-2 text-sm transition ${
              mode === id
                ? "border-slate-900 bg-white font-semibold text-slate-900"
                : "border-slate-300 bg-white font-medium text-slate-800 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Type + tense/modal selectors — hidden in analyze mode */}
      {mode !== "analyze" && <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-800">Typ zdania</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as SentenceBuilderType)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          >
            {SENTENCE_BUILDER_TYPES.map((option) => (
              <option key={option} value={option}>
                {TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        {type === "tense" ? (
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Czas</span>
            <select
              value={tense}
              onChange={(event) => setTense(event.target.value as SentenceBuilderTense)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              {SENTENCE_BUILDER_TENSES.map((option) => (
                <option key={option} value={option}>
                  {TENSE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Modal verb</span>
            <select
              value={modal}
              onChange={(event) =>
                setModal(event.target.value as (typeof SENTENCE_BUILDER_MODALS)[number])
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              {SENTENCE_BUILDER_MODALS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}

        {mode === "builder" && (
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Podmiot</span>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value as SentenceBuilderSubject)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              {SENTENCE_BUILDER_SUBJECTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>}

      {/* Verb source toggle + custom verb inputs (builder only) */}
      {mode === "builder" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-700">Czasownik</span>
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
              {(["auto", "custom"] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setVerbSource(src)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    verbSource === src
                      ? "bg-slate-900"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  style={verbSource === src ? { color: "#fff" } : undefined}
                >
                  {src === "auto" ? "Automatyczny" : "Własny"}
                </button>
              ))}
            </div>
          </div>

          {verbSource === "auto" ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Czasownik:{" "}
                <strong className="text-slate-900">{verbPlacePair.verb}</strong>
                {verbPlacePair.place && (
                  <>
                    {" "}
                    + <span className="text-slate-500">{verbPlacePair.place}</span>
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={handleRegenerateSentence}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Losuj inny
              </button>
            </div>
          ) : (
            <>
              <CustomVerbInputs
                verb={customVerb}
                complement={customComplement}
                onVerbChange={setCustomVerb}
                onComplementChange={setCustomComplement}
              />
              {/* Base-form hint */}
              {customVerb && (() => {
                const suggested = getSuggestedBase(customVerb);
                return suggested ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <span className="mt-0.5 text-amber-500">⚠️</span>
                    <p className="text-xs text-amber-800">
                      <strong>{customVerb}</strong> wygląda jak forma odmienna.
                      Użyj base form:{" "}
                      <button
                        type="button"
                        onClick={() => setCustomVerb(suggested)}
                        className="font-semibold underline decoration-dotted hover:no-underline"
                      >
                        {suggested}
                      </button>
                    </p>
                  </div>
                ) : null;
              })()}
            </>
          )}
        </div>
      )}

      {/* Output — all three forms in parallel */}
      {mode === "builder" && (
        <>
          <div className="space-y-2">
            {(
              [
                { key: "affirmative", icon: "✅", label: "Twierdzenie" },
                { key: "negative",    icon: "❌", label: "Przeczenie" },
                { key: "question",    icon: "❓", label: "Pytanie" },
              ] as const
            ).map(({ key, icon, label }) => {
              const r = results[key];
              return (
                <div
                  key={key}
                  className="flex items-baseline gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                >
                  <span className="shrink-0 text-base">{icon}</span>
                  <div className="min-w-0">
                    <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {label}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {renderSentenceWithBoldVerb(r.tokens, key === "question" ? "?" : ".")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowStructure((current) => !current)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              {showStructure ? "Ukryj strukturę" : "Pokaż strukturę"}
            </button>
          </div>

          {showStructure && (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {(["affirmative", "negative", "question"] as const).map((key) => (
                <pre
                  key={key}
                  className="whitespace-pre-wrap break-words font-mono text-xs text-slate-600"
                >
                  {results[key].structure}
                </pre>
              ))}
            </div>
          )}
        </>
      )}

      {mode === "challenge" && (
        dbLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-400">
            Ładowanie challengu…
          </div>
        ) : (
          <ChallengePanel
            key={`${challengeStep}:${activeChallenge.expectedSentence}`}
            challengeKey={`${challengeStep}:${activeChallenge.expectedSentence}`}
            prompt={activeChallenge.prompt}
            expectedSentence={activeChallenge.expectedSentence}
            onGenerateNewChallenge={dbExamples.length > 0 ? handleNewDbChallenge : () => setChallengeStep((c) => c + 1)}
          />
        )
      )}

      {mode === "analyze" && (
        <AnalyzePanel verbs={verbs} onApply={handleApplyAnalysis} />
      )}
    </section>
  );
}
