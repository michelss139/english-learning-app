/**
 * Helper to resolve verb forms (e.g., "went" -> "go" + "past_simple")
 * 
 * Checks lexicon_verb_forms table to find if a term is a verb form
 * and returns the base lemma and form type.
 */

export type VerbFormType = 'present_I' | 'present_you' | 'present_he_she_it' | 'past_simple' | 'past_participle';

export type VerbFormResult = {
  baseLemma: string;
  formType: VerbFormType;
};

/**
 * Resolves a term to its verb form information
 * @param term_en - The term to check (e.g., "went", "gone", "goes")
 * @param supabase - Supabase client instance
 * @returns VerbFormResult if found, null otherwise
 */
export async function resolveVerbForm(
  term_en: string,
  supabase: any
): Promise<VerbFormResult | null> {
  if (!term_en || !supabase) return null;

  const termLower = term_en.trim().toLowerCase();
  if (!termLower) return null;

  // Query lexicon_verb_forms to find exact match (case-insensitive)
  // We need to check all form fields, so we query all and filter in code
  const { data: verbForms, error } = await supabase
    .from("lexicon_verb_forms")
    .select(`
      present_simple_i,
      present_simple_you,
      present_simple_he_she_it,
      past_simple,
      past_participle,
      lexicon_entries(lemma_norm)
    `);

  if (error || !verbForms || verbForms.length === 0) {
    return null;
  }

  // Find exact match (case-insensitive)
  for (const form of verbForms) {
    const entry = Array.isArray(form.lexicon_entries) ? form.lexicon_entries[0] : form.lexicon_entries;
    if (!entry?.lemma_norm) continue;

    const baseLemma = entry.lemma_norm;

    // Check each form field for exact match (case-insensitive)
    if (form.present_simple_i?.toLowerCase() === termLower) {
      return { baseLemma, formType: 'present_I' };
    }
    if (form.present_simple_you?.toLowerCase() === termLower) {
      return { baseLemma, formType: 'present_you' };
    }
    if (form.present_simple_he_she_it?.toLowerCase() === termLower) {
      return { baseLemma, formType: 'present_he_she_it' };
    }
    if (form.past_simple?.toLowerCase() === termLower) {
      return { baseLemma, formType: 'past_simple' };
    }
    if (form.past_participle?.toLowerCase() === termLower) {
      return { baseLemma, formType: 'past_participle' };
    }
  }

  return null;
}

/**
 * Get display label for verb form type
 */
export function getVerbFormLabel(formType: VerbFormType): string {
  const labels: Record<VerbFormType, string> = {
    present_I: 'Present simple (I)',
    present_you: 'Present simple (you)',
    present_he_she_it: 'Present simple (he/she/it)',
    past_simple: 'Past simple',
    past_participle: 'Past participle',
  };
  return labels[formType];
}
