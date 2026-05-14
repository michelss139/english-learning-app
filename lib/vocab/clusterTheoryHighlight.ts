/**
 * Klucze słów w teorii dla typowych błędów (kolokacje) — cytaty „…” + bold w ClusterClient.
 * Clustery spoza mapy dostają teorię bez automatycznego wyróżniania czasowników.
 */
const VOCAB_CLUSTER_THEORY_FOCUS_LEMMAS: Record<string, readonly string[]> = {
  "make-do": ["make", "do"],
  "bring-take": ["bring", "take"],
  "hear-listen": ["hear", "listen"],
  "say-tell": ["say", "tell"],
  "get-take": ["get", "take"],
  "say-tell-speak-talk": ["say", "tell", "speak", "talk"],
  "lend-borrow-rent-hire": ["lend", "borrow", "rent", "hire"],
  "make-do-take-get": ["make", "do", "take", "get"],
};

function escapeLemmaForAlternation(lemma: string): string {
  return lemma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getVocabClusterTheoryHighlightRegex(slug: string): RegExp | null {
  const lemmas = VOCAB_CLUSTER_THEORY_FOCUS_LEMMAS[slug];
  if (!lemmas?.length) return null;
  const inner = lemmas.map(escapeLemmaForAlternation).join("|");
  return new RegExp(`\\b(${inner})\\b`, "gi");
}

/** Tylko make-do — drugi akapit czasem zaczyna się od „make i do bardzo…” */
export function applyMakeDoTheoryLeadCapitalize(line: string, slug: string): string {
  if (slug !== "make-do") return line;
  return line.replace(/^(\s*)make i do bardzo często/gi, "$1Make i do bardzo często");
}
