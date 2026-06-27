/**
 * Grammar comparison utilities
 */

import { GrammarTenseSlug, GrammarTense } from "./types";
import { getGrammarTenseBySlug, getAllGrammarTenses } from "./content";

export type ComparisonData = {
  tense1: GrammarTense;
  tense2: GrammarTense;
  title: string;
  description?: string;
};

export type ComparisonListItem = {
  tense1: GrammarTenseSlug;
  tense2: GrammarTenseSlug;
  title: string;
  group: string;
};

const CONDITIONAL_COMPARE_SLUGS = new Set<string>([
  "zero-conditional",
  "first-conditional",
  "second-conditional",
  "third-conditional",
  "mixed-conditional",
]);

const COMPARISON_GROUP_ORDER = ["Present", "Past", "Future", "Mieszane", "Conditionals"];

function comparisonGroup(t1: string, t2: string): string {
  if (CONDITIONAL_COMPARE_SLUGS.has(t1) && CONDITIONAL_COMPARE_SLUGS.has(t2)) return "Conditionals";
  const cat = (s: string) =>
    s.startsWith("present-") ? "present" : s.startsWith("past-") ? "past" : s.startsWith("future-") ? "future" : "other";
  const c1 = cat(t1);
  const c2 = cat(t2);
  if (c1 === c2 && c1 !== "other") {
    return c1 === "present" ? "Present" : c1 === "past" ? "Past" : "Future";
  }
  return "Mieszane";
}

export function comparisonKey(t1: string, t2: string): string {
  return [t1, t2].sort().join("__");
}

/** All available comparisons across every tense, de-duplicated and grouped. */
export function getAllComparisons(): ComparisonListItem[] {
  const seen = new Set<string>();
  const out: ComparisonListItem[] = [];
  for (const tense of getAllGrammarTenses()) {
    for (const c of tense.content.comparisons ?? []) {
      const key = comparisonKey(c.tense1, c.tense2);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        tense1: c.tense1 as GrammarTenseSlug,
        tense2: c.tense2 as GrammarTenseSlug,
        title: c.title,
        group: comparisonGroup(c.tense1, c.tense2),
      });
    }
  }
  return out;
}

/** Comparisons grouped into ordered sections. */
export function getGroupedComparisons(): { group: string; items: ComparisonListItem[] }[] {
  const all = getAllComparisons();
  return COMPARISON_GROUP_ORDER.map((group) => ({
    group,
    items: all.filter((c) => c.group === group),
  })).filter((g) => g.items.length > 0);
}

/**
 * Get comparison data for two tenses
 */
export function getComparison(tense1Slug: GrammarTenseSlug, tense2Slug: GrammarTenseSlug): ComparisonData | null {
  const tense1 = getGrammarTenseBySlug(tense1Slug);
  const tense2 = getGrammarTenseBySlug(tense2Slug);

  if (!tense1 || !tense2) return null;

  // Find comparison in tense1's comparisons
  const comparison = tense1.content.comparisons?.find(
    (c) => (c.tense1 === tense1Slug && c.tense2 === tense2Slug) || (c.tense1 === tense2Slug && c.tense2 === tense1Slug)
  );

  return {
    tense1,
    tense2,
    title: comparison?.title || `${tense1.title} vs ${tense2.title}`,
    description: comparison?.description,
  };
}

/**
 * Get comparison key for cache (used in KROKU 5)
 */
export function getComparisonCacheKey(tense1Slug: GrammarTenseSlug, tense2Slug: GrammarTenseSlug, version = "v1"): string {
  // Normalize order (alphabetically) for consistent cache keys
  const slugs = [tense1Slug, tense2Slug].sort();
  return `${slugs[0]}__${slugs[1]}__${version}`;
}
