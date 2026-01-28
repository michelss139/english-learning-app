import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { detectVerbForm, type VerbFormMatch } from "@/lib/vocab/verbFormDetector";

/** Response verb_form: base + forms; matched_* null when lookup is base lemma (e.g. "go"). */
export type LookupVerbForm = {
  base: { entry_id: string; lemma_norm: string; lemma: string };
  forms: { past_simple: string; past_participle: string };
  matched_form_type: VerbFormMatch["matched_form_type"] | null;
  matched_term: string | null;
};

function toLookupVerbForm(match: VerbFormMatch): LookupVerbForm {
  return {
    base: match.base,
    forms: match.forms,
    matched_form_type: match.matched_form_type,
    matched_term: match.matched_term,
  };
}

function buildBaseLemmaVerbForm(
  entry: { id: string; lemma: string },
  forms: { past_simple: string; past_participle: string }
): LookupVerbForm {
  return {
    base: {
      entry_id: entry.id,
      lemma_norm: normLemma(entry.lemma),
      lemma: entry.lemma,
    },
    forms,
    matched_form_type: null,
    matched_term: null,
  };
}

/**
 * POST /api/vocab/lookup-word
 * 
 * Lookup word in Lexicon cache + AI enrichment if not found.
 * This endpoint does NOT add words to user's vocabulary pool.
 * 
 * Flow:
 * 1. Check Lexicon cache (lexicon_entries)
 * 2. If found → return cached data
 * 3. If not found → AI enrichment (OpenAI) → save to Lexicon → return data
 * 
 * To add word to user's pool, use POST /api/vocab/add-word (select sense)
 */

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

function normLemma(lemma: string): string {
  return lemma.trim().toLowerCase();
}

/**
 * Helper to extract translation_pl from Supabase embed.
 * Handles both cases: object (1-1) or array (1-many).
 */
function pickTranslationPl(embed: any): string | null {
  if (!embed) return null;
  
  // If array, take first
  if (Array.isArray(embed)) {
    return embed[0]?.translation_pl || null;
  }
  
  // If object, use directly
  if (typeof embed === "object" && embed.translation_pl) {
    return embed.translation_pl;
  }
  
  return null;
}

/**
 * Helper to extract example_en from Supabase embed.
 * Handles both cases: object (1-1) or array (1-many).
 */
function pickExampleEn(embed: any): string | null {
  if (!embed) return null;
  
  // If array, take first
  if (Array.isArray(embed)) {
    return embed[0]?.example_en || null;
  }
  
  // If object, use directly
  if (typeof embed === "object" && embed.example_en) {
    return embed.example_en;
  }
  
  return null;
}

/**
 * Check if Polish translation matches the part of speech.
 * Returns true if matches, false if doesn't match.
 */
function translationMatchesPos(translation_pl: string, pos: string): boolean {
  if (!translation_pl || !pos) return false;
  
  const trimmed = translation_pl.trim().toLowerCase();
  
  // Polish verb infinitives typically end in: -ć, -ować, -ić, -yć, -eć, -ąć, -ść
  const verbEndings = ["ć", "ować", "ić", "yć", "eć", "ąć", "ść"];
  const isVerb = verbEndings.some((ending) => trimmed.endsWith(ending));
  
  // Polish nouns typically don't end in verb endings (but some exceptions exist)
  // We'll use a simple heuristic: if it ends in verb ending, it's likely a verb
  const isNoun = !isVerb && trimmed.length > 0;
  
  if (pos === "verb") {
    // For verb, translation should be a verb (infinitive)
    return isVerb;
  }
  
  if (pos === "noun") {
    // For noun, translation should NOT be a verb infinitive
    return !isVerb;
  }
  
  // For other POS (adjective, adverb, etc.), we can't easily validate
  // So we'll just check that it's not obviously wrong
  if (pos === "adjective") {
    // Adjectives often end in -y, -i, -a, -e, but this is not reliable
    // Just make sure it's not a verb
    return !isVerb;
  }
  
  // For other POS, accept it (we can't easily validate)
  return true;
}

/**
 * Validate translation_pl format.
 * Returns true if valid, false if invalid (descriptive/too long/etc).
 */
function isValidTranslationPl(translation_pl: string | null): boolean {
  if (!translation_pl || typeof translation_pl !== "string") return false;
  
  const trimmed = translation_pl.trim();
  
  // Check for __NEEDS_HUMAN__ marker
  if (trimmed === "__NEEDS_HUMAN__") return false;
  
  // Check length (max 40 chars)
  if (trimmed.length > 40) return false;
  
  // Check for period at end
  if (trimmed.endsWith(".")) return false;
  
  // Check for forbidden descriptive patterns
  const forbiddenPatterns = [
    /\bktóry\b/i,
    /\bktóra\b/i,
    /\bktóre\b/i,
    /\bużywane\b/i,
    /\bpomaga\b/i,
    /\bczęść\b.*\bktóra\b/i,
    /\bto\s+.*\bthat\b/i,
    /\bwhich\b/i,
    /\bthat\s+.*\bis\b/i,
  ];
  
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(trimmed)) return false;
  }
  
  return true;
}

/**
 * Normalize translation_pl for deduplication.
 * - trim, lowercase
 * - remove double spaces
 * - if contains ";", take first segment (trimmed)
 */
function normalizeTranslationPl(translation_pl: string | null): string {
  if (!translation_pl || typeof translation_pl !== "string") return "";
  
  let normalized = translation_pl.trim().toLowerCase();
  
  // If contains ";", take first segment
  if (normalized.includes(";")) {
    normalized = normalized.split(";")[0].trim();
  }
  
  // Remove double spaces
  normalized = normalized.replace(/\s+/g, " ");
  
  return normalized;
}

/**
 * Check if definition_en matches ellipsis/room sense pattern.
 * A) ELLIPSIS / ROOM-SENSE FILTER (DROPPED)
 * If definition_en contains room/place phrases AND bathroom-related tokens → DROPPED
 */
function isEllipsisRoomSense(definition_en: string): boolean {
  if (!definition_en || typeof definition_en !== "string") return false;
  
  const def = definition_en.toLowerCase();
  
  // Check for room/place phrases
  const roomPhrases = [
    "a room",
    "a place",
    "a building",
    "a room containing",
    "a room where",
  ];
  
  const hasRoomPhrase = roomPhrases.some((phrase) => def.includes(phrase));
  
  if (!hasRoomPhrase) return false;
  
  // Check for bathroom-related tokens
  const bathroomTokens = [
    "sink",
    "toilet",
    "shower",
    "bathroom",
    "restroom",
  ];
  
  return bathroomTokens.some((token) => def.includes(token));
}

