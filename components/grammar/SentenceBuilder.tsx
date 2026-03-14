"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  generateChallenge,
  validateChallengeAnswer,
} from "@/lib/grammar/sentence-builder/challengeEngine";
import {
  pickValidVerbPlace,
  pickValidVerbPlaceWithDifferentVerb,
  SENTENCE_BUILDER_MODALS,
} from "@/lib/grammar/sentence-builder/constants";
import { buildSentence } from "@/lib/grammar/sentence-builder/sentenceEngine";
import {
  SENTENCE_BUILDER_FORMS,
  SENTENCE_BUILDER_MODES,
  SENTENCE_BUILDER_SUBJECTS,
  SENTENCE_BUILDER_TENSES,
  SENTENCE_BUILDER_TYPES,
  type SentenceBuilderForm,
  type SentenceBuilderMode,
  type SentenceBuilderPreset,
  type SentenceBuilderSubject,
  type SentenceBuilderTense,
  type SentenceBuilderType,
  type SentenceBuilderVerb,
} from "@/lib/grammar/sentence-builder/types";
import { registerSentenceBuilderVerbs } from "@/lib/grammar/sentence-builder/verbEngine";

type SentenceBuilderProps = {
  verbs: SentenceBuilderVerb[];
  presetType?: SentenceBuilderPreset["type"];
  presetTense?: SentenceBuilderPreset["tense"];
  presetModal?: SentenceBuilderPreset["modal"];
};

const TENSE_LABELS: Record<SentenceBuilderTense, string> = {
  "present-simple": "Present Simple",
  "past-simple": "Past Simple",
  "future-simple": "Future Simple",
  "present-continuous": "Present Continuous",
  "present-perfect": "Present Perfect",
};

const TYPE_LABELS: Record<SentenceBuilderType, string> = {
  tense: "tenses",
  modal: "modal verbs",
};

const MODE_LABELS: Record<SentenceBuilderMode, string> = {
  builder: "Build",
  challenge: "Challenge",
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
  const [challengeFeedback, setChallengeFeedback] = useState<null | { correct: boolean; expectedSentence: string }>(null);

  const checkChallengeAnswer = () => {
    setChallengeFeedback(validateChallengeAnswer(challengeAnswer, expectedSentence));
  };

  return (
    <div key={challengeKey} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-slate-900">Translate into English:</div>
        <p className="text-base text-slate-800">{prompt}</p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">Your answer:</span>
        <input
          type="text"
          value={challengeAnswer}
          onChange={(event) => setChallengeAnswer(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          placeholder="Type the sentence in English"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={checkChallengeAnswer}
          className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          Check answer
        </button>
        <button
          type="button"
          onClick={onGenerateNewChallenge}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
        >
          Generate new challenge
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
          <p className="font-medium">{challengeFeedback.correct ? "Correct!" : "Incorrect."}</p>
          {!challengeFeedback.correct && <p>Correct sentence: {challengeFeedback.expectedSentence}</p>}
        </div>
      )}
    </div>
  );
}

export default function SentenceBuilder({ verbs, presetType, presetTense, presetModal }: SentenceBuilderProps) {
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
    presetModal && SENTENCE_BUILDER_MODALS.includes(presetModal as (typeof SENTENCE_BUILDER_MODALS)[number])
      ? (presetModal as (typeof SENTENCE_BUILDER_MODALS)[number])
      : "should";

  const [mode, setMode] = useState<SentenceBuilderMode>("builder");
  const [type, setType] = useState<SentenceBuilderType>(initialType);
  const [tense, setTense] = useState<SentenceBuilderTense>(initialTense);
  const [modal, setModal] = useState<(typeof SENTENCE_BUILDER_MODALS)[number]>(initialModal);
  const [form, setForm] = useState<SentenceBuilderForm>("affirmative");
  const [subject, setSubject] = useState<SentenceBuilderSubject>("I");
  const regenerateCounterRef = useRef(0);
  const [verbPlacePair, setVerbPlacePair] = useState(() => pickValidVerbPlace(0));
  const [showStructure, setShowStructure] = useState(false);

  const verb = verbPlacePair.verb;
  const place = verbPlacePair.place;

  const handleRegenerateSentence = () => {
    regenerateCounterRef.current += 1;
    const nextStep = regenerateCounterRef.current;
    setVerbPlacePair((prev) => pickValidVerbPlaceWithDifferentVerb(prev.verb, nextStep));
  };

  const inferredTime = useMemo(() => {
    if (type === "modal") return "today";
    switch (tense) {
      case "present-simple":
        return "every day";
      case "past-simple":
        return "yesterday";
      case "future-simple":
        return "tomorrow";
      case "present-continuous":
        return "now";
      case "present-perfect":
        return "today";
      default:
        return "today";
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

  const result = useMemo(
    () =>
      buildSentence({
        type,
        tense,
        modal,
        form,
        subject,
        verb,
        place,
        time: inferredTime,
      }),
    [form, inferredTime, modal, place, subject, tense, type, verb]
  );
  const challenge = useMemo(
    () =>
      generateChallenge({
        verbs,
        preset: challengePreset,
        step: challengeStep,
      }),
    [challengePreset, challengeStep, verbs]
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {SENTENCE_BUILDER_MODES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`rounded-xl border px-4 py-2 text-sm transition ${
              mode === option
                ? "border-slate-900 bg-white font-semibold text-slate-900"
                : "border-slate-300 bg-white font-medium text-slate-800 hover:bg-slate-50"
            }`}
          >
            {MODE_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-800">Sentence type</span>
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
            <span className="text-sm font-medium text-slate-800">Tense</span>
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
            <span className="text-sm font-medium text-slate-800">Modal</span>
            <select
              value={modal}
              onChange={(event) => setModal(event.target.value as (typeof SENTENCE_BUILDER_MODALS)[number])}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              {SENTENCE_BUILDER_MODALS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Past time markers build modal perfect. `now` builds modal continuous.</p>
          </label>
        )}

        {mode === "builder" && (
          <>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-800">Form</span>
              <select
                value={form}
                onChange={(event) => setForm(event.target.value as SentenceBuilderForm)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                {SENTENCE_BUILDER_FORMS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-800">Subject</span>
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
          </>
        )}
      </div>

      {mode === "builder" ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">Generated sentence</span>
              <button
                type="button"
                onClick={handleRegenerateSentence}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Regenerate sentence
              </button>
            </div>
            <p className="text-base text-slate-800">
              {renderSentenceWithBoldVerb(result.tokens, form === "question" ? "?" : ".")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowStructure((current) => !current)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Show structure
            </button>
          </div>

          {showStructure && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <pre className="whitespace-pre-wrap break-words text-sm text-slate-700">{result.structure}</pre>
            </div>
          )}
        </>
      ) : (
        <ChallengePanel
          key={`${challengeStep}:${challenge.expectedSentence}`}
          challengeKey={`${challengeStep}:${challenge.expectedSentence}`}
          prompt={challenge.prompt}
          expectedSentence={challenge.expectedSentence}
          onGenerateNewChallenge={() => setChallengeStep((current) => current + 1)}
        />
      )}
    </section>
  );
}
