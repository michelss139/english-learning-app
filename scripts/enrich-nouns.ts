/**
 * Fill gaps only for noun lexicon: first sense per entry — translation, definition, examples, optional CEFR.
 * Does not create entries/senses; does not overwrite non-empty fields.
 */
import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { callOpenAIWithRetry, parseLimit, requiredEnv, sleep, stripJsonFence } from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const DELAY_MS = 400;
const PAGE = 1000;

type NounEntry = { id: string; lemma: string; lemma_norm: string };

type SenseRow = { id: string; definition_en: string | null; cefr_level: string | null };

type GptNounPayload = {
  translation_pl: string;
  definition_en: string;
  examples: string[];
  level: string;
};

const CEFR = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

function buildNounPrompt(lemma: string): string {
  return [
    "You are enriching vocabulary data.",
    "",
    `Word: "${lemma}"`,
    "",
    "Return JSON:",
    "",
    "{",
    '"translation_pl": "...",',
    '"definition_en": "...",',
    '"examples": ["...", "..."],',
    '"level": "A1|A2|B1|B2|C1|C2"',
    "}",
    "",
    "Rules:",
    "",
    "translation must be natural Polish",
    "definition must be simple and clear",
    "examples must sound natural in everyday situations — how people really speak or write, not like dictionary definitions or artificial \"the X is a Y\" textbook lines",
    "examples must be natural English sentences",
    `examples must include the word "${lemma}"`,
    "keep sentences short and useful",
    "level should reflect real CEFR usage",
    "",
    "Return ONLY JSON (no markdown).",
  ].join("\n");
}

function parseCefr(raw: string): string {
  const u = raw.trim().toUpperCase();
  if (CEFR.has(u)) return u;
  throw new Error(`Invalid level: ${raw}`);
}

function parseNounGptJson(text: string): GptNounPayload {
  const raw = JSON.parse(stripJsonFence(text)) as Record<string, unknown>;
  const translation_pl = typeof raw.translation_pl === "string" ? raw.translation_pl.trim() : "";
  const definition_en = typeof raw.definition_en === "string" ? raw.definition_en.trim() : "";
  const ex = raw.examples;
  const examples = Array.isArray(ex)
    ? ex.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
    : [];
  const levelRaw = typeof raw.level === "string" ? raw.level.trim() : "";
  if (!translation_pl) throw new Error("Invalid GPT JSON: translation_pl");
  if (!definition_en) throw new Error("Invalid GPT JSON: definition_en");
  if (examples.length < 2) throw new Error("Invalid GPT JSON: need 2 examples");
  const level = parseCefr(levelRaw);
  return { translation_pl, definition_en, examples: examples.slice(0, 2), level };
}

