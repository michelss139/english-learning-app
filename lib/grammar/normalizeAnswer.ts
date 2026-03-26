/**
 * Single normalization pipeline for grammar free-text answers.
 * Always pass the same `NormalizeAnswerOptions` to both operands when comparing (see GRAMMAR_NORMALIZE_OPTIONS).
 */

const CURLY_APOSTROPHE = "\u2019"; // ’

/** Longer keys first so "doesn't" matches before shorter patterns */
const CONTRACTION_EXPANSIONS: readonly [string, string][] = [
  ["won't", "will not"],
  ["can't", "cannot"],
  ["cannot", "cannot"],
  ["couldn't", "could not"],
  ["wouldn't", "would not"],
  ["shouldn't", "should not"],
  ["doesn't", "does not"],
  ["don't", "do not"],
  ["didn't", "did not"],
  ["isn't", "is not"],
  ["aren't", "are not"],
  ["wasn't", "was not"],
  ["weren't", "were not"],
  ["haven't", "have not"],
  ["hasn't", "has not"],
  ["hadn't", "had not"],
  ["i'm", "i am"],
  ["you're", "you are"],
  ["we're", "we are"],
  ["they're", "they are"],
  ["he's", "he is"],
  ["she's", "she is"],
  ["it's", "it is"],
  ["i've", "i have"],
  ["you've", "you have"],
  ["we've", "we have"],
  ["they've", "they have"],
  ["i'll", "i will"],
  ["you'll", "you will"],
  ["we'll", "we will"],
  ["they'll", "they will"],
  ["he'll", "he will"],
  ["she'll", "she will"],
  ["it'll", "it will"],
];

export type NormalizeAnswerOptions = {
  /** When true (default), expand common contractions after apostrophe normalization */
  expandContractions?: boolean;
};

/** Default pipeline for grammar grading: identical for user input and canonical expected string. */
export const GRAMMAR_NORMALIZE_OPTIONS: NormalizeAnswerOptions = {
  expandContractions: true,
};

function normalizeApostrophes(s: string): string {
  return s.replace(new RegExp(`[']|${CURLY_APOSTROPHE}`, "g"), "'");
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function expandContractionsInNormalized(s: string): string {
  let out = ` ${s} `;
  for (const [contracted, expanded] of CONTRACTION_EXPANSIONS) {
    const re = new RegExp(`\\b${contracted.replace(/'/g, "['’]")}\\b`, "gi");
    out = out.replace(re, ` ${expanded} `);
  }
  return collapseWhitespace(out);
}

/**
 * Deterministic normalization: trim, lowercase, apostrophes (’ → '), collapse whitespace,
 * then optional contraction expansion. No fuzzy matching, edit distance, or AI.
 */
export function normalizeAnswer(raw: string, options: NormalizeAnswerOptions = GRAMMAR_NORMALIZE_OPTIONS): string {
  const expand = options.expandContractions !== false;
  let s = String(raw ?? "").trim().toLowerCase();
  s = normalizeApostrophes(s);
  s = collapseWhitespace(s);
  if (expand) {
    s = expandContractionsInNormalized(s);
  }
  return s;
}

/**
 * Strict equality after applying the SAME normalizeAnswer() to both strings (same options object).
 */
export function grammarAnswersMatch(
  userAnswer: string,
  canonicalAnswer: string,
  options: NormalizeAnswerOptions = GRAMMAR_NORMALIZE_OPTIONS,
): boolean {
  return normalizeAnswer(userAnswer, options) === normalizeAnswer(canonicalAnswer, options);
}
