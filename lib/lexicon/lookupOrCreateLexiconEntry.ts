import { createSupabaseAdmin } from "@/lib/supabase/admin";

export function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

export function normLemma(lemma: string): string {
  return lemma.trim().toLowerCase();
}

export function pickTranslationPl(embed: any): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return embed[0]?.translation_pl || null;
  }
  if (typeof embed === "object" && embed.translation_pl) {
    return embed.translation_pl;
  }
  return null;
}

export function pickExampleEn(embed: any): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return embed[0]?.example_en || null;
  }
  if (typeof embed === "object" && embed.example_en) {
    return embed.example_en;
  }
  return null;
}

function translationMatchesPos(translation_pl: string, pos: string): boolean {
  if (!translation_pl || !pos) return false;

  const trimmed = translation_pl.trim().toLowerCase();
  const verbEndings = ["ć", "ować", "ić", "yć", "eć", "ąć", "ść"];
  const isVerb = verbEndings.some((ending) => trimmed.endsWith(ending));

  if (pos === "verb") return isVerb;
  if (pos === "noun") return !isVerb;
  if (pos === "adjective") return !isVerb;
  return true;
}

function isValidTranslationPl(translation_pl: string | null): boolean {
  if (!translation_pl || typeof translation_pl !== "string") return false;

  const trimmed = translation_pl.trim();
  if (trimmed === "__NEEDS_HUMAN__") return false;
  if (trimmed.length > 40) return false;
  if (trimmed.endsWith(".")) return false;

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

function normalizeTranslationPl(translation_pl: string | null): string {
  if (!translation_pl || typeof translation_pl !== "string") return "";

  let normalized = translation_pl.trim().toLowerCase();
  if (normalized.includes(";")) {
    normalized = normalized.split(";")[0].trim();
  }
  return normalized.replace(/\s+/g, " ");
}

function isEllipsisRoomSense(definition_en: string): boolean {
  if (!definition_en || typeof definition_en !== "string") return false;

  const def = definition_en.toLowerCase();
  const roomPhrases = ["a room", "a place", "a building", "a room containing", "a room where"];
  const hasRoomPhrase = roomPhrases.some((phrase) => def.includes(phrase));
  if (!hasRoomPhrase) return false;

  const bathroomTokens = ["sink", "toilet", "shower", "bathroom", "restroom"];
  return bathroomTokens.some((token) => def.includes(token));
}

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

export type SenseData = {
  id?: string;
  definition_en: string;
  domain?: string | null;
  sense_order: number;
  translation_pl: string | null;
  example_en: string | null;
  mergedExamples?: string[];
};

export function applyFiltersAndMerges(senses: SenseData[], pos: string): SenseData[] {
  if (!senses || senses.length === 0) return [];

  const MAX_SENSES_FOR_UI = 6;
  let validSenses = senses.filter((s) => s.translation_pl !== "__NEEDS_HUMAN__");
  if (validSenses.length === 0) return [];

  validSenses = validSenses.filter((s) => !isEllipsisRoomSense(s.definition_en));
  if (validSenses.length === 0) return [];

  const processedSenses: SenseData[] = [];
  const mergedExamplesMap = new Map<number, string[]>();

  for (let i = 0; i < validSenses.length; i++) {
    const sense = validSenses[i];

    if (isUsageNoteSense(sense.definition_en)) {
      let targetIndex = -1;
      for (let j = processedSenses.length - 1; j >= 0; j--) {
        if (!isUsageNoteSense(processedSenses[j].definition_en)) {
          targetIndex = j;
          break;
        }
      }

      if (targetIndex >= 0) {
        if (sense.example_en) {
          if (!mergedExamplesMap.has(targetIndex)) {
            mergedExamplesMap.set(targetIndex, []);
          }
          mergedExamplesMap.get(targetIndex)!.push(sense.example_en);
        }
        continue;
      }
    }

    processedSenses.push(sense);
  }

  for (const [index, examples] of mergedExamplesMap.entries()) {
    if (processedSenses[index]) {
      processedSenses[index].mergedExamples = examples;
    }
  }

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

    const domainSenses = group.filter((s) => s.domain != null);
    const primary =
      domainSenses.length === 1
        ? domainSenses[0]
        : group.reduce((prev, curr) => (curr.sense_order < prev.sense_order ? curr : prev));

    const allExamples = new Set<string>();
    if (primary.example_en) allExamples.add(primary.example_en);
    if (primary.mergedExamples) {
      primary.mergedExamples.forEach((ex) => allExamples.add(ex));
    }

    for (const sense of group) {
      if (sense !== primary) {
        if (sense.example_en) allExamples.add(sense.example_en);
        if (sense.mergedExamples) {
          sense.mergedExamples.forEach((ex) => allExamples.add(ex));
        }
      }
    }

    const allTranslations = new Set<string>();
    for (const sense of group) {
      if (sense.translation_pl && sense.translation_pl !== "__NEEDS_HUMAN__") {
        const parts = sense.translation_pl.split(";").map((p) => p.trim()).filter(Boolean);
        for (const part of parts) {
          allTranslations.add(part);
        }
      }
    }

    merged.push({
      ...primary,
      translation_pl: Array.from(allTranslations).join("; ") || primary.translation_pl,
      mergedExamples: Array.from(allExamples),
    });
  }

  const sorted = merged.sort((a, b) => {
    if (a.domain === null && b.domain !== null) return -1;
    if (a.domain !== null && b.domain === null) return 1;
    return a.sense_order - b.sense_order;
  });

  return sorted.slice(0, MAX_SENSES_FOR_UI).map((sense, index) => ({
    ...sense,
    sense_order: index,
  }));
}

