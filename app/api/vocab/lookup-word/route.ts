import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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

async function openaiEnrichLexicon(lemma: string, retryOnInvalidTranslation = false): Promise<AILexiconResponse> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = "gpt-4o";

  const prompt = `You are a lexical data generator for an English learning platform.

Generate complete lexical data for the English word: "${lemma}"

CRITICAL SEMANTIC RULES:
- A separate sense exists ONLY when the learner would need a DIFFERENT Polish headword to translate it
- DO NOT create separate senses for different contexts if the Polish translation is the same headword
- Different senses must correspond to different Polish headwords (semantically distinct concepts)
- Metonymy (e.g., "wing of bird" vs "wing of plane", "hover = float" vs "hover = circle") = ONE SENSE, same Polish headword
- Only create separate senses when concepts are semantically different (e.g., "serve = work for" vs "serve = hit ball in sport")

CRITICAL REQUIREMENTS:
- Return MAXIMUM 8 senses (hard cap - do not exceed)
- Return COARSE-GRAINED, pedagogically distinct meanings only
- DO NOT return fine-grained dictionary variations or micro-differences
- For high-polysemy words (run, get, set, take):
  * Return 5-8 MOST IMPORTANT, MOST COMMON meanings (A2-B2 level)
  * DO NOT include idioms or phrasal verbs as separate senses
  * Focus on core meanings that learners need to distinguish
- For EACH sense you MUST provide:
  * English definition (definition_en)
  * Polish translation (translation_pl) - THIS IS MANDATORY, NEVER OMIT
  * One natural example sentence (example_en)
- Part of speech (pos): one of: "noun", "verb", "adjective", "adverb", "preposition", "conjunction", "pronoun", "determiner"
- If verb: include all verb forms (present simple I/you/he-she-it, past simple, past participle)
- Examples: natural, A2/B1 level, 8-16 words, must include the exact word "${lemma}"
- Domain (optional): only if the sense is domain-specific (e.g., "business", "sports", "academic")

TRANSLATION_PL FORMAT (CRITICAL):
- translation_pl MUST be a SHORT dictionary headword or lexical equivalent (1-3 words max)
- MAXIMUM 40 characters
- NO period at the end
- NO commas (use semicolon ";" to separate synonyms ONLY if same core meaning)
- FORBIDDEN: descriptive sentences, explanations, phrases like "który/która/które", "używane do", "pomaga", "część, która", "to ... that ...", "which"
- Examples of CORRECT: "skrzydło", "unosić się", "służyć", "piłka; kula"
- Examples of FORBIDDEN: "podobna część w samolocie, która pomaga mu latać", "używane do latania", "część, która..."
- If you cannot provide a short lexical equivalent, return exactly: "__NEEDS_HUMAN__"

TRANSLATION RULES:
- translation_pl may contain multiple synonyms separated by ";" ONLY if they share the same core meaning (e.g., "hover": "unosić się; krążyć" - OK, same core)
- DO NOT combine different core meanings in one translation (e.g., "serve": "służyć; serwować" - FORBIDDEN, these are different meanings)
- Each distinct core meaning must be a separate sense

Output STRICT JSON only:
{
  "lemma": "${lemma}",
  "pos": "noun",
  "senses": [
    {
      "definition_en": "English definition of sense 1",
      "translation_pl": "skrzydło",
      "example_en": "Natural example sentence with ${lemma}.",
      "domain": null
    }
  ],
  "verb_forms": {
    "present_simple_i": "work",
    "present_simple_you": "work",
    "present_simple_he_she_it": "works",
    "past_simple": "worked",
    "past_participle": "worked"
  }
}

If the word is NOT a verb, omit "verb_forms" or set it to null.
If the word has multiple parts of speech, choose the PRIMARY/MOST COMMON one for "pos".
MAXIMUM 8 senses. Coarse-grained, pedagogically distinct meanings only.
Translations must be short lexical equivalents, never descriptive explanations.

Generate the lexical data with Polish translations for ALL senses:`;

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
          content: "You output strictly valid JSON and nothing else. Always return all senses/meanings of the word.",
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

  let parsed: AILexiconResponse;
  try {
    parsed = JSON.parse(cleanedContent);
  } catch (e) {
    throw new Error(`Model did not return valid JSON: ${cleanedContent.substring(0, 200)}`);
  }

  // Validation
  if (!parsed.lemma || !parsed.pos || !Array.isArray(parsed.senses) || parsed.senses.length === 0) {
    throw new Error("Invalid AI response: missing lemma, pos, or senses");
  }

  // Validate that each sense has translation_pl and check format
  const invalidTranslations: number[] = [];
  for (let i = 0; i < parsed.senses.length; i++) {
    const sense = parsed.senses[i];
    if (!sense.translation_pl || typeof sense.translation_pl !== "string" || !sense.translation_pl.trim()) {
      throw new Error(`Invalid AI response: sense ${i} missing translation_pl`);
    }
    if (!isValidTranslationPl(sense.translation_pl)) {
      invalidTranslations.push(i);
    }
    if (!sense.definition_en || typeof sense.definition_en !== "string" || !sense.definition_en.trim()) {
      throw new Error(`Invalid AI response: sense ${i} missing definition_en`);
    }
    if (!sense.example_en || typeof sense.example_en !== "string" || !sense.example_en.trim()) {
      throw new Error(`Invalid AI response: sense ${i} missing example_en`);
    }
  }

  // If invalid translations found and not retrying, retry once
  if (invalidTranslations.length > 0 && !retryOnInvalidTranslation) {
    return openaiEnrichLexicon(lemma, true);
  }

  // If still invalid after retry, set to __NEEDS_HUMAN__
  if (invalidTranslations.length > 0) {
    for (const idx of invalidTranslations) {
      parsed.senses[idx].translation_pl = "__NEEDS_HUMAN__";
    }
  }

  // Validate verb_forms if pos is verb
  if (parsed.pos === "verb" && !parsed.verb_forms) {
    throw new Error("Invalid AI response: verb_forms required for verbs");
  }

  return parsed;
}

