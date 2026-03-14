export const SENTENCE_BUILDER_PLACES = [
  "to the cinema",
  "to the restaurant",
  "to the park",
  "to the office",
  "to the shop",
  "home",
] as const;

/** Verbs that work with "to X" places without object (e.g. "I go to the cinema" ✓, "I take to the cinema" ✗).
 *  Excludes "get" – "We haven't got to the cinema" is ambiguous (have got = possess vs arrive). */
const PLACE_SAFE_VERBS = ["go", "come"] as const;

/** Verbs that work with "home" (leave home ✓, leave to the cinema ✗) */
const HOME_SAFE_VERBS = ["go", "come", "leave"] as const;

export type ValidVerbPlacePair = { verb: string; place: string };

export function getValidVerbPlacePairs(): ValidVerbPlacePair[] {
  const pairs: ValidVerbPlacePair[] = [];
  for (const place of SENTENCE_BUILDER_PLACES) {
    const verbs = place === "home" ? HOME_SAFE_VERBS : PLACE_SAFE_VERBS;
    for (const verb of verbs) {
      pairs.push({ verb, place });
    }
  }
  return pairs;
}

function pickItem<T>(items: readonly T[], step: number, offset: number): T {
  return items[(step * offset) % items.length]!;
}

export function pickValidVerbPlace(step: number): ValidVerbPlacePair {
  const pairs = getValidVerbPlacePairs();
  return pickItem(pairs, step, 1);
}

export function pickValidVerbPlaceWithDifferentVerb(
  currentVerb: string,
  step: number
): ValidVerbPlacePair {
  const pairs = getValidVerbPlacePairs().filter((p) => p.verb !== currentVerb);
  if (pairs.length === 0) return pickValidVerbPlace(step);
  return pickItem(pairs, step, 1);
}

export const SENTENCE_BUILDER_TIMES = [
  "yesterday",
  "last night",
  "today",
  "tomorrow",
  "two days ago",
  "now",
  "later",
] as const;

export const SENTENCE_BUILDER_MODALS = ["can", "could", "should", "must", "might", "may", "would"] as const;