/**
 * Check if definition_en matches usage-note pattern.
 * B) USAGE-NOTE / SUB-SENSE MERGE (MERGED INTO CORE)
 * If definition_en starts with or contains usage-note patterns → MERGED
 */
function isUsageNoteSense(definition_en: string): boolean {
  if (!definition_en || typeof definition_en !== "string") return false;
  
  const def = definition_en.toLowerCase().trim();
  
  const usagePatterns = [
    "used to describe",
    "used especially",
    "often used to",
    "typically used",
    "especially when",
    "in reference to",
  ];
  
  return usagePatterns.some((pattern) => def.startsWith(pattern) || def.includes(pattern));
}

/**
 * Type for sense data (works for both AI response and DB mapped senses)
 */
type SenseData = {
  id?: string; // Optional for AI response
  definition_en: string;
  domain?: string | null;
  sense_order: number;
  translation_pl: string | null;
  example_en: string | null;
  // For merge tracking: examples from merged senses
  mergedExamples?: string[];
};

/**
 * Apply quality filters and merges to senses.
 * 
 * A) DROPPED: ellipsis/room sense
 * B) MERGED: usage-note sense → absorbed into previous core sense
 * C) MERGED: pseudo-senses (same translation core) → combined
 * D) REINDEX: sense_order → 0..N-1 (no gaps)
 * E) LIMIT: max 6 senses for UI
 * 
 * Returns filtered and merged senses with reindexed sense_order.
 */
function applyFiltersAndMerges(
  senses: SenseData[],
  pos: string
): SenseData[] {
  if (!senses || senses.length === 0) return [];
  
  const MAX_SENSES_FOR_UI = 6;
  
  // Step 1: Filter out __NEEDS_HUMAN__ senses
  let validSenses = senses.filter((s) => s.translation_pl !== "__NEEDS_HUMAN__");
  
  if (validSenses.length === 0) return [];
  
  // Step 2: A) DROPPED - Remove ellipsis/room senses
  validSenses = validSenses.filter((s) => !isEllipsisRoomSense(s.definition_en));
  
  if (validSenses.length === 0) return [];
  
  // Step 3: B) MERGED - Merge usage-note senses into previous core sense
  const processedSenses: SenseData[] = [];
  const mergedExamplesMap = new Map<number, string[]>(); // Track examples to merge
  
  for (let i = 0; i < validSenses.length; i++) {
    const sense = validSenses[i];
    
    if (isUsageNoteSense(sense.definition_en)) {
      // Find previous core sense (first non-usage-note before this one)
      let targetIndex = -1;
      for (let j = processedSenses.length - 1; j >= 0; j--) {
        if (!isUsageNoteSense(processedSenses[j].definition_en)) {
          targetIndex = j;
          break;
        }
      }
      
      if (targetIndex >= 0) {
        // Merge: add example to target sense's merged examples
        if (sense.example_en) {
          if (!mergedExamplesMap.has(targetIndex)) {
            mergedExamplesMap.set(targetIndex, []);
          }
          mergedExamplesMap.get(targetIndex)!.push(sense.example_en);
        }
        // Skip this usage-note sense (don't add to processedSenses)
        continue;
      }
      // If no previous core sense found, keep it (edge case)
    }
    
    processedSenses.push(sense);
  }
  
  // Attach merged examples to target senses
  for (const [index, examples] of mergedExamplesMap.entries()) {
    if (processedSenses[index]) {
      processedSenses[index].mergedExamples = examples;
    }
  }
  
  // Step 4: C) MERGED - Merge pseudo-senses (same translation core)
  // Group by (pos, normalized_translation_pl)
  const groups = new Map<string, SenseData[]>();
  
  for (const sense of processedSenses) {
    const key_translation_core = normalizeTranslationPl(sense.translation_pl);
    const key = `${pos}::${key_translation_core}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(sense);
  }
  
  const merged: SenseData[] = [];
  
  for (const group of groups.values()) {
    if (group.length === 0) continue;
    
    if (group.length === 1) {
      merged.push(group[0]);
      continue;
    }
    
    // Multiple senses with same key_translation_core - merge them
    // Pick primary sense (prefer domain, then lowest sense_order)
    const domainSenses = group.filter((s) => s.domain != null);
    
    let primary: SenseData;
    if (domainSenses.length === 1) {
      primary = domainSenses[0];
    } else {
      primary = group.reduce((prev, curr) => 
        curr.sense_order < prev.sense_order ? curr : prev
      );
    }
    
    // Collect all examples (from primary + merged + other senses in group)
    const allExamples = new Set<string>();
    if (primary.example_en) allExamples.add(primary.example_en);
    if (primary.mergedExamples) {
      primary.mergedExamples.forEach((ex) => allExamples.add(ex));
    }
    
    // Add examples from other senses in group
    for (const sense of group) {
      if (sense !== primary) {
        if (sense.example_en) allExamples.add(sense.example_en);
        if (sense.mergedExamples) {
          sense.mergedExamples.forEach((ex) => allExamples.add(ex));
        }
      }
    }
    
    // Merge translation_pl: combine unique synonyms
    const allTranslations = new Set<string>();
    for (const sense of group) {
      if (sense.translation_pl && sense.translation_pl !== "__NEEDS_HUMAN__") {
        const parts = sense.translation_pl.split(";").map((p) => p.trim()).filter(Boolean);
        for (const part of parts) {
          allTranslations.add(part);
        }
      }
    }
    
    // Create merged sense
    const mergedSense: SenseData = {
      ...primary,
      translation_pl: Array.from(allTranslations).join("; ") || primary.translation_pl,
      mergedExamples: Array.from(allExamples), // All examples collected
    };
    
    merged.push(mergedSense);
  }
  
  // Step 5: Sort (domain == null first, then by sense_order)
  const sorted = merged.sort((a, b) => {
    if (a.domain === null && b.domain !== null) return -1;
    if (a.domain !== null && b.domain === null) return 1;
    return a.sense_order - b.sense_order;
  });
  
  // Step 6: E) LIMIT - Max 6 senses
  const limited = sorted.slice(0, MAX_SENSES_FOR_UI);
  
  // Step 7: D) REINDEX - sense_order → 0..N-1 (no gaps)
  return limited.map((sense, index) => ({
    ...sense,
    sense_order: index,
  }));
}

/**
 * Consolidate senses by deduplicating based on (pos, normalized_translation_pl).
 * Merges senses with same key_translation (combines synonyms in translation_pl).
 * Limits to MAX_SENSES_FOR_UI = 6.
 * 
 * DEPRECATED: Use applyFiltersAndMerges instead.
 * Kept for backward compatibility during transition.
 * 
 * Sense Quality Gate:
 * 1. Normalize: key_translation = first segment of translation_pl (split by ";"), lowercase, trim
 * 2. Deduplicate: group by (pos, key_translation), merge synonyms
 * 3. Limit: max 6 senses (prefer domain senses, then by sense_order)
 */
function consolidateSenses(
  senses: Array<{
    id: string;
    definition_en: string;
    domain: string | null;
    sense_order: number;
    translation_pl: string | null;
    example_en: string | null;
  }>,
  pos: string
): Array<{
  id: string;
  definition_en: string;
  domain: string | null;
  sense_order: number;
  translation_pl: string | null;
  example_en: string | null;
}> {
  if (!senses || senses.length === 0) return [];
  
  const MAX_SENSES_FOR_UI = 6;
  
  // Step 1: Filter out __NEEDS_HUMAN__ senses (exclude from auto-selection)
  const validSenses = senses.filter((s) => s.translation_pl !== "__NEEDS_HUMAN__");
  
  // Step 2: Normalize and group by (pos, key_translation_core)
  // key_translation_core = first segment of translation_pl (split by ";"), normalized
  const groups = new Map<string, typeof senses>();
  
  for (const sense of validSenses) {
    const key_translation_core = normalizeTranslationPl(sense.translation_pl);
    const key = `${pos}::${key_translation_core}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(sense);
  }
  
  // Step 3: For each group, merge senses (combine synonyms in translation_pl)
  const merged: typeof senses = [];
  
  for (const group of groups.values()) {
    if (group.length === 0) continue;
    
    if (group.length === 1) {
      // Single sense, keep it
      merged.push(group[0]);
      continue;
    }
    
    // Multiple senses with same key_translation_core - merge them (aggressive merge)
    // Pick primary sense (prefer domain, then lowest sense_order)
    const domainSenses = group.filter((s) => s.domain != null);
    
    let primary: typeof senses[0];
    if (domainSenses.length === 1) {
      primary = domainSenses[0];
    } else {
      primary = group.reduce((prev, curr) => 
        curr.sense_order < prev.sense_order ? curr : prev
      );
    }
    
    // Merge translation_pl: combine unique synonyms from all senses in group
    const allTranslations = new Set<string>();
    for (const sense of group) {
      if (sense.translation_pl && sense.translation_pl !== "__NEEDS_HUMAN__") {
        // Split by ";" and add each unique translation
        const parts = sense.translation_pl.split(";").map((p) => p.trim()).filter(Boolean);
        for (const part of parts) {
          allTranslations.add(part);
        }
      }
    }
    
    // Create merged sense
    const mergedSense: typeof senses[0] = {
      ...primary,
      translation_pl: Array.from(allTranslations).join("; ") || primary.translation_pl,
    };
    
    merged.push(mergedSense);
  }
  
  // Step 4: Sort and limit
  // Sort: domain == null first, then by sense_order
  const sorted = merged.sort((a, b) => {
    if (a.domain === null && b.domain !== null) return -1;
    if (a.domain !== null && b.domain === null) return 1;
    return a.sense_order - b.sense_order;
  });
  
  // Limit to MAX_SENSES_FOR_UI
  return sorted.slice(0, MAX_SENSES_FOR_UI);
}