type AILexiconResponseRaw =
  | {
      status: "invalid" | "uncertain";
    }
  | {
      status: "ok";
      lemma: string;
      senses: Array<{
        pos: "noun" | "verb" | "adjective";
        translation_pl: string;
        definition_en: string;
        example_en: string;
        verb_forms: {
          present_simple_i: string;
          present_simple_you: string;
          present_simple_he_she_it: string;
          past_simple: string;
          past_participle: string;
        } | null;
      }>;
    };

export type AILexiconResponse = {
  lemma: string;
  pos: string;
  senses: Array<{
    definition_en: string;
    translation_pl: string;
    example_en: string;
    domain?: string | null;
  }>;
  verb_forms?: {
    present_simple_i: string;
    present_simple_you: string;
    present_simple_he_she_it: string;
    past_simple: string;
    past_participle: string;
  } | null;
};

type EnrichmentMode = "default" | "core";

export async function openaiEnrichLexicon(
  lemma: string,
  retryOnInvalidTranslation = false,
  mode: EnrichmentMode = "default"
): Promise<AILexiconResponse[] | null> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = "gpt-4.1";

  const coreModePrompt =
    mode === "core"
      ? `

You are generating vocabulary for beginner learners (A1-B1).

CRITICAL RULES:
- Prefer ONLY ONE meaning per word
- Allow a second meaning only if it is extremely common and clearly different
- Never return more than 2 senses
- Avoid rare, abstract, or secondary meanings
- Focus on the most basic everyday meaning
- If unsure, return ONLY ONE sense
`
      : "";

  const prompt = `You are generating a vocabulary entry for a language learning system.

This system supports multiple meanings (senses) per word.
The user will choose the correct meaning from a list.

Your output will be used in a production lexicon.
Accuracy, clarity, and realism are critical.
${coreModePrompt}

INPUT:
User query (Polish or English): "${lemma}"

STEP 1 - Detect lemma
- If Polish -> translate to the most common English lemma
- If English -> normalize to base form
- Lemma must be lowercase and base form

STEP 2 - Validate
If the input is:
- not a real word
- nonsense or malformed
- extremely rare, technical, or inappropriate

Return exactly:
{"status":"invalid"}

DO NOT guess.

STEP 3 - Generate senses
Determine whether the word has:
- one clear meaning -> return 1 sense
- multiple common meanings -> return up to 3 senses

IMPORTANT:
- prefer fewer senses over doubtful ones
- if unsure about a meaning -> DO NOT include it
- if you cannot confidently produce at least one high-quality sense -> return "invalid"
- do not merge meanings that belong to different English words
- each sense must represent a real, common meaning of the SAME English word
- if meanings belong to different English lemmas -> EXCLUDE them
- if you are not confident about a second or third sense -> DO NOT include it
- do not use the same Polish translation to force unrelated English concepts into one entry

CRITICAL EXAMPLE:
- "cork" (material / bottle stopper) is NOT related to "traffic jam"
- do NOT include "traffic jam" under "cork"

STEP 4 - Confidence check
If you are unsure about:
- correctness of translation
- naturalness of the definition
- whether the sense is common

Return exactly:
{"status":"uncertain"}

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "status": "ok",
  "lemma": "...",
  "senses": [
    {
      "pos": "noun" | "verb" | "adjective",
      "translation_pl": "...",
      "definition_en": "...",
      "example_en": "...",
      "verb_forms": {
        "present_simple_i": "...",
        "present_simple_you": "...",
        "present_simple_he_she_it": "...",
        "past_simple": "...",
        "past_participle": "..."
      } | null
    }
  ]
}

RULES FOR SENSES:
- max 3 senses
- each sense must represent a clearly different meaning
- do NOT include senses with the same translation_pl
- do NOT include paraphrases of the same meaning
- all senses must belong to the same English lemma
- exclude any sense that actually belongs to a different English word

POS:
- must be correct per sense
- one POS per sense

VERB_FORMS:
- required if pos = "verb"
- must follow exact format:
  present_simple_i
  present_simple_you
  present_simple_he_she_it
  past_simple
  past_participle
- must be correct, irregular if needed
- if not a verb -> null

TRANSLATION_PL:
- single phrase only
- no commas
- no explanations

DEFINITION_EN:
- simple English, CEFR A2-B1
- max 12 words
- describe ONE meaning only
- no "or", no multiple meanings

EXAMPLE_EN:
- natural, everyday sentence
- max 12 words
- must match the meaning
- should include the lemma or correct form

STRICT RULES:
- NO duplicate translations across senses
- NO vague or abstract meanings
- NO academic or rare meanings
- NO guessing
- NO markdown
- NO explanations outside JSON`;

  const retryPrompt = retryOnInvalidTranslation
    ? `\n\nIMPORTANT: Your previous Polish translation was descriptive. Return a SHORT dictionary headword or lexical equivalent only (1-3 words, max 40 chars). Do NOT use descriptive sentences, explanations, or phrases like "który/która/które", "używane do", "pomaga", "część, która".`
    : "";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You output strictly valid JSON and nothing else. If confidence is not high enough for production lexicon quality, return status invalid or uncertain instead of guessing.",
        },
        {
          role: "user",
          content: (prompt + retryPrompt).trim(),
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
  } catch {
    throw new Error(`Model did not return valid JSON: ${cleanedContent.substring(0, 200)}`);
  }

  if (parsedRaw.status === "invalid" || parsedRaw.status === "uncertain") {
    return null;
  }
  if (parsedRaw.status !== "ok") {
    throw new Error("Invalid AI response: unknown status");
  }
  if (!parsedRaw.lemma || !Array.isArray(parsedRaw.senses) || parsedRaw.senses.length === 0) {
    throw new Error("Invalid AI response: missing lemma or senses");
  }

  const invalidTranslations: Array<{ senseIndex: number; pos: string; reason: string }> = [];
  const seenPos = new Set<string>();

  for (let i = 0; i < parsedRaw.senses.length; i++) {
    const sense = parsedRaw.senses[i];
    if (!sense.pos || typeof sense.pos !== "string") {
      throw new Error(`Invalid AI response: sense ${i} missing pos`);
    }
    if (!sense.translation_pl || typeof sense.translation_pl !== "string" || !sense.translation_pl.trim()) {
      throw new Error(`Invalid AI response: sense ${i} missing translation_pl`);
    }
    if (!isValidTranslationPl(sense.translation_pl)) {
      invalidTranslations.push({ senseIndex: i, pos: sense.pos, reason: "invalid_format" });
      continue;
    }
    if (!translationMatchesPos(sense.translation_pl, sense.pos)) {
      invalidTranslations.push({
        senseIndex: i,
        pos: sense.pos,
        reason: `pos_mismatch: translation "${sense.translation_pl}" does not match pos "${sense.pos}"`,
      });
      continue;
    }
    if (!sense.definition_en || typeof sense.definition_en !== "string" || !sense.definition_en.trim()) {
      throw new Error(`Invalid AI response: sense ${i} missing definition_en`);
    }
    if (!sense.example_en || typeof sense.example_en !== "string" || !sense.example_en.trim()) {
      throw new Error(`Invalid AI response: sense ${i} missing example_en`);
    }
    if (sense.pos === "verb" && !sense.verb_forms) {
      throw new Error(`Invalid AI response: sense ${i} is verb but missing verb_forms`);
    }
    if (sense.pos !== "verb" && sense.verb_forms !== null) {
      invalidTranslations.push({
        senseIndex: i,
        pos: sense.pos,
        reason: `non_verb_with_verb_forms: pos "${sense.pos}" must have verb_forms = null`,
      });
      continue;
    }
    const normalizedTranslation = normalizeTranslationPl(sense.translation_pl);
    if (!normalizedTranslation) {
      invalidTranslations.push({
        senseIndex: i,
        pos: sense.pos,
        reason: "empty_normalized_translation",
      });
      continue;
    }
    if (seenPos.has(`${sense.pos}::${normalizedTranslation}`)) {
      invalidTranslations.push({
        senseIndex: i,
        pos: sense.pos,
        reason: `duplicate_translation: "${sense.translation_pl}" already used for pos "${sense.pos}"`,
      });
      continue;
    }
    seenPos.add(`${sense.pos}::${normalizedTranslation}`);
  }

  if (invalidTranslations.length > 0) {
    const validIndices = new Set(
      Array.from({ length: parsedRaw.senses.length }, (_, i) => i).filter(
        (i) => !invalidTranslations.some((inv) => inv.senseIndex === i)
      )
    );
    parsedRaw.senses = parsedRaw.senses.filter((_, i) => validIndices.has(i));
  }

  if (parsedRaw.senses.length === 0 && !retryOnInvalidTranslation) {
    return openaiEnrichLexicon(lemma, true);
  }
  if (parsedRaw.senses.length === 0) {
    throw new Error("No valid senses after filtering invalid translations");
  }

  parsedRaw.senses = parsedRaw.senses.slice(0, mode === "core" ? 2 : 3);

  const responsesByPos = new Map<string, AILexiconResponse>();
  for (const sense of parsedRaw.senses) {
    if (!responsesByPos.has(sense.pos)) {
      responsesByPos.set(sense.pos, {
        lemma: parsedRaw.lemma,
        pos: sense.pos,
        senses: [],
        verb_forms: sense.pos === "verb" && sense.verb_forms ? sense.verb_forms : undefined,
      });
    }
    responsesByPos.get(sense.pos)!.senses.push({
      definition_en: sense.definition_en,
      translation_pl: sense.translation_pl,
      example_en: sense.example_en,
      domain: null,
    });
  }

  return Array.from(responsesByPos.values());
}