async function saveToLexicon(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  data: AILexiconResponse
): Promise<{ entry_id: string; sense_ids: string[] }> {
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

  // 1. Upsert lexicon_entries
  const { data: entry, error: entryErr } = await supabase
    .from("lexicon_entries")
    .upsert(
      {
        lemma: data.lemma,
        lemma_norm,
        pos: data.pos,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lemma_norm", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (entryErr) {
    throw new Error(`Failed to save lexicon entry: ${entryErr.message}`);
  }

  const entry_id = entry.id;

  // 2. Delete existing senses (if re-enriching) and recreate
  // This ensures we have the latest AI data
  await supabase.from("lexicon_senses").delete().eq("entry_id", entry_id);

  const sense_ids: string[] = [];

  // 3. Insert filtered and merged senses, translations, examples
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

  // 4. Insert verb_forms if verb
  if (data.pos === "verb" && data.verb_forms) {
    await supabase.from("lexicon_verb_forms").delete().eq("entry_id", entry_id);

    const { error: verbErr } = await supabase.from("lexicon_verb_forms").insert({
      entry_id,
      present_simple_i: data.verb_forms.present_simple_i,
      present_simple_you: data.verb_forms.present_simple_you,
      present_simple_he_she_it: data.verb_forms.present_simple_he_she_it,
      past_simple: data.verb_forms.past_simple,
      past_participle: data.verb_forms.past_participle,
    });

    if (verbErr) {
      throw new Error(`Failed to save verb forms: ${verbErr.message}`);
    }
  }

  return { entry_id, sense_ids };
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

    // Check Lexicon cache first
    const { data: existingEntry, error: checkErr } = await supabase
      .from("lexicon_entries")
      .select("id, lemma, pos")
      .eq("lemma_norm", lemma_norm)
      .maybeSingle();

    if (checkErr) {
      return NextResponse.json({ error: `Failed to check cache: ${checkErr.message}` }, { status: 500 });
    }

    if (existingEntry) {
      // Fetch all senses with translations and examples
      const { data: senses, error: sensesErr } = await supabase
        .from("lexicon_senses")
        .select(
          `
          id,
          definition_en,
          domain,
          sense_order,
          lexicon_translations(translation_pl),
          lexicon_examples(example_en, source)
        `
        )
        .eq("entry_id", existingEntry.id)
        .order("sense_order", { ascending: true });

      if (sensesErr) {
        return NextResponse.json({ error: `Failed to fetch senses: ${sensesErr.message}` }, { status: 500 });
      }

      // Check if any sense is missing translation_pl - if so, re-enrich
      const missingTranslations = (senses || []).some(
        (s: any) => !pickTranslationPl(s.lexicon_translations)
      );

      if (missingTranslations) {
        // Re-enrich to add missing translations
        const aiData = await openaiEnrichLexicon(lemma);
        const { entry_id, sense_ids } = await saveToLexicon(supabase, aiData);

        // Fetch refreshed data
        const { data: refreshedSenses, error: refreshedErr } = await supabase
          .from("lexicon_senses")
          .select(
            `
            id,
            definition_en,
            domain,
            sense_order,
            lexicon_translations(translation_pl),
            lexicon_examples(example_en, source)
          `
          )
          .eq("entry_id", entry_id)
          .order("sense_order", { ascending: true });

        if (refreshedErr) {
          return NextResponse.json({ error: `Failed to fetch refreshed senses: ${refreshedErr.message}` }, { status: 500 });
        }

        const { data: refreshedEntry } = await supabase
          .from("lexicon_entries")
          .select("id, lemma, pos")
          .eq("id", entry_id)
          .single();

        let verb_forms = null;
        if (refreshedEntry?.pos === "verb") {
          const { data: vf } = await supabase
            .from("lexicon_verb_forms")
            .select("*")
            .eq("entry_id", entry_id)
            .maybeSingle();

          if (vf) {
            verb_forms = vf;
          }
        }

        // Map and apply filters/merges (in-memory, for old records compatibility)
        const mappedRefreshedSenses: SenseData[] = (refreshedSenses || []).map((s: any) => ({
          id: s.id,
          definition_en: s.definition_en,
          domain: s.domain,
          sense_order: s.sense_order,
          translation_pl: pickTranslationPl(s.lexicon_translations),
          example_en: pickExampleEn(s.lexicon_examples),
        }));
        
        const consolidatedRefreshedSenses = applyFiltersAndMerges(
          mappedRefreshedSenses,
          refreshedEntry?.pos || existingEntry.pos
        );

        return NextResponse.json({
          ok: true,
          cached: false, // Was re-enriched
          entry: {
            id: refreshedEntry?.id || existingEntry.id,
            lemma: refreshedEntry?.lemma || existingEntry.lemma,
            pos: refreshedEntry?.pos || existingEntry.pos,
            senses: consolidatedRefreshedSenses,
            verb_forms,
          },
        });
      }

      // Fetch verb_forms if verb
      let verb_forms = null;
      if (existingEntry.pos === "verb") {
        const { data: vf, error: vfErr } = await supabase
          .from("lexicon_verb_forms")
          .select("*")
          .eq("entry_id", existingEntry.id)
          .maybeSingle();

        if (!vfErr && vf) {
          verb_forms = vf;
        }
      }

      // Map and apply filters/merges (in-memory, for old records compatibility)
      // NOTE: This filters in-memory only, does NOT delete data from DB
      // Old records may still have ellipsis/usage-note senses, but they won't appear in UI
      const mappedSenses: SenseData[] = (senses || []).map((s: any) => ({
        id: s.id,
        definition_en: s.definition_en,
        domain: s.domain,
        sense_order: s.sense_order,
        translation_pl: pickTranslationPl(s.lexicon_translations),
        example_en: pickExampleEn(s.lexicon_examples),
      }));
      
      const consolidatedSenses = applyFiltersAndMerges(mappedSenses, existingEntry.pos);

      return NextResponse.json({
        ok: true,
        cached: true,
        entry: {
          id: existingEntry.id,
          lemma: existingEntry.lemma,
          pos: existingEntry.pos,
          senses: consolidatedSenses,
          verb_forms,
        },
      });
    }

    // Not in cache - AI enrichment (SYNCHRONOUS, USER WAITS)
    const aiData = await openaiEnrichLexicon(lemma);

    // Save to Lexicon
    const { entry_id, sense_ids } = await saveToLexicon(supabase, aiData);

    // Fetch saved data to return
    const { data: savedEntry, error: savedErr } = await supabase
      .from("lexicon_entries")
      .select("id, lemma, pos")
      .eq("id", entry_id)
      .single();

    if (savedErr) {
      return NextResponse.json({ error: `Failed to fetch saved entry: ${savedErr.message}` }, { status: 500 });
    }

    const { data: savedSenses, error: savedSensesErr } = await supabase
      .from("lexicon_senses")
      .select(
        `
        id,
        definition_en,
        domain,
        sense_order,
        lexicon_translations(translation_pl),
        lexicon_examples(example_en, source)
      `
      )
      .eq("entry_id", entry_id)
      .order("sense_order", { ascending: true });

    if (savedSensesErr) {
      return NextResponse.json({ error: `Failed to fetch saved senses: ${savedSensesErr.message}` }, { status: 500 });
    }

    let verb_forms = null;
    if (savedEntry.pos === "verb") {
      const { data: vf, error: vfErr } = await supabase
        .from("lexicon_verb_forms")
        .select("*")
        .eq("entry_id", entry_id)
        .maybeSingle();

      if (!vfErr && vf) {
        verb_forms = vf;
      }
    }

    // Map and apply filters/merges (in-memory, for consistency)
    // NOTE: Data was already filtered before save, but we apply filters here too
    // for consistency and to handle any edge cases
    const mappedSavedSenses: SenseData[] = (savedSenses || []).map((s: any) => ({
      id: s.id,
      definition_en: s.definition_en,
      domain: s.domain,
      sense_order: s.sense_order,
      translation_pl: pickTranslationPl(s.lexicon_translations),
      example_en: pickExampleEn(s.lexicon_examples),
    }));
    
    const consolidatedSavedSenses = applyFiltersAndMerges(mappedSavedSenses, savedEntry.pos);

    return NextResponse.json({
      ok: true,
      cached: false,
      entry: {
        id: savedEntry.id,
        lemma: savedEntry.lemma,
        pos: savedEntry.pos,
        senses: consolidatedSavedSenses,
        verb_forms,
      },
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