type Body = {
  lemma: string; // e.g., "ball"
};

// New AI response format (word + senses with pos per sense)
type AILexiconResponseRaw = {
  word: string;
  senses: Array<{
    pos: string; // "noun", "verb", "adjective", "adverb", etc.
    translation_pl: string;
    definition_en: string;
    examples: string[]; // Array of example sentences
    verb_forms?: {
      present_simple_i: string;
      present_simple_you: string;
      present_simple_he_she_it: string;
      past_simple: string;
      past_participle: string;
    } | null;
  }>;
};

// Internal format (normalized, one entry per pos)
type AILexiconResponse = {
  lemma: string;
  pos: string; // "noun", "verb", "adjective", "adverb", etc.
  senses: Array<{
    definition_en: string;
    translation_pl: string;
    example_en: string;
    domain?: string | null; // optional: "business", "sports", etc.
  }>;
  verb_forms?: {
    present_simple_i: string;
    present_simple_you: string;
    present_simple_he_she_it: string;
    past_simple: string;
    past_participle: string;
  } | null;
};

async function openaiEnrichLexicon(lemma: string, retryOnInvalidTranslation = false): Promise<AILexiconResponse[]> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = "gpt-4o";

  const prompt = `You are a lexical data generator for a production English learning platform.
This is NOT a demo. Output must be predictable, didactic, and normalized.

Generate complete lexical data for the English word: "${lemma}"

OBJECTIVE:
For the word "${lemma}", you MUST return:
- ALL major parts of speech that exist for this word (verb, noun, adjective, adverb, etc.)
- For each part of speech: EXACTLY 1 core, distinct, didactic meaning (MAX 1 per POS)
- Meanings must be suitable for language learners, not dictionary paraphrases
- This must work globally for ALL words, not case-by-case

HARD RULES (MUST BE ENFORCED):

1. PARTS OF SPEECH:
   - You MUST include ALL major parts of speech that apply to this word
   - Do NOT omit a part of speech if it exists
   - If "work" is both verb and noun, return BOTH (but only 1 sense per POS)
   - If "light" is noun, verb, and adjective, return ALL THREE (but only 1 sense per POS)
   - MAXIMUM 1 sense per part of speech - if a word has multiple meanings as a verb, pick the MOST COMMON, MOST IMPORTANT one

2. MEANINGS:
   - Return ONLY the MOST IMPORTANT, MOST COMMON meaning for each part of speech
   - Do NOT return synonyms or near-synonyms as separate senses
   - Do NOT return multiple senses for the same part of speech
   - If "work" as verb can mean "pracować" and "działać" (synonyms), return ONLY "pracować" (more common)
   - Each meaning must be something a learner would consciously learn as a separate concept
   - Do NOT split the same meaning into multiple senses. If two meanings overlap semantically, merge them

3. FORBIDDEN PATTERNS (DO NOT RETURN):
   - Usage notes: "used to describe...", "often used when...", "typically used...", "especially when...", "in reference to..."
   - Definitional descriptions instead of meanings: "a way of...", "the act of...", "something that..."
   - Room/place senses: "a room with...", "a place containing...", "a building where..." (e.g., "a room with a sink" for "bath")
   - Metonymy duplicates: if "wing" means the same Polish word for bird and plane, it's ONE sense
   - Contextual variants: if the Polish translation is the same, it's ONE sense

4. SEMANTIC DISTINCTION:
- A separate sense exists ONLY when the learner would need a DIFFERENT Polish headword to translate it
- Different senses must correspond to different Polish headwords (semantically distinct concepts)
   - Example: "serve" = "służyć" (work for) vs "serve" = "serwować" (give food) = TWO senses (different Polish words)
   - Example: "wing" = "skrzydło" (bird) vs "wing" = "skrzydło" (plane) = ONE sense (same Polish word)

STRUCTURE REQUIREMENTS:

Output MUST be valid JSON in this exact format:
{
  "word": "${lemma}",
  "senses": [
    {
      "pos": "verb",
      "translation_pl": "serwować",
      "definition_en": "to give food or drink to someone",
      "examples": ["They serve dinner at 6 p.m."]
    },
    {
      "pos": "verb",
      "translation_pl": "służyć",
      "definition_en": "to be useful or helpful for a purpose",
      "examples": ["This tool serves a different purpose."]
    },
    {
      "pos": "noun",
      "translation_pl": "serwis",
      "definition_en": "the act of serving in sports",
      "examples": ["He has a powerful serve."]
    }
  ]
}

TRANSLATION RULES (CRITICAL - PART OF SPEECH MATCHING):
- translation_pl MUST match the part of speech (pos) of the English word
- translation_pl MUST be 1-3 words, a headword, NOT a definition
- MAXIMUM 40 characters
- NO period at the end
- NO commas (use semicolon ";" to separate synonyms ONLY if same core meaning)

PART OF SPEECH MATCHING (CRITICAL):
- If pos = "verb": translation_pl MUST be a Polish verb (infinitive ending in -ć, -ować, -ić, -yć, -eć)
  - CORRECT: "pracować", "działać", "służyć", "serwować", "obudzić"
  - INCORRECT: "praca" (noun), "dzieło" (noun), "pracujący" (adjective)
- If pos = "noun": translation_pl MUST be a Polish noun (NOT a verb infinitive)
  - CORRECT: "praca", "dzieło", "serwis", "skrzydło"
  - INCORRECT: "pracować" (verb), "działać" (verb)
- If pos = "adjective": translation_pl MUST be a Polish adjective
  - CORRECT: "lekki", "ciężki", "jasny"
  - INCORRECT: "lekko" (adverb), "lekkość" (noun)

FORBIDDEN:
- Descriptive sentences, explanations, phrases like "który/która/które", "używane do", "pomaga", "część, która", "to ... that ...", "which"
- Translations that don't match the part of speech (e.g., verb with noun translation, noun with verb translation)

CORRECT examples:
- verb: "pracować", "służyć", "serwować", "obudzić"
- noun: "praca", "serwis", "skrzydło", "piłka; kula"
- adjective: "lekki", "ciężki"

INCORRECT examples:
- "używane do opisywania gdy ktoś..." (descriptive)
- "oznacza, że ktoś jest..." (descriptive)
- verb with "praca" (noun) - WRONG POS
- noun with "pracować" (verb) - WRONG POS

If you cannot provide a short lexical equivalent that matches the part of speech, return exactly: "__NEEDS_HUMAN__"

EXAMPLES RULES:
- Provide 1 example per sense (in "examples" array)
- Example must clearly match the meaning
- No placeholders. No generic sentences
- Natural, A2/B1 level, 8-16 words, must include the exact word "${lemma}"

VERB FORMS (if sense is verb):
- Include verb_forms object with: present_simple_i, present_simple_you, present_simple_he_she_it, past_simple, past_participle
- Add verb_forms to each verb sense, not at top level

FINAL CHECK:
Before returning, verify:
✓ Does this include ALL major parts of speech for the word?
✓ Is there EXACTLY 1 sense per part of speech (not more)?
✓ Does each translation_pl match its part of speech (verb → verb, noun → noun)?
✓ Are there NO synonyms as separate senses (e.g., "pracować" and "działać" for same verb)?
✓ Are there NO usage-notes, NO room-senses, NO paraphrases?
✓ Is each translation_pl a short headword (1-3 words)?

If ANY answer is NO, the response is invalid. Fix it.

Generate the lexical data with Polish translations for ALL senses and ALL parts of speech:`;

  // If retry, add specific instruction about translation format
  const retryPrompt = retryOnInvalidTranslation 
    ? `\n\nIMPORTANT: Your previous Polish translation was descriptive. Return a SHORT dictionary headword or lexical equivalent only (1-3 words, max 40 chars). Do NOT use descriptive sentences, explanations, or phrases like "który/która/które", "używane do", "pomaga", "część, która".`
    : "";

  const finalPrompt = prompt + retryPrompt;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3, // Lower temperature for more consistent lexical data
      messages: [
        {
          role: "system",
          content: `You are a lexical data generator for a production English learning platform. You output strictly valid JSON and nothing else.

CRITICAL RULES (MUST FOLLOW):
1. Return ALL major parts of speech for the word (verb, noun, adjective, etc.)
2. Return EXACTLY 1 sense per part of speech (the most common, most important meaning)
3. Translation MUST match part of speech:
   - If pos="verb": translation_pl MUST be a Polish verb infinitive (ends in -ć, -ować, -ić, -yć, -eć)
   - If pos="noun": translation_pl MUST be a Polish noun (NOT a verb infinitive)
   - If pos="adjective": translation_pl MUST be a Polish adjective (NOT a verb infinitive)
4. Do NOT return synonyms as separate senses (e.g., "pracować" and "działać" for same verb = WRONG)
5. Do NOT return usage notes, room senses, or paraphrases

EXAMPLES OF CORRECT:
- "work" verb → "pracować" (verb infinitive) ✓
- "work" noun → "praca" (noun) ✓

EXAMPLES OF WRONG:
- "work" verb → "praca" (noun) ✗ WRONG POS
- "work" noun → "pracować" (verb) ✗ WRONG POS
- "work" verb → "pracować" AND "działać" (synonyms) ✗ DUPLICATE`,
        },
        {
          role: "user",
          content: finalPrompt.trim(),
        },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${text}`);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`OpenAI response not JSON: ${text}`);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned empty content.");
  }

  // Remove markdown code blocks if present (gpt-4o sometimes wraps JSON in ```json ... ```)
  let cleanedContent = content.trim();
  if (cleanedContent.startsWith("```json")) {
    cleanedContent = cleanedContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanedContent.startsWith("```")) {
    cleanedContent = cleanedContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  cleanedContent = cleanedContent.trim();

  let parsedRaw: AILexiconResponseRaw;
  try {
    parsedRaw = JSON.parse(cleanedContent);
  } catch (e) {
    throw new Error(`Model did not return valid JSON: ${cleanedContent.substring(0, 200)}`);
  }

  // Validation
  if (!parsedRaw.word || !Array.isArray(parsedRaw.senses) || parsedRaw.senses.length === 0) {
    throw new Error("Invalid AI response: missing word or senses");
  }

  // Validate that each sense has required fields and filter invalid ones
  const invalidTranslations: Array<{ senseIndex: number; pos: string; reason: string }> = [];
  const seenPos = new Set<string>(); // Track which POS we've already seen (max 1 per POS)
  
  for (let i = 0; i < parsedRaw.senses.length; i++) {
    const sense = parsedRaw.senses[i];
    if (!sense.pos || typeof sense.pos !== "string") {
      throw new Error(`Invalid AI response: sense ${i} missing pos`);
    }
    if (!sense.translation_pl || typeof sense.translation_pl !== "string" || !sense.translation_pl.trim()) {
      throw new Error(`Invalid AI response: sense ${i} missing translation_pl`);
    }
    
    // Check if translation format is valid FIRST (before POS checks)
    if (!isValidTranslationPl(sense.translation_pl)) {
      invalidTranslations.push({ senseIndex: i, pos: sense.pos, reason: "invalid_format" });
      continue;
    }
    
    // Check if translation matches part of speech SECOND (critical validation)
    if (!translationMatchesPos(sense.translation_pl, sense.pos)) {
      invalidTranslations.push({ 
        senseIndex: i, 
        pos: sense.pos, 
        reason: `pos_mismatch: translation "${sense.translation_pl}" does not match pos "${sense.pos}" (e.g., verb with noun translation or vice versa)` 
      });
      continue;
    }
    
    // Check if this is a duplicate POS (more than 1 sense per POS) - keep only first
    // This check comes AFTER pos_mismatch, so we filter wrong POS first
    if (seenPos.has(sense.pos)) {
      invalidTranslations.push({ 
        senseIndex: i, 
        pos: sense.pos, 
        reason: `duplicate_pos: already have a sense for pos "${sense.pos}", max 1 allowed` 
      });
      continue;
    }
    
    // Mark this POS as seen
    seenPos.add(sense.pos);
    
    if (!sense.definition_en || typeof sense.definition_en !== "string" || !sense.definition_en.trim()) {
      throw new Error(`Invalid AI response: sense ${i} missing definition_en`);
    }
    if (!Array.isArray(sense.examples) || sense.examples.length === 0) {
      throw new Error(`Invalid AI response: sense ${i} missing examples array`);
    }
    // Validate verb_forms if pos is verb
    if (sense.pos === "verb" && !sense.verb_forms) {
      throw new Error(`Invalid AI response: sense ${i} is verb but missing verb_forms`);
    }
  }
  
  // Filter out invalid senses
  if (invalidTranslations.length > 0) {
    const validIndices = new Set(
      Array.from({ length: parsedRaw.senses.length }, (_, i) => i)
        .filter((i) => !invalidTranslations.some((inv) => inv.senseIndex === i))
    );
    
    parsedRaw.senses = parsedRaw.senses.filter((_, i) => validIndices.has(i));
    
    console.warn(`[lookup-word] Filtered ${invalidTranslations.length} invalid senses:`, 
      invalidTranslations.map((inv) => `sense ${inv.senseIndex} (${inv.pos}): ${inv.reason}`)
    );
  }

  // If we filtered out too many senses or have no valid senses, retry
  if (parsedRaw.senses.length === 0 && !retryOnInvalidTranslation) {
    console.warn(`[lookup-word] No valid senses after filtering, retrying...`);
    return openaiEnrichLexicon(lemma, true);
  }
  
  if (parsedRaw.senses.length === 0) {
    throw new Error("No valid senses after filtering invalid translations");
  }

  // Convert to internal format: group senses by pos, create one AILexiconResponse per pos
  const responsesByPos = new Map<string, AILexiconResponse>();

  for (const sense of parsedRaw.senses) {
    if (!responsesByPos.has(sense.pos)) {
      responsesByPos.set(sense.pos, {
        lemma: parsedRaw.word,
        pos: sense.pos,
        senses: [],
        verb_forms: sense.pos === "verb" && sense.verb_forms ? sense.verb_forms : undefined,
      });
    }

    const response = responsesByPos.get(sense.pos)!;
    
    // Use first example as primary example_en
    const primaryExample = sense.examples[0] || "";
    if (!primaryExample.trim()) {
      throw new Error(`Invalid AI response: sense with pos ${sense.pos} has empty examples`);
    }

    response.senses.push({
      definition_en: sense.definition_en,
      translation_pl: sense.translation_pl,
      example_en: primaryExample,
      domain: null, // Domain not in new format, can be added later if needed
    });

    // Store additional examples in mergedExamples for later (will be handled in saveToLexicon)
    // For now, we only use the first example as example_en
  }

  // Return array of responses (one per pos)
  return Array.from(responsesByPos.values());
}

