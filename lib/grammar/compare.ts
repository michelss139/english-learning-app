/**
 * Grammar comparison utilities
 */

import { GrammarTenseSlug, GrammarTense } from "./types";
import { getGrammarTenseBySlug } from "./content";

export type ComparisonData = {
  tense1: GrammarTense;
  tense2: GrammarTense;
  title: string;
  description?: string;
};

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
