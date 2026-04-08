/**
 * GPT-assisted QA for verb lemmas in lexicon_entries: sets flagged_for_review on weak rows.
 */
import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { callOpenAIWithRetry, parseLimit, requiredEnv, sleep, stripJsonFence } from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const DELAY_MS = 400;

type VerbRow = { id: string; lemma_norm: string };

type ValidationPayload = {
  valid: boolean;
  reason: string;
  quality: "high" | "medium" | "low";
};

function buildValidatePrompt(lemma: string): string {
  return [
    "Evaluate this English verb for a language learning app:",
    "",
    `Verb: ${lemma}`,
    "",
    "Check:",
    "",
    "1. Is this verb commonly used in everyday English?",
    "2. Is it natural as a verb (not mainly a noun)?",
    "3. Would a learner benefit from learning it?",
    "",
    "Return JSON:",
    "",
    "{",
    '  "valid": true/false,',
    '  "reason": "...",',
    '  "quality": "high" | "medium" | "low"',
    "}",
    "",
    "Rules:",
    "- reject rare or technical verbs",
    "- reject verbs that are mostly nouns",
    "- accept common everyday verbs",
    "",
    "Return ONLY JSON (no markdown).",
  ].join("\n");
}

function parseQuality(raw: unknown): ValidationPayload["quality"] {
  if (typeof raw !== "string") return "medium";
  const q = raw.trim().toLowerCase();
  if (q === "high" || q === "medium" || q === "low") return q;
  return "medium";
}

function parseValidationJson(text: string): ValidationPayload {
  const raw = JSON.parse(stripJsonFence(text)) as Record<string, unknown>;
  const valid = raw.valid === true;
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  const quality = parseQuality(raw.quality);
  return { valid, reason: reason || "(no reason)", quality };
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

  console.log("Loading verb entries…");
  const rows = await loadVerbEntries(supabase, limit);
  console.log(`  ${rows.length} verbs to validate${limit ? ` (limit=${limit})` : ""}\n`);

  let flagged = 0;
  let ok = 0;
  let errors = 0;

  for (const row of rows) {
    const label = row.lemma_norm;
    try {
      const raw = await callOpenAIWithRetry(buildValidatePrompt(row.lemma_norm));
      const v = parseValidationJson(raw);
      const shouldFlag = v.valid === false || v.quality === "low";

      const { error: upErr } = await supabase
        .from("lexicon_entries")
        .update({
          flagged_for_review: shouldFlag,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (upErr) throw new Error(upErr.message);

      if (shouldFlag) {
        console.log(`[flagged] ${label} — ${v.reason} (quality: ${v.quality}, valid: ${v.valid})`);
        flagged += 1;
      } else {
        console.log(`[ok] ${label} — ${v.quality}`);
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
