export const SENTENCE_BUILDER_SUBJECTS = ["I", "you", "he", "she", "it", "we", "they"] as const;

export const SENTENCE_BUILDER_FORMS = ["affirmative", "negative", "question"] as const;

export const SENTENCE_BUILDER_TYPES = ["tense", "modal"] as const;
export const SENTENCE_BUILDER_MODES = ["builder", "challenge"] as const;

export const SENTENCE_BUILDER_TENSES = [
  "present-simple",
  "past-simple",
  "future-simple",
  "present-continuous",
  "present-perfect",
] as const;

export const SENTENCE_BUILDER_MODAL_PATTERNS = ["base", "perfect", "continuous"] as const;

export type SentenceBuilderSubject = (typeof SENTENCE_BUILDER_SUBJECTS)[number];
export type SentenceBuilderForm = (typeof SENTENCE_BUILDER_FORMS)[number];
export type SentenceBuilderType = (typeof SENTENCE_BUILDER_TYPES)[number];
export type SentenceBuilderMode = (typeof SENTENCE_BUILDER_MODES)[number];
export type SentenceBuilderTense = (typeof SENTENCE_BUILDER_TENSES)[number];
export type SentenceBuilderModalPattern = (typeof SENTENCE_BUILDER_MODAL_PATTERNS)[number];

export type SentenceBuilderVerb = {
  base: string;
  past: string;
  pastParticiple: string;
};

export type SentenceBuilderPreset = {
  type?: SentenceBuilderType;
  tense?: string;
  modal?: string;
};

export type SentenceBuilderTokenType =
  | "subject"
  | "auxiliary"
  | "modal"
  | "perfect"
  | "continuous"
  | "negation"
  | "verb"
  | "place"
  | "time";

export type SentenceBuilderToken = {
  type: SentenceBuilderTokenType;
  value: string;
};

export type BuildSentenceOptions = {
  type: SentenceBuilderType;
  tense?: SentenceBuilderTense;
  modal?: string;
  form: SentenceBuilderForm;
  subject: SentenceBuilderSubject;
  verb: string;
  place?: string;
  time?: string;
};

export type BuildSentenceResult = {
  sentence: string;
  structure: string;
  tokens?: SentenceBuilderToken[];
};