async function saveToLexicon(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  dataArray: AILexiconResponse[]
): Promise<Array<{ entry_id: string; sense_ids: string[]; pos: string }>> {
  const results: Array<{ entry_id: string; sense_ids: string[]; pos: string }> = [];

  for (const data of dataArray) {
  const lemma_norm = normLemma(data.lemma);

    // Apply filters and merges BEFORE saving to DB (clean cache)
    // Convert AI response senses to SenseData format
    const aiSenses: SenseData[] = data.senses.map((s, idx) => ({
      definition_en: s.definition_en,
      domain: s.domain || null,
      sense_order: idx,
      translation_pl: s.translation_pl,
      example_en: s.example_en,
    }));

    // Apply quality filters and merges
    const filteredSenses = applyFiltersAndMerges(aiSenses, data.pos);

    // 1. Upsert lexicon_entries (with lemma_norm + pos as unique key)
    // Check if entry exists first (for lemma_norm + pos combination)
    const { data: existingEntry } = await supabase
    .from("lexicon_entries")
      .select("id")
      .eq("lemma_norm", lemma_norm)
      .eq("pos", data.pos)
      .maybeSingle();

    let entry_id: string;

    if (existingEntry) {
      // Update existing entry
      entry_id = existingEntry.id;
      const { error: updateErr } = await supabase
        .from("lexicon_entries")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", entry_id);

      if (updateErr) {
        throw new Error(`Failed to update lexicon entry: ${updateErr.message}`);
      }
    } else {
      // Insert new entry
      const { data: newEntry, error: insertErr } = await supabase
        .from("lexicon_entries")
        .insert({
        lemma: data.lemma,
        lemma_norm,
        pos: data.pos,
        updated_at: new Date().toISOString(),
        })
    .select("id")
    .single();

      if (insertErr) {
        throw new Error(`Failed to save lexicon entry: ${insertErr.message}`);
  }

      entry_id = newEntry.id;
    }

  // 2. Delete existing senses (if re-enriching) and recreate
  await supabase.from("lexicon_senses").delete().eq("entry_id", entry_id);

    const sense_ids = await saveSensesToDb(supabase, entry_id, filteredSenses, data.verb_forms);
    results.push({ entry_id, sense_ids, pos: data.pos });
  }

  return results;
}

