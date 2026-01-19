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
  // Join with lexicon_entries to get base lemma
  const { data: verbForms, error } = await supabase
    .from("lexicon_verb_forms")
    .select(`
      present_simple_i,
      present_simple_you,
      present_simple_he_she_it,
      past_simple,
      past_participle,
      lexicon_entries(lemma, lemma_norm, pos)
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
    // Extract entry data (Supabase returns nested object or array)
    const entry = Array.isArray(form.lexicon_entries) ? form.lexicon_entries[0] : form.lexicon_entries;
    if (!entry) {
      console.log("[resolveVerbForm] Form missing entry:", form);
      continue;
    }

    // Get base lemma from lexicon_entries (use lemma or lemma_norm, they should be the same)
    const baseLemmaRaw = entry.lemma || entry.lemma_norm;
    if (!baseLemmaRaw) {
      console.log("[resolveVerbForm] Form missing lemma/lemma_norm:", entry);
      continue;
    }

    // Normalize base lemma (lowercase, trim)
    const baseLemmaNorm = baseLemmaRaw.toLowerCase().trim();
    
    // Skip if baseLemma is null, empty, or equals the term (not a form, it's the base)
    if (!baseLemmaNorm || baseLemmaNorm === termLower) {
      console.log(`[resolveVerbForm] Skipping: baseLemma "${baseLemmaNorm}" equals term "${termLower}"`);
      continue;
    }

    // Check POS - only process verbs
    if (entry.pos !== 'verb') {
      console.log(`[resolveVerbForm] Skipping: pos is "${entry.pos}", not "verb"`);
      continue;
    }

    // Only return past_simple and past_participle (ignore present forms)
    if (form.past_simple?.toLowerCase().trim() === termLower) {
      console.log(`[resolveVerbForm] Found: "${termLower}" -> base: "${baseLemmaNorm}", form: past_simple`);
      return { baseLemma: baseLemmaNorm, formType: 'past_simple' };
    }
    if (form.past_participle?.toLowerCase().trim() === termLower) {
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
