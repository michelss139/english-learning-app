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

  if (error) {
    console.error("[resolveVerbForm] Query error:", error);
    return null;
  }

  if (!verbForms || verbForms.length === 0) {
    console.log("[resolveVerbForm] No verb forms found in DB");
    return null;
  }

  // Find exact match (case-insensitive)
  for (const form of verbForms) {
    const entry = Array.isArray(form.lexicon_entries) ? form.lexicon_entries[0] : form.lexicon_entries;
    if (!entry?.lemma_norm) {
      console.log("[resolveVerbForm] Form missing entry or lemma_norm:", form);
      continue;
    }

    const baseLemma = entry.lemma_norm.toLowerCase();
    const baseLemmaNorm = baseLemma.trim();

    // Skip if baseLemma is null, empty, or equals the term (not a form, it's the base)
    if (!baseLemmaNorm || baseLemmaNorm === termLower) {
      continue;
    }

    // Only return past_simple and past_participle (ignore present forms)
    if (form.past_simple?.toLowerCase() === termLower) {
      console.log(`[resolveVerbForm] Found: "${termLower}" -> base: "${baseLemmaNorm}", form: past_simple`);
      return { baseLemma: baseLemmaNorm, formType: 'past_simple' };
    }
    if (form.past_participle?.toLowerCase() === termLower) {
      console.log(`[resolveVerbForm] Found: "${termLower}" -> base: "${baseLemmaNorm}", form: past_participle`);
      return { baseLemma: baseLemmaNorm, formType: 'past_participle' };
    }
    // Present forms are detected but not returned (for internal use only)
  }

  console.log(`[resolveVerbForm] No match found for: "${termLower}"`);
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

/**
 * Check if verb form badge should be shown in UI
 * Only show for verbs with past_simple or past_participle forms
 */
export function shouldShowVerbFormBadge(pos: string | null, verbForm: VerbFormResult | null): boolean {
  if (!verbForm || pos !== 'verb') {
    return false;
  }
  return verbForm.formType === 'past_simple' || verbForm.formType === 'past_participle';
}
