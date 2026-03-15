/**
 * Tips shown when user gives a specific wrong answer.
 * Keys: expected lemma (correct answer) -> given answer -> tip text
 */
export const WRONG_ANSWER_TIPS: Record<string, Record<string, string | string[]>> = {
  customer: {
    client:
      "W sklepie mówimy customer. Client używa się głównie przy usługach (np. prawnik, konsultant).",
  },
  checkout: {
    "cash register":
      "W sklepie cash register to urządzenie do liczenia pieniędzy. Checkout to miejsce lub moment płacenia za zakupy.",
  },
};

/** Keys = lemma_norm (lowercase, trimmed, single spaces). */
export const WORD_SPECIFIC_TIPS: Record<string, string | string[]> = {
  customer:
    "W sklepie mówimy customer. Client używa się głównie przy usługach (np. prawnik, konsultant).",
  checkout:
    "W sklepie cash register to urządzenie do liczenia pieniędzy. Checkout to miejsce lub moment płacenia za zakupy.",
  cart:
    "W amerykańskim angielskim w sklepie mówi się shopping cart. W brytyjskim angielskim często używa się shopping trolley.",
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

export function getWordTip(
  lemma: string | null | undefined,
  givenAnswer?: string | null
): string | string[] | null {
  if (!lemma) return null;
  const key = lemmaNorm(lemma);
  const givenNorm = givenAnswer ? lemmaNorm(givenAnswer) : "";

  // Najpierw sprawdź tip dla konkretnej błędnej odpowiedzi
  if (givenNorm) {
    const wrongTips = WRONG_ANSWER_TIPS[key];
    const wrongTip = wrongTips?.[givenNorm];
    if (wrongTip) return wrongTip;
  }

  const tip = WORD_SPECIFIC_TIPS[key];
  return tip ?? null;
}