/**
 * Helper function to save senses, translations, examples, and verb forms to DB
 */
async function saveSensesToDb(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  entry_id: string,
  filteredSenses: SenseData[],
  verb_forms?: AILexiconResponse["verb_forms"]
): Promise<string[]> {
  const sense_ids: string[] = [];

  // Insert filtered and merged senses, translations, examples
  for (let i = 0; i < filteredSenses.length; i++) {
    const sense = filteredSenses[i];

    // Insert sense (with reindexed sense_order)
    const { data: senseData, error: senseErr } = await supabase
      .from("lexicon_senses")
      .insert({
        entry_id,
        definition_en: sense.definition_en,
        domain: sense.domain || null,
        sense_order: sense.sense_order, // Already reindexed (0..N-1)
      })
      .select("id")
      .single();

    if (senseErr) {
      throw new Error(`Failed to save sense ${i}: ${senseErr.message}`);
    }

    const sense_id = senseData.id;
    sense_ids.push(sense_id);

    // Insert translation
    const { error: transErr } = await supabase.from("lexicon_translations").insert({
      sense_id,
      translation_pl: sense.translation_pl || "",
    });

    if (transErr) {
      throw new Error(`Failed to save translation for sense ${i}: ${transErr.message}`);
    }

    // Insert examples: primary example + merged examples (max 10 total)
    const allExamples: string[] = [];
    if (sense.example_en) {
      allExamples.push(sense.example_en);
    }
    if (sense.mergedExamples) {
      allExamples.push(...sense.mergedExamples);
    }

    // Limit to max 10 examples per sense
    const examplesToSave = allExamples.slice(0, 10);

    for (const example of examplesToSave) {
      const exampleHash = Buffer.from(example).toString("base64").slice(0, 64);

    const { error: exampleErr } = await supabase.from("lexicon_examples").insert({
      sense_id,
        example_en: example,
      source: "ai",
      example_hash: exampleHash,
    });

    if (exampleErr) {
      // Ignore duplicate hash errors (example already exists)
      if (!String(exampleErr.message).toLowerCase().includes("unique")) {
        throw new Error(`Failed to save example for sense ${i}: ${exampleErr.message}`);
        }
      }
    }
  }

  // Insert verb_forms if verb
  if (verb_forms) {
    await supabase.from("lexicon_verb_forms").delete().eq("entry_id", entry_id);

    const { error: verbErr } = await supabase.from("lexicon_verb_forms").insert({
      entry_id,
      present_simple_i: verb_forms.present_simple_i,
      present_simple_you: verb_forms.present_simple_you,
      present_simple_he_she_it: verb_forms.present_simple_he_she_it,
      past_simple: verb_forms.past_simple,
      past_participle: verb_forms.past_participle,
    });

    if (verbErr) {
      throw new Error(`Failed to save verb forms: ${verbErr.message}`);
    }
  }

  return sense_ids;
}

