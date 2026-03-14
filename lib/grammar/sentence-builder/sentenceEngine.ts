import type {
  BuildSentenceOptions,
  BuildSentenceResult,
  SentenceBuilderForm,
  SentenceBuilderModalPattern,
  SentenceBuilderSubject,
  SentenceBuilderTense,
  SentenceBuilderToken,
  SentenceBuilderTokenType,
} from "./types";
import { getIngForm, getPastParticiple, getPastSimple, getThirdPersonForm } from "./verbEngine";

type SentencePart = {
  token: string;
  label: SentenceBuilderTokenType;
};

const PAST_MODAL_TIMES = new Set(["yesterday", "last night", "two days ago"]);
const CONTINUOUS_MODAL_TIMES = new Set(["now"]);

const MODAL_NEG_CONTRACTIONS: Record<string, string> = {
  can: "can't",
  could: "couldn't",
  should: "shouldn't",
  must: "mustn't",
  might: "mightn't",
  may: "mayn't",
  would: "wouldn't",
};

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function isThirdPersonSingular(subject: SentenceBuilderSubject): boolean {
  return subject === "he" || subject === "she" || subject === "it";
}

function getBeForm(subject: SentenceBuilderSubject): string {
  if (subject === "I") return "am";
  if (isThirdPersonSingular(subject)) return "is";
  return "are";
}

function getHaveForm(subject: SentenceBuilderSubject): string {
  return isThirdPersonSingular(subject) ? "has" : "have";
}

function pushOptional(parts: SentencePart[], value: string | undefined, label: "place" | "time") {
  const normalized = value?.trim();
  if (normalized) {
    parts.push({ token: normalized, label });
  }
}

function inferModalPattern(time: string | undefined): SentenceBuilderModalPattern {
  const normalized = normalize(time);

  if (PAST_MODAL_TIMES.has(normalized)) {
    return "perfect";
  }

  if (CONTINUOUS_MODAL_TIMES.has(normalized)) {
    return "continuous";
  }

  return "base";
}

function buildPresentSimple(
  form: SentenceBuilderForm,
  subject: SentenceBuilderSubject,
  verb: string
): SentencePart[] {
  if (form === "affirmative") {
    return [
      { token: subject, label: "subject" },
      { token: isThirdPersonSingular(subject) ? getThirdPersonForm(verb) : normalize(verb), label: "verb" },
    ];
  }

  if (form === "negative") {
    return [
      { token: subject, label: "subject" },
      { token: isThirdPersonSingular(subject) ? "doesn't" : "don't", label: "auxiliary" },
      { token: normalize(verb), label: "verb" },
    ];
  }

  return [
    { token: isThirdPersonSingular(subject) ? "does" : "do", label: "auxiliary" },
    { token: subject, label: "subject" },
    { token: normalize(verb), label: "verb" },
  ];
}

function buildPastSimple(
  form: SentenceBuilderForm,
  subject: SentenceBuilderSubject,
  verb: string
): SentencePart[] {
  if (form === "affirmative") {
    return [
      { token: subject, label: "subject" },
      { token: getPastSimple(verb), label: "verb" },
    ];
  }

  if (form === "negative") {
    return [
      { token: subject, label: "subject" },
      { token: "didn't", label: "auxiliary" },
      { token: normalize(verb), label: "verb" },
    ];
  }

  return [
    { token: "did", label: "auxiliary" },
    { token: subject, label: "subject" },
    { token: normalize(verb), label: "verb" },
  ];
}

function buildFutureSimple(
  form: SentenceBuilderForm,
  subject: SentenceBuilderSubject,
  verb: string
): SentencePart[] {
  if (form === "affirmative") {
    return [
      { token: subject, label: "subject" },
      { token: "will", label: "auxiliary" },
      { token: normalize(verb), label: "verb" },
    ];
  }

  if (form === "negative") {
    return [
      { token: subject, label: "subject" },
      { token: "won't", label: "auxiliary" },
      { token: normalize(verb), label: "verb" },
    ];
  }

  return [
    { token: "will", label: "auxiliary" },
    { token: subject, label: "subject" },
    { token: normalize(verb), label: "verb" },
  ];
}

function buildPresentContinuous(
  form: SentenceBuilderForm,
  subject: SentenceBuilderSubject,
  verb: string
): SentencePart[] {
  const auxiliary = getBeForm(subject);
  const ingForm = getIngForm(verb);

  if (form === "affirmative") {
    return [
      { token: subject, label: "subject" },
      { token: auxiliary, label: "auxiliary" },
      { token: ingForm, label: "verb" },
    ];
  }

  if (form === "negative") {
    const negAux =
      subject === "I"
        ? "I'm not"
        : auxiliary === "is"
          ? "isn't"
          : "aren't";
    if (subject === "I") {
      return [{ token: negAux, label: "auxiliary" }, { token: ingForm, label: "verb" }];
    }
    return [
      { token: subject, label: "subject" },
      { token: negAux, label: "auxiliary" },
      { token: ingForm, label: "verb" },
    ];
  }

  return [
    { token: auxiliary, label: "auxiliary" },
    { token: subject, label: "subject" },
    { token: ingForm, label: "verb" },
  ];
}