function normEx(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function loadNounEntries(supabase: SupabaseClient, limit: number | null): Promise<NounEntry[]> {
  if (limit != null) {
    const { data, error } = await supabase
      .from("lexicon_entries")
      .select("id, lemma, lemma_norm")
      .eq("pos", "noun")
      .order("lemma_norm", { ascending: true })
      .limit(limit);
    if (error) throw new Error(`lexicon_entries: ${error.message}`);
    return (data ?? []) as NounEntry[];
  }

  const all: NounEntry[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("lexicon_entries")
      .select("id, lemma, lemma_norm")
      .eq("pos", "noun")
      .order("lemma_norm", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`lexicon_entries: ${error.message}`);
    const batch = (data ?? []) as NounEntry[];
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return all;
}

async function getFirstSense(supabase: SupabaseClient, entryId: string): Promise<SenseRow | null> {
  const { data, error } = await supabase
    .from("lexicon_senses")
    .select("id, definition_en, cefr_level")
    .eq("entry_id", entryId)
    .order("sense_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`lexicon_senses: ${error.message}`);
  return data as SenseRow | null;
}

async function main(): Promise<void> {
  const limit = parseLimit();
  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Loading noun entries…");
  const entries = await loadNounEntries(supabase, limit);
  console.log(`  ${entries.length} nouns to scan${limit ? ` (limit=${limit})` : ""}\n`);

  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of entries) {
    const word = entry.lemma?.trim() || entry.lemma_norm;
    const label = entry.lemma_norm;

    try {
      const sense = await getFirstSense(supabase, entry.id);
      if (!sense) {
        console.log(`[skip] ${label} — no sense`);
        skipped += 1;
        await sleep(DELAY_MS);
        continue;
      }

      const { data: trRow, error: trErr } = await supabase
        .from("lexicon_translations")
        .select("id, translation_pl")
        .eq("sense_id", sense.id)
        .maybeSingle();
      if (trErr) throw new Error(trErr.message);

      const hasTranslation = Boolean(trRow?.translation_pl?.trim());
      const hasDefinition = Boolean(sense.definition_en?.trim());

      const { data: exRows, error: exErr } = await supabase
        .from("lexicon_examples")
        .select("example_en")
        .eq("sense_id", sense.id);
      if (exErr) throw new Error(exErr.message);
      const exampleCount =
        (exRows ?? []).filter((r) => typeof (r as { example_en?: string }).example_en === "string" && (r as { example_en: string }).example_en.trim()).length;

      const needTranslation = !hasTranslation;
      const needDefinition = !hasDefinition;
      const needExamples = exampleCount < 2;

      if (!needTranslation && !needDefinition && !needExamples) {
        console.log(`[skip] ${label} — complete`);
        skipped += 1;
        await sleep(DELAY_MS);
        continue;
      }

      const gptRaw = await callOpenAIWithRetry(buildNounPrompt(word));
      const gpt = parseNounGptJson(gptRaw);

      const added: string[] = [];

      if (needTranslation) {
        if (trRow?.id) {
          const { error: u } = await supabase.from("lexicon_translations").update({ translation_pl: gpt.translation_pl }).eq("id", trRow.id);
          if (u) throw new Error(u.message);
        } else {
          const { error: ins } = await supabase.from("lexicon_translations").insert({ sense_id: sense.id, translation_pl: gpt.translation_pl });
          if (ins) throw new Error(ins.message);
        }
        added.push("translation");
      }

      if (needExamples) {
        const existingNorm = new Set(
          (exRows ?? [])
            .map((r) => (r as { example_en?: string }).example_en)
            .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
            .map(normEx),
        );
        let addedCount = 0;
        const targetAdd = 2 - exampleCount;
        for (const ex of gpt.examples) {
          if (addedCount >= targetAdd) break;
          const n = normEx(ex);
          if (existingNorm.has(n)) continue;
          const { error: eIns } = await supabase.from("lexicon_examples").insert({
            sense_id: sense.id,
            example_en: ex,
            source: "ai",
          });
          if (eIns) throw new Error(eIns.message);
          existingNorm.add(n);
          addedCount += 1;
        }
        if (addedCount > 0) added.push(addedCount === 1 ? "example" : "examples");
      }

      const hadCefr = Boolean(sense.cefr_level?.trim());
      if (needDefinition || !hadCefr) {
        const patch: Record<string, string> = {};
        if (needDefinition) patch.definition_en = gpt.definition_en;
        if (!hadCefr) patch.cefr_level = gpt.level;
        const { error: u } = await supabase.from("lexicon_senses").update(patch).eq("id", sense.id);
        if (u) throw new Error(u.message);
        if (needDefinition) added.push("definition");
        if (!hadCefr) added.push("level");
      }

      console.log(`[enriched] ${label} — added: ${added.join("/")}`);
      enriched += 1;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[error] ${label} — ${msg}`);
      errors += 1;
    }

    await sleep(DELAY_MS);
  }

  console.log("\n=== summary ===");
  console.log(`total scanned: ${entries.length}`);
  console.log(`enriched: ${enriched}`);
  console.log(`skipped: ${skipped}`);
  console.log(`errors: ${errors}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
