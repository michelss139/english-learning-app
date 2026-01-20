/**
 * Quality gates for cluster-choice questions.
 * Deterministic, no AI, simple tokenization-based checks.
 */

export type GateReason = "short" | "no_target_form" | "contains_other_cluster_form";

export type GateResult = {
  ok: boolean;
  reasons: GateReason[];
};

// Normalize text: lowercase, normalize apostrophes, trim
export function normalizeText(text: string): string {
  return (text || "")
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .trim();
}

// Tokenize into simple word tokens (no NLP)
export function tokenizeWords(text: string): string[] {
  const tokens: string[] = [];
  const re = /[a-z]+(?:'[a-z]+)?/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    tokens.push(match[0].toLowerCase());
  }
  return tokens;
}

// Hardcoded overrides for current clusters
const OVERRIDES: Record<string, string[]> = {
  make: ["make", "makes", "made", "making"],
  do: ["do", "does", "did", "done", "doing"],
  take: ["take", "takes", "took", "taken", "taking"],
  get: ["get", "gets", "got", "gotten", "getting"],
  say: ["say", "says", "said", "saying"],
  tell: ["tell", "tells", "told", "telling"],
  lend: ["lend", "lends", "lent", "lending"],
  borrow: ["borrow", "borrows", "borrowed", "borrowing"],
  rent: ["rent", "rents", "rented", "renting"],
  hire: ["hire", "hires", "hired", "hiring"],
};

/**
 * Build accepted forms for a lemma.
 * Uses overrides for current clusters; falls back to simple -s/-ed/-ing.
 */
export function buildAcceptedFormsForLemma(lemmaNorm: string): Set<string> {
  const base = lemmaNorm.toLowerCase().trim();
  const forms = new Set<string>();

  if (OVERRIDES[base]) {
    OVERRIDES[base].forEach((f) => forms.add(f.toLowerCase()));
    return forms;
  }

  // Simple regular forms (fallback)
  forms.add(base);
  forms.add(`${base}s`);
  forms.add(`${base}ed`);
  forms.add(`${base}ing`);
  forms.add(`${base}es`);
  return forms;
}

/**
 * Evaluate an example against quality gates.
 */
export function evaluateExample(
  exampleEn: string,
  targetLemma: string,
  otherLemmas: string[]
): GateResult {
  const reasons: GateReason[] = [];
  const normalized = normalizeText(exampleEn);
  const tokens = tokenizeWords(normalized);
  const tokenSet = new Set(tokens);

  // Gate A: length
  if (tokens.length < 6) {
    reasons.push("short");
  }

  const targetForms = buildAcceptedFormsForLemma(targetLemma);
  const targetHasForm = Array.from(targetForms).some((f) => tokenSet.has(f));

  // Check other lemmas
  let otherHasForm = false;
  for (const lemma of otherLemmas) {
    const forms = buildAcceptedFormsForLemma(lemma);
    if (Array.from(forms).some((f) => tokenSet.has(f))) {
      otherHasForm = true;
      break;
    }
  }

  if (!targetHasForm) {
    reasons.push("no_target_form");
  }

  if (otherHasForm) {
    reasons.push("contains_other_cluster_form");
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}