function buildPresentPerfect(
  form: SentenceBuilderForm,
  subject: SentenceBuilderSubject,
  verb: string
): SentencePart[] {
  const perfect = getHaveForm(subject);
  const pastParticiple = getPastParticiple(verb);

  if (form === "affirmative") {
    return [
      { token: subject, label: "subject" },
      { token: perfect, label: "perfect" },
      { token: pastParticiple, label: "verb" },
    ];
  }

  if (form === "negative") {
    const negPerfect = perfect === "has" ? "hasn't" : "haven't";
    return [
      { token: subject, label: "subject" },
      { token: negPerfect, label: "perfect" },
      { token: pastParticiple, label: "verb" },
    ];
  }

  return [
    { token: perfect, label: "perfect" },
    { token: subject, label: "subject" },
    { token: pastParticiple, label: "verb" },
  ];
}

function buildTenseParts(
  tense: SentenceBuilderTense,
  form: SentenceBuilderForm,
  subject: SentenceBuilderSubject,
  verb: string
): SentencePart[] {
  switch (tense) {
    case "present-simple":
      return buildPresentSimple(form, subject, verb);
    case "past-simple":
      return buildPastSimple(form, subject, verb);
    case "future-simple":
      return buildFutureSimple(form, subject, verb);
    case "present-continuous":
      return buildPresentContinuous(form, subject, verb);
    case "present-perfect":
      return buildPresentPerfect(form, subject, verb);
    default:
      return buildPresentSimple(form, subject, verb);
  }
}

function buildModalParts(
  pattern: SentenceBuilderModalPattern,
  form: SentenceBuilderForm,
  subject: SentenceBuilderSubject,
  modal: string,
  verb: string
): SentencePart[] {
  const normalizedModal = normalize(modal) || "should";

  if (pattern === "perfect") {
    if (form === "affirmative") {
      return [
        { token: subject, label: "subject" },
        { token: normalizedModal, label: "modal" },
        { token: "have", label: "perfect" },
        { token: getPastParticiple(verb), label: "verb" },
      ];
    }

    if (form === "negative") {
      const negModal = MODAL_NEG_CONTRACTIONS[normalizedModal] ?? `${normalizedModal}n't`;
      return [
        { token: subject, label: "subject" },
        { token: negModal, label: "modal" },
        { token: "have", label: "perfect" },
        { token: getPastParticiple(verb), label: "verb" },
      ];
    }

    return [
      { token: normalizedModal, label: "modal" },
      { token: subject, label: "subject" },
      { token: "have", label: "perfect" },
      { token: getPastParticiple(verb), label: "verb" },
    ];
  }

  if (pattern === "continuous") {
    if (form === "affirmative") {
      return [
        { token: subject, label: "subject" },
        { token: normalizedModal, label: "modal" },
        { token: "be", label: "continuous" },
        { token: getIngForm(verb), label: "verb" },
      ];
    }

    if (form === "negative") {
      const negModal = MODAL_NEG_CONTRACTIONS[normalizedModal] ?? `${normalizedModal}n't`;
      return [
        { token: subject, label: "subject" },
        { token: negModal, label: "modal" },
        { token: "be", label: "continuous" },
        { token: getIngForm(verb), label: "verb" },
      ];
    }

    return [
      { token: normalizedModal, label: "modal" },
      { token: subject, label: "subject" },
      { token: "be", label: "continuous" },
      { token: getIngForm(verb), label: "verb" },
    ];
  }

  if (form === "affirmative") {
    return [
      { token: subject, label: "subject" },
      { token: normalizedModal, label: "modal" },
      { token: normalize(verb), label: "verb" },
    ];
  }

  if (form === "negative") {
    const negModal = MODAL_NEG_CONTRACTIONS[normalizedModal] ?? `${normalizedModal}n't`;
    return [
      { token: subject, label: "subject" },
      { token: negModal, label: "modal" },
      { token: normalize(verb), label: "verb" },
    ];
  }

  return [
    { token: normalizedModal, label: "modal" },
    { token: subject, label: "subject" },
    { token: normalize(verb), label: "verb" },
  ];
}

function capitalizeFirstToken(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toResult(parts: SentencePart[], form: SentenceBuilderForm): BuildSentenceResult {
  const displayParts = parts.map((part, index) =>
    index === 0 ? { ...part, token: capitalizeFirstToken(part.token) } : part
  );
  const tokens: SentenceBuilderToken[] = displayParts.map((part) => ({
    type: part.label,
    value: part.token,
  }));

  return {
    sentence: `${displayParts.map((part) => part.token).join(" ")}${form === "question" ? "?" : "."}`,
    structure: `${displayParts.map((part) => part.token).join(" | ")}\n${displayParts
      .map((part) => part.label)
      .join(" | ")}`,
    tokens,
  };
}

export function buildSentence(options: BuildSentenceOptions): BuildSentenceResult {
  const subject = options.subject;
  const form = options.form;
  const verb = options.verb;
  const place = options.place;
  const time = options.time;

  const parts =
    options.type === "modal"
      ? buildModalParts(inferModalPattern(time), form, subject, options.modal ?? "should", verb)
      : buildTenseParts(options.tense ?? "present-simple", form, subject, verb);

  pushOptional(parts, place, "place");
  pushOptional(parts, time, "time");

  return toResult(parts, form);
}
