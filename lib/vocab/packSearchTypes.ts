/**
 * One selectable lexicon sense in GET /api/vocab/search results.
 * Autocomplete lists one row per sense_id so the user picks a specific meaning.
 */
export type LexiconSearchRow = {
  sense_id: string;
  entry_id: string;
  lemma: string;
  pos: string;
  translation_pl: string | null;
  definition_en: string;
  /** First example for this sense when present in lexicon_examples; otherwise null. */
  example_en: string | null;
};