export async function saveToLexicon(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  dataArray: AILexiconResponse[]
): Promise<Array<{ entry_id: string; sense_ids: string[]; pos: string }>> {
  const results: Array<{ entry_id: string; sense_ids: string[]; pos: string }> = [];

  for (const data of dataArray) {
    const lemma_norm = normLemma(data.lemma);

    const aiSenses: SenseData[] = data.senses.map((s, idx) => ({
      definition_en: s.definition_en,
      domain: s.domain || null,
      sense_order: idx,
      translation_pl: s.translation_pl,
      example_en: s.example_en,
    }));

    const filteredSenses = applyFiltersAndMerges(aiSenses, data.pos);

    const { data: existingEntry } = await supabase
      .from("lexicon_entries")
      .select("id")
      .eq("lemma_norm", lemma_norm)
      .eq("pos", data.pos)
      .maybeSingle();

    let entry_id: string;
    if (existingEntry) {
      entry_id = existingEntry.id;
      const { error: updateErr } = await supabase
        .from("lexicon_entries")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", entry_id);

      if (updateErr) {
        throw new Error(`Failed to update lexicon entry: ${updateErr.message}`);
      }
    } else {
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

    const sense_ids = await saveSensesToDb(supabase, entry_id, filteredSenses, data.verb_forms);
    results.push({ entry_id, sense_ids, pos: data.pos });
  }

  return results;
}

async function saveSensesToDb(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  entry_id: string,
  filteredSenses: SenseData[],
  verb_forms?: AILexiconResponse["verb_forms"]
): Promise<string[]> {
  const sense_ids: string[] = [];
  const { data: existingSenses, error: existingSensesErr } = await supabase
    .from("lexicon_senses")
    .select("id, sense_order")
    .eq("entry_id", entry_id)
    .order("sense_order", { ascending: true });

  if (existingSensesErr) {
    throw new Error(`Failed to load existing senses: ${existingSensesErr.message}`);
  }

  const existingByOrder = new Map<number, string>();
  for (const row of existingSenses ?? []) {
    existingByOrder.set(Number(row.sense_order ?? 0), row.id as string);
  }

  for (let i = 0; i < filteredSenses.length; i++) {
    const sense = filteredSenses[i];
    const existingSenseId = existingByOrder.get(sense.sense_order);
    let sense_id: string;

    if (existingSenseId) {
      const { error: updateSenseErr } = await supabase
        .from("lexicon_senses")
        .update({
          definition_en: sense.definition_en,
          domain: sense.domain || null,
          sense_order: sense.sense_order,
        })
        .eq("id", existingSenseId);

      if (updateSenseErr) {
        throw new Error(`Failed to update sense ${i}: ${updateSenseErr.message}`);
      }
      sense_id = existingSenseId;
    } else {
      const { data: senseData, error: senseErr } = await supabase
        .from("lexicon_senses")
        .insert({
          entry_id,
          definition_en: sense.definition_en,
          domain: sense.domain || null,
          sense_order: sense.sense_order,
        })
        .select("id")
        .single();

      if (senseErr) {
        throw new Error(`Failed to save sense ${i}: ${senseErr.message}`);
      }
      sense_id = senseData.id;
    }

    sense_ids.push(sense_id);

    const { data: existingTranslation } = await supabase
      .from("lexicon_translations")
      .select("id")
      .eq("sense_id", sense_id)
      .maybeSingle();

    const transErr = existingTranslation
      ? (
          await supabase
            .from("lexicon_translations")
            .update({ translation_pl: sense.translation_pl || "" })
            .eq("id", existingTranslation.id)
        ).error
      : (await supabase.from("lexicon_translations").insert({
          sense_id,
          translation_pl: sense.translation_pl || "",
        })).error;

    if (transErr) {
      throw new Error(`Failed to save translation for sense ${i}: ${transErr.message}`);
    }

    const { error: deleteExamplesErr } = await supabase.from("lexicon_examples").delete().eq("sense_id", sense_id);
    if (deleteExamplesErr) {
      throw new Error(`Failed to clear examples for sense ${i}: ${deleteExamplesErr.message}`);
    }

    const allExamples: string[] = [];
    if (sense.example_en) allExamples.push(sense.example_en);
    if (sense.mergedExamples) allExamples.push(...sense.mergedExamples);
    const examplesToSave = allExamples.slice(0, 10);

    for (const example of examplesToSave) {
      const exampleHash = Buffer.from(example).toString("base64").slice(0, 64);
      const { error: exampleErr } = await supabase.from("lexicon_examples").insert({
        sense_id,
        example_en: example,
        source: "ai",
        example_hash: exampleHash,
      });

      if (exampleErr && !String(exampleErr.message).toLowerCase().includes("unique")) {
        throw new Error(`Failed to save example for sense ${i}: ${exampleErr.message}`);
      }
    }
  }

  if (verb_forms) {
    const { data: existingVerbForms } = await supabase
      .from("lexicon_verb_forms")
      .select("id")
      .eq("entry_id", entry_id)
      .maybeSingle();

    const verbFormsPayload = {
      entry_id,
      present_simple_i: verb_forms.present_simple_i,
      present_simple_you: verb_forms.present_simple_you,
      present_simple_he_she_it: verb_forms.present_simple_he_she_it,
      past_simple: verb_forms.past_simple,
      past_participle: verb_forms.past_participle,
    };

    const verbErr = existingVerbForms
      ? (await supabase.from("lexicon_verb_forms").update(verbFormsPayload).eq("id", existingVerbForms.id)).error
      : (await supabase.from("lexicon_verb_forms").insert(verbFormsPayload)).error;

    if (verbErr) {
      throw new Error(`Failed to save verb forms: ${verbErr.message}`);
    }
  }

  return sense_ids;
}

export type LookupOrCreateLexiconEntryResult =
  | {
      status: "existing";
      lemma_norm: string;
      saveResults: Array<{ entry_id: string; sense_ids: string[]; pos: string }>;
    }
  | {
      status: "created" | "updated";
      lemma_norm: string;
      saveResults: Array<{ entry_id: string; sense_ids: string[]; pos: string }>;
    }
  | {
      status: "invalid_or_uncertain";
      lemma_norm: string;
      saveResults: [];
    };

export async function lookupOrCreateLexiconEntry(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lemma: string,
  options?: { forceEnrich?: boolean; mode?: EnrichmentMode }
): Promise<LookupOrCreateLexiconEntryResult> {
  const lemma_norm = normLemma(lemma);

  const { data: existingEntries, error: checkErr } = await supabase
    .from("lexicon_entries")
    .select("id")
    .eq("lemma_norm", lemma_norm);

  if (checkErr) {
    throw new Error(`Failed to check lexicon cache: ${checkErr.message}`);
  }

  if ((existingEntries?.length ?? 0) > 0 && !options?.forceEnrich) {
    return {
      status: "existing",
      lemma_norm,
      saveResults: [],
    };
  }

  const aiDataArray = await openaiEnrichLexicon(lemma_norm, false, options?.mode ?? "default");
  if (!aiDataArray || aiDataArray.length === 0) {
    return {
      status: "invalid_or_uncertain",
      lemma_norm,
      saveResults: [],
    };
  }

  const saveResults = await saveToLexicon(supabase, aiDataArray);
  if (saveResults.length === 0) {
    throw new Error("Failed to save any lexicon entries");
  }

  return {
    status: (existingEntries?.length ?? 0) > 0 ? "updated" : "created",
    lemma_norm,
    saveResults,
  };
}
