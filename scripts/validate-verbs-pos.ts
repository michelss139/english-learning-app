/**
 * POS sanity check: is this lemma actually used as a verb in real English?
 * Sets flagged_for_review when is_verb is false or confidence is low.
 */
import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { callOpenAIWithRetry, parseLimit, requiredEnv, sleep, stripJsonFence } from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const DELAY_MS = 400;

type VerbRow = { id: string; lemma_norm: string };

type PosPayload = {
  is_verb: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
};

function buildPosPrompt(lemma: string): string {
  return `You are validating English vocabulary data.

Word: "${lemma}"

Question:
Is this word used as a VERB in real English?

Rules:

Answer YES if it is used as a verb (even if rare, formal, or technical)
Answer NO only if it is NOT used as a verb at all
Do NOT reject because of difficulty, rarity, or formality

Return ONLY JSON:

{
"is_verb": true/false,
"confidence": "high" | "medium" | "low",
"reason": "short explanation"
}`;
}

function parseConfidence(raw: unknown): PosPayload["confidence"] {
  if (typeof raw !== "string") throw new Error("Invalid JSON: confidence");
  const c = raw.trim().toLowerCase();
  if (c === "high" || c === "medium" || c === "low") return c;
  throw new Error(`Invalid JSON: confidence must be high, medium, or low`);
}

function parsePosJson(text: string): PosPayload {
  const raw = JSON.parse(stripJsonFence(text)) as Record<string, unknown>;
  if (raw.is_verb !== true && raw.is_verb !== false) {
    throw new Error("Invalid JSON: is_verb must be true or false");
  }
  const is_verb = raw.is_verb === true;
  const confidence = parseConfidence(raw.confidence);
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  return { is_verb, confidence, reason: reason || "(no reason)" };
}

async function loadVerbEntries(supabase: SupabaseClient, limit: number | null): Promise<VerbRow[]> {
  if (limit != null) {
    const { data, error } = await supabase
      .from("lexicon_entries")
      .select("id, lemma_norm")
      .eq("pos", "verb")
      .order("lemma_norm", { ascending: true })
      .limit(limit);
    if (error) throw new Error(`lexicon_entries: ${error.message}`);
    return (data ?? []) as VerbRow[];
  }

  const page = 1000;
  const all: VerbRow[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from("lexicon_entries")
      .select("id, lemma_norm")
      .eq("pos", "verb")
      .order("lemma_norm", { ascending: true })
      .range(from, from + page - 1);
    if (error) throw new Error(`lexicon_entries: ${error.message}`);
    const batch = (data ?? []) as VerbRow[];
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < page) break;
  }
  return all;
}

async function main(): Promise<void> {
  const limit = parseLimit();
  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Loading verb entries (POS check)…");
  const rows = await loadVerbEntries(supabase, limit);
  console.log(`  ${rows.length} verbs to validate${limit ? ` (limit=${limit})` : ""}\n`);

  let flagged = 0;
  let ok = 0;
  let errors = 0;

  for (const row of rows) {
    const label = row.lemma_norm;
    try {
      const raw = await callOpenAIWithRetry(buildPosPrompt(row.lemma_norm));
      const v = parsePosJson(raw);
      const shouldFlag = v.is_verb === false || v.confidence === "low";

      const { error: upErr } = await supabase
        .from("lexicon_entries")
        .update({
          flagged_for_review: shouldFlag,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (upErr) throw new Error(upErr.message);

      if (shouldFlag) {
        console.log(`[flagged] ${label} — ${v.reason}`);
        flagged += 1;
      } else {
        console.log(`[ok] ${label}`);
        ok += 1;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[error] ${label} — ${msg}`);
      errors += 1;
    }

    await sleep(DELAY_MS);
  }

  console.log("\n=== summary ===");
  console.log(`total: ${rows.length}`);
  console.log(`flagged: ${flagged}`);
  console.log(`ok: ${ok}`);
  console.log(`errors: ${errors}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
