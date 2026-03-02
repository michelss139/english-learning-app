/** Keys = lemma_norm (lowercase, trimmed, single spaces). */
export const WORD_SPECIFIC_TIPS: Record<string, string | string[]> = {
  "dressing table": "Vanity table działa w amerykańskim angielskim.",
  bookshelf: "To najczęściej regał na książki, stąd nazwa.",
  closet: [
    '"Garderoba" po angielsku może mieć kilka odpowiedników.',
    "Wardrobe to zwykle duża szafa (mebel).",
    "Closet to wnęka lub małe pomieszczenie na ubrania.",
    "Walk-in closet to większa garderoba, do której można wejść.",
    "W amerykańskim angielskim często używa się słowa closet w szerokim znaczeniu.",
  ],
};

export function lemmaNorm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export function getWordTip(lemma: string | null | undefined): string | string[] | null {
  if (!lemma) return null;
  const key = lemmaNorm(lemma);
  const tip = WORD_SPECIFIC_TIPS[key];
  return tip ?? null;
}