export async function POST(req: Request) {
  try {
    // Auth: verify JWT token
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const lemma = (body?.lemma ?? "").toString().trim();

    if (!lemma) {
      return NextResponse.json({ error: "lemma is required" }, { status: 400 });
    }

    const lemma_norm = normLemma(lemma);

    // Check if input is a verb form (before checking cache)
    let verb_form: VerbFormMatch | null = null;
    try {
      verb_form = await detectVerbForm(lemma, supabase);
      if (verb_form) {
        console.log(`[lookup-word] Detected verb form: "${lemma}" -> base: "${verb_form.base.lemma_norm}", type: ${verb_form.matched_form_type}`);
        // Use base lemma for lookup instead of the form
        const baseLemmaNorm = verb_form.base.lemma_norm;
        // Override lemma_norm to lookup base entry
        // We'll lookup the base entry and attach verb_form to response
      }
    } catch (e) {
      console.error("[lookup-word] Error detecting verb form:", e);
      // Continue with normal lookup if detection fails
    }

    // Check Lexicon cache first (may have multiple entries for different POS)
    // Use base lemma if verb form was detected, otherwise use original lemma
    const lookupLemma = verb_form ? verb_form.base.lemma_norm : lemma_norm;
    const { data: existingEntries, error: checkErr } = await supabase
      .from("lexicon_entries")
      .select("id, lemma, pos")
      .eq("lemma_norm", lookupLemma);

    if (checkErr) {
      return NextResponse.json({ error: `Failed to check cache: ${checkErr.message}` }, { status: 500 });
    }

    if (existingEntries && existingEntries.length > 0) {
      // Fetch all senses for all entries (multiple POS support)
      const entryIds = existingEntries.map((e) => e.id);
      const { data: allSenses, error: sensesErr } = await supabase
        .from("lexicon_senses")
        .select(
          `
          id,
          definition_en,
          domain,
          sense_order,
          entry_id,
          lexicon_translations(translation_pl),
          lexicon_examples(example_en, source)
        `
        )
        .in("entry_id", entryIds)
        .order("sense_order", { ascending: true });

      if (sensesErr) {
        return NextResponse.json({ error: `Failed to fetch senses: ${sensesErr.message}` }, { status: 500 });
      }

      // Create a map of entry_id -> entry (for pos lookup)
      const entryMap = new Map(existingEntries.map((e) => [e.id, e]));

      // Check if any sense is missing translation_pl - if so, re-enrich
      const missingTranslations = (allSenses || []).some(
        (s: any) => !pickTranslationPl(s.lexicon_translations)
      );

      // Check if we have only one POS but the word might have multiple
      // This is a heuristic to detect old cache entries that might be missing POS
      // Common words that often have multiple POS: work, light, break, change, turn, etc.
      // TODO: Consider adding a `force_reload` parameter to API for explicit re-enrichment
      const commonMultiPosWords = ["work", "light", "break", "change", "turn", "run", "set", "get", "take", "serve", "wake"];
      const hasOnlyOnePos = existingEntries.length === 1;
      const mightHaveMultiplePos = commonMultiPosWords.includes(lemma_norm);

      // Re-enrich if: missing translations OR (only one POS AND might have multiple)
      // This ensures we get all POS for words that can have multiple
      if (missingTranslations || (hasOnlyOnePos && mightHaveMultiplePos)) {
        // Re-enrich to add missing translations
        const aiDataArray = await openaiEnrichLexicon(lemma);
        await saveToLexicon(supabase, aiDataArray);

        // Fetch all refreshed entries and senses
        const { data: refreshedEntries } = await supabase
          .from("lexicon_entries")
          .select("id, lemma, pos")
          .eq("lemma_norm", lemma_norm);

        if (!refreshedEntries || refreshedEntries.length === 0) {
          return NextResponse.json({ error: "Failed to fetch refreshed entries" }, { status: 500 });
        }

        const refreshedEntryIds = refreshedEntries.map((e) => e.id);
        const { data: refreshedSenses, error: refreshedErr } = await supabase
          .from("lexicon_senses")
          .select(
            `
            id,
            definition_en,
            domain,
            sense_order,
            entry_id,
            lexicon_translations(translation_pl),
            lexicon_examples(example_en, source)
          `
          )
          .in("entry_id", refreshedEntryIds)
          .order("sense_order", { ascending: true });

        if (refreshedErr) {
          return NextResponse.json({ error: `Failed to fetch refreshed senses: ${refreshedErr.message}` }, { status: 500 });
        }

        // Group senses by entry_id and process
        const refreshedEntryMap = new Map(refreshedEntries.map((e) => [e.id, e]));
        const allProcessedSenses: Array<{ pos: string; senses: any[]; verb_forms: any }> = [];

        for (const entry of refreshedEntries) {
          const entrySenses = (refreshedSenses || []).filter((s: any) => s.entry_id === entry.id);
          const mappedSenses: SenseData[] = entrySenses.map((s: any) => ({
            id: s.id,
            definition_en: s.definition_en,
            domain: s.domain,
            sense_order: s.sense_order,
            translation_pl: pickTranslationPl(s.lexicon_translations),
            example_en: pickExampleEn(s.lexicon_examples),
          }));

          const consolidatedSenses = applyFiltersAndMerges(mappedSenses, entry.pos);

        let verb_forms = null;
          if (entry.pos === "verb") {
          const { data: vf } = await supabase
            .from("lexicon_verb_forms")
            .select("*")
              .eq("entry_id", entry.id)
            .maybeSingle();
            if (vf) verb_forms = vf;
          }

        allProcessedSenses.push({ pos: entry.pos, senses: consolidatedSenses, verb_forms });
      }

      // Merge all senses from all POS together
      const allMergedSenses: any[] = [];
      let mergedVerbForms = null;

      for (const processed of allProcessedSenses) {
        // Add senses with pos information (for UI to group by POS if needed)
        allMergedSenses.push(...processed.senses.map((s: any) => ({ ...s, pos: processed.pos })));
        // Keep verb_forms from verb entry
        if (processed.pos === "verb" && processed.verb_forms) {
          mergedVerbForms = processed.verb_forms;
        }
      }

      // Sort by pos (verb first, then noun, etc.) and then by sense_order
      const posOrder = ["verb", "noun", "adjective", "adverb", "preposition", "conjunction", "pronoun", "determiner"];
      allMergedSenses.sort((a, b) => {
        const posA = posOrder.indexOf(a.pos) !== -1 ? posOrder.indexOf(a.pos) : 999;
        const posB = posOrder.indexOf(b.pos) !== -1 ? posOrder.indexOf(b.pos) : 999;
        if (posA !== posB) return posA - posB;
        return a.sense_order - b.sense_order;
      });

      const firstEntry = refreshedEntries[0];
        const verbEntry = refreshedEntries.find((e: { pos: string }) => e.pos === "verb");

        let responseVerbForm: LookupVerbForm | undefined;
        if (verbEntry && mergedVerbForms) {
          responseVerbForm = buildBaseLemmaVerbForm(verbEntry, {
            past_simple: mergedVerbForms.past_simple ?? "",
            past_participle: mergedVerbForms.past_participle ?? "",
          });
        }

        return NextResponse.json({
          ok: true,
          cached: false,
          entry: {
            id: firstEntry.id,
            lemma: firstEntry.lemma,
            pos: firstEntry.pos,
            senses: allMergedSenses,
            verb_forms: mergedVerbForms,
          },
          ...(responseVerbForm && { verb_form: responseVerbForm }),
        });
      }

      // Process all cached entries
      const allProcessedSenses: Array<{ pos: string; senses: any[]; verb_forms: any }> = [];

      for (const entry of existingEntries) {
        const entrySenses = (allSenses || []).filter((s: any) => s.entry_id === entry.id);
        const mappedSenses: SenseData[] = entrySenses.map((s: any) => ({
          id: s.id,
          definition_en: s.definition_en,
          domain: s.domain,
          sense_order: s.sense_order,
          translation_pl: pickTranslationPl(s.lexicon_translations),
          example_en: pickExampleEn(s.lexicon_examples),
        }));

        const consolidatedSenses = applyFiltersAndMerges(mappedSenses, entry.pos);

      let verb_forms = null;
        if (entry.pos === "verb") {
        const { data: vf, error: vfErr } = await supabase
          .from("lexicon_verb_forms")
          .select("*")
            .eq("entry_id", entry.id)
          .maybeSingle();
          if (!vfErr && vf) verb_forms = vf;
        }

        allProcessedSenses.push({ pos: entry.pos, senses: consolidatedSenses, verb_forms });
      }

      // Merge all senses from all POS together
      const allMergedSenses: any[] = [];
      let mergedVerbForms = null;

      for (const processed of allProcessedSenses) {
        // Add senses with pos information (for UI to group by POS if needed)
        allMergedSenses.push(...processed.senses.map((s: any) => ({ ...s, pos: processed.pos })));
        // Keep verb_forms from verb entry
        if (processed.pos === "verb" && processed.verb_forms) {
          mergedVerbForms = processed.verb_forms;
        }
      }

      // Sort by pos (verb first, then noun, etc.) and then by sense_order
      const posOrder = ["verb", "noun", "adjective", "adverb", "preposition", "conjunction", "pronoun", "determiner"];
      allMergedSenses.sort((a, b) => {
        const posA = posOrder.indexOf(a.pos) !== -1 ? posOrder.indexOf(a.pos) : 999;
        const posB = posOrder.indexOf(b.pos) !== -1 ? posOrder.indexOf(b.pos) : 999;
        if (posA !== posB) return posA - posB;
        return a.sense_order - b.sense_order;
      });

      const firstEntry = existingEntries[0];

      // verb_form only when entry is verb; from detector (form lookup) or base-lemma (e.g. "go")
      let responseVerbForm: LookupVerbForm | undefined;
      if (firstEntry.pos === "verb") {
        if (verb_form) {
          responseVerbForm = toLookupVerbForm(verb_form);
        } else if (mergedVerbForms) {
          responseVerbForm = buildBaseLemmaVerbForm(firstEntry, {
            past_simple: mergedVerbForms.past_simple ?? "",
            past_participle: mergedVerbForms.past_participle ?? "",
          });
        }
      }

      return NextResponse.json({
        ok: true,
        cached: true,
        entry: {
          id: firstEntry.id,
          lemma: firstEntry.lemma,
          pos: firstEntry.pos,
          senses: allMergedSenses,
          verb_forms: mergedVerbForms,
        },
        ...(responseVerbForm && { verb_form: responseVerbForm }),
      });
    }

    // Not in cache - AI enrichment (SYNCHRONOUS, USER WAITS)
    const aiDataArray = await openaiEnrichLexicon(lemma);

    // Save to Lexicon (all POS entries)
    const saveResults = await saveToLexicon(supabase, aiDataArray);

    if (saveResults.length === 0) {
      return NextResponse.json({ error: "Failed to save any entries" }, { status: 500 });
    }

    // Fetch all saved entries and senses
    const savedEntryIds = saveResults.map((r) => r.entry_id);
    const { data: savedEntries, error: savedErr } = await supabase
      .from("lexicon_entries")
      .select("id, lemma, pos")
      .in("id", savedEntryIds);

    if (savedErr || !savedEntries || savedEntries.length === 0) {
      return NextResponse.json({ error: `Failed to fetch saved entries: ${savedErr?.message}` }, { status: 500 });
    }

    const { data: savedSenses, error: savedSensesErr } = await supabase
      .from("lexicon_senses")
      .select(
        `
        id,
        definition_en,
        domain,
        sense_order,
        entry_id,
        lexicon_translations(translation_pl),
        lexicon_examples(example_en, source)
      `
      )
      .in("entry_id", savedEntryIds)
      .order("sense_order", { ascending: true });

    if (savedSensesErr) {
      return NextResponse.json({ error: `Failed to fetch saved senses: ${savedSensesErr.message}` }, { status: 500 });
    }

    // Process all saved entries
    const allProcessedSenses: Array<{ pos: string; senses: any[]; verb_forms: any }> = [];

    for (const entry of savedEntries) {
      const entrySenses = (savedSenses || []).filter((s: any) => s.entry_id === entry.id);
      const mappedSenses: SenseData[] = entrySenses.map((s: any) => ({
        id: s.id,
        definition_en: s.definition_en,
        domain: s.domain,
        sense_order: s.sense_order,
        translation_pl: pickTranslationPl(s.lexicon_translations),
        example_en: pickExampleEn(s.lexicon_examples),
      }));

      const consolidatedSenses = applyFiltersAndMerges(mappedSenses, entry.pos);

    let verb_forms = null;
      if (entry.pos === "verb") {
      const { data: vf, error: vfErr } = await supabase
        .from("lexicon_verb_forms")
        .select("*")
          .eq("entry_id", entry.id)
        .maybeSingle();
        if (!vfErr && vf) verb_forms = vf;
      }

      allProcessedSenses.push({ pos: entry.pos, senses: consolidatedSenses, verb_forms });
    }

    // Merge all senses from all POS together
    const allMergedSenses: any[] = [];
    let mergedVerbForms = null;

    for (const processed of allProcessedSenses) {
      // Add senses with pos information (for UI to group by POS if needed)
      allMergedSenses.push(...processed.senses.map((s: any) => ({ ...s, pos: processed.pos })));
      // Keep verb_forms from verb entry
      if (processed.pos === "verb" && processed.verb_forms) {
        mergedVerbForms = processed.verb_forms;
      }
    }

    // Sort by pos (verb first, then noun, etc.) and then by sense_order
    const posOrder = ["verb", "noun", "adjective", "adverb", "preposition", "conjunction", "pronoun", "determiner"];
    allMergedSenses.sort((a, b) => {
      const posA = posOrder.indexOf(a.pos) !== -1 ? posOrder.indexOf(a.pos) : 999;
      const posB = posOrder.indexOf(b.pos) !== -1 ? posOrder.indexOf(b.pos) : 999;
      if (posA !== posB) return posA - posB;
      return a.sense_order - b.sense_order;
    });

    const firstEntry = savedEntries[0];
    const verbEntryFromSaved = savedEntries.find((e: { pos: string }) => e.pos === "verb");

    let responseVerbForm: LookupVerbForm | undefined;
    if (verb_form) {
      responseVerbForm = toLookupVerbForm(verb_form);
    } else if (verbEntryFromSaved && mergedVerbForms) {
      responseVerbForm = buildBaseLemmaVerbForm(verbEntryFromSaved, {
        past_simple: mergedVerbForms.past_simple ?? "",
        past_participle: mergedVerbForms.past_participle ?? "",
      });
    }

    return NextResponse.json({
      ok: true,
      cached: false,
      entry: {
        id: firstEntry.id,
        lemma: firstEntry.lemma,
        pos: firstEntry.pos,
        senses: allMergedSenses,
        verb_forms: mergedVerbForms,
      },
      ...(responseVerbForm && { verb_form: responseVerbForm }),
    });
  } catch (e: any) {
    console.error("[add-word] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
