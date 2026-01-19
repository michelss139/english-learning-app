/**
 * Helper to detect verb forms in lookup-word endpoint
 * Detects irregular and regular verb forms and resolves to base lemma
 */

export type VerbFormMatch = {
  base: {
    entry_id: string;
    lemma_norm: string;
  };
  forms: {
    past_simple: string;
    past_participle: string;
  };
  matched_form_type: 'past_simple' | 'past_participle' | 'present_I' | 'present_you' | 'present_he_she_it';
  matched_term: string;
};

/**
 * Detect if term is a verb form (irregular or regular)
 * @param term - The term to check (e.g., "went", "gone", "worked")
 * @param supabase - Supabase admin client
 * @returns VerbFormMatch if found, null otherwise
 */
export async function detectVerbForm(
  term: string,
  supabase: any
): Promise<VerbFormMatch | null> {
  if (!term || !supabase) return null;

  const termNorm = term.trim().toLowerCase();
  if (!termNorm) return null;

  // 1. Check irregular forms in lexicon_verb_forms
  const { data: verbForms, error } = await supabase
    .from("lexicon_verb_forms")
    .select(`
      entry_id,
      present_simple_i,
      present_simple_you,
      present_simple_he_she_it,
      past_simple,
      past_participle,
      lexicon_entries(lemma, lemma_norm, pos)
    `);

  if (error) {
    console.error("[detectVerbForm] Query error:", error);
    return null;
  }

  if (verbForms && verbForms.length > 0) {
    for (const form of verbForms) {
      const entry = Array.isArray(form.lexicon_entries) ? form.lexicon_entries[0] : form.lexicon_entries;
      if (!entry || entry.pos !== 'verb') continue;

      const baseLemmaNorm = (entry.lemma || entry.lemma_norm || '').toLowerCase().trim();
      if (!baseLemmaNorm || baseLemmaNorm === termNorm) continue;

      // Check past forms first (priority)
      if (form.past_simple?.toLowerCase().trim() === termNorm) {
        return {
          base: {
            entry_id: form.entry_id,
            lemma_norm: baseLemmaNorm,
          },
          forms: {
            past_simple: form.past_simple,
            past_participle: form.past_participle,
          },
          matched_form_type: 'past_simple',
          matched_term: term,
        };
      }
      
      if (form.past_participle?.toLowerCase().trim() === termNorm) {
        return {
          base: {
            entry_id: form.entry_id,
            lemma_norm: baseLemmaNorm,
          },
          forms: {
            past_simple: form.past_simple,
            past_participle: form.past_participle,
          },
          matched_form_type: 'past_participle',
          matched_term: term,
        };
      }

      // Check present forms (for completeness, but UI will filter these)
      if (form.present_simple_i?.toLowerCase().trim() === termNorm) {
        return {
          base: {
            entry_id: form.entry_id,
            lemma_norm: baseLemmaNorm,
          },
          forms: {
            past_simple: form.past_simple,
            past_participle: form.past_participle,
          },
          matched_form_type: 'present_I',
          matched_term: term,
        };
      }

      if (form.present_simple_you?.toLowerCase().trim() === termNorm) {
        return {
          base: {
            entry_id: form.entry_id,
            lemma_norm: baseLemmaNorm,
          },
          forms: {
            past_simple: form.past_simple,
            past_participle: form.past_participle,
          },
          matched_form_type: 'present_you',
          matched_term: term,
        };
      }

      if (form.present_simple_he_she_it?.toLowerCase().trim() === termNorm) {
        return {
          base: {
            entry_id: form.entry_id,
            lemma_norm: baseLemmaNorm,
          },
          forms: {
            past_simple: form.past_simple,
            past_participle: form.past_participle,
          },
          matched_form_type: 'present_he_she_it',
          matched_term: term,
        };
      }
    }
  }

  // 2. Heuristic for regular -ed forms (past simple / past participle)
  // Try removing -ed, -d, or -ied to find base verb
  // ONLY if the base exists in lexicon_entries with pos='verb'
  const edEndings = ['ied', 'ed', 'd'];
  for (const ending of edEndings) {
    if (termNorm.endsWith(ending) && termNorm.length > ending.length + 2) {
      let baseCandidate = termNorm.slice(0, -ending.length);
      
      // Special handling for -ied (e.g., "studied" -> "study")
      if (ending === 'ied' && baseCandidate.length > 0 && baseCandidate.endsWith('i')) {
        // Try baseCandidate + 'y' (e.g., "studied" -> "study")
        const yBase = baseCandidate.slice(0, -1) + 'y';
        const verbEntry = await checkBaseVerbExists(supabase, yBase);
        if (verbEntry) {
          const verbForms = await getVerbFormsForEntry(supabase, verbEntry.id);
          if (verbForms) {
            const pastPartNorm = verbForms.past_participle?.toLowerCase().trim();
            const pastSimpleNorm = verbForms.past_simple?.toLowerCase().trim();
            
            if (pastPartNorm === termNorm) {
              return {
                base: {
                  entry_id: verbEntry.id,
                  lemma_norm: verbEntry.lemma_norm,
                },
                forms: {
                  past_simple: verbForms.past_simple || term,
                  past_participle: verbForms.past_participle || term,
                },
                matched_form_type: 'past_participle',
                matched_term: term,
              };
            }
            
            if (pastSimpleNorm === termNorm) {
              return {
                base: {
                  entry_id: verbEntry.id,
                  lemma_norm: verbEntry.lemma_norm,
                },
                forms: {
                  past_simple: verbForms.past_simple || term,
                  past_participle: verbForms.past_participle || term,
                },
                matched_form_type: 'past_simple',
                matched_term: term,
              };
            }
          }
        }
      }
      
      // Try baseCandidate as-is (e.g., "worked" -> "work")
      // ONLY proceed if base exists as verb in lexicon
      const verbEntry = await checkBaseVerbExists(supabase, baseCandidate);
      if (verbEntry) {
        // Base exists as verb, check if term matches its forms
        const verbForms = await getVerbFormsForEntry(supabase, verbEntry.id);
        if (verbForms) {
          const pastPartNorm = verbForms.past_participle?.toLowerCase().trim();
          const pastSimpleNorm = verbForms.past_simple?.toLowerCase().trim();
          
          // Only return if it's an exact match (not just heuristic match)
          if (pastPartNorm === termNorm) {
            return {
              base: {
                entry_id: verbEntry.id,
                lemma_norm: verbEntry.lemma_norm,
              },
              forms: {
                past_simple: verbForms.past_simple || term,
                past_participle: verbForms.past_participle || term,
              },
              matched_form_type: 'past_participle',
              matched_term: term,
            };
          }
          
          if (pastSimpleNorm === termNorm) {
            return {
              base: {
                entry_id: verbEntry.id,
                lemma_norm: verbEntry.lemma_norm,
              },
              forms: {
                past_simple: verbForms.past_simple || term,
                past_participle: verbForms.past_participle || term,
              },
              matched_form_type: 'past_simple',
              matched_term: term,
            };
          }
        } else {
          // No verb_forms entry, but base exists as verb
          // This could be a regular verb - check if term looks like -ed form
          // But only if base is not equal to term (avoid "do" -> "do")
          if (baseCandidate !== termNorm && baseCandidate.length >= 2) {
            // For regular verbs, past forms often equal base + ed
            // But we want to be conservative - only return if we're confident
            // Skip this heuristic to avoid false positives (e.g., "red" is not a verb form)
          }
        }
      }
      // If base doesn't exist as verb, skip (e.g., "red" is not "re" + "d")
    }
  }

  return null;
}

/**
 * Check if base verb exists in lexicon_entries with pos='verb'
 */
async function checkBaseVerbExists(supabase: any, baseCandidate: string): Promise<{ id: string; lemma_norm: string } | null> {
  if (!baseCandidate || baseCandidate.length < 2) return null;

  const { data: entry, error } = await supabase
    .from("lexicon_entries")
    .select("id, lemma_norm")
    .eq("lemma_norm", baseCandidate)
    .eq("pos", "verb")
    .maybeSingle();

  if (error || !entry) return null;
  return entry;
}

/**
 * Get verb forms for an entry
 */
async function getVerbFormsForEntry(supabase: any, entryId: string): Promise<{ past_simple: string; past_participle: string } | null> {
  const { data: form, error } = await supabase
    .from("lexicon_verb_forms")
    .select("past_simple, past_participle")
    .eq("entry_id", entryId)
    .maybeSingle();

  if (error || !form) return null;
  return form;
}
