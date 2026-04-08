/**
 * Second-pass cleanup: deletes flagged verb entries only when GPT confirms they are not real verbs.
 * Removes vocab_pack_items blocking FK before deleting lexicon_entries (cascade handles senses, etc.).
 */
import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { callOpenAIWithRetry, requiredEnv, sleep, stripJsonFence } from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const DELAY_MS = 400;

type VerbRow = { id: string; lemma_norm: string };

function buildCleanPrompt(lemma: string): string {
  return [
    "Check if this word is truly usable as a verb in real English:",
    "",
    `Word: ${lemma}`,
    "",
    "Return JSON:",
    "",
    "{",
    '  "should_delete": true/false,',
    '  "reason": "..."',
    "}",
    "",
    "Rules:",
    "- Only delete if you are 100% sure the word is not useful as a verb.",
    "- delete only if clearly NOT used as a verb",
    "- keep if it is a valid verb (even if less common)",
    "- keep if it has real usage in English",
    "",
    "Examples:",
    "- delete: cab, beacon",
    "- keep: run, work, drink, access (even if formal)",
    "",
    "Return ONLY JSON (no markdown).",
  ].join("\n");
}

function parseCleanJson(text: string): { should_delete: boolean; reason: string } {
  const raw = JSON.parse(stripJsonFence(text)) as Record<string, unknown>;
  const should_delete = raw.should_delete === true;
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  return { should_delete, reason: reason || "(no reason)" };
}

async function loadFlaggedVerbs(supabase: SupabaseClient): Promise<VerbRow[]> {
  const page = 1000;
  const all: VerbRow[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from("lexicon_entries")
      .select("id, lemma_norm")
      .eq("pos", "verb")
      .eq("flagged_for_review", true)
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

async function deletePackItemsForEntry(supabase: SupabaseClient, entryId: string): Promise<void> {
  const { data: senses, error: sErr } = await supabase.from("lexicon_senses").select("id").eq("entry_id", entryId);
  if (sErr) throw new Error(`lexicon_senses: ${sErr.message}`);
  const senseIds = (senses ?? []).map((r) => (r as { id: string }).id).filter(Boolean);
  if (!senseIds.length) return;
  const { error: pErr } = await supabase.from("vocab_pack_items").delete().in("sense_id", senseIds);
  if (pErr) throw new Error(`vocab_pack_items delete: ${pErr.message}`);
}

async function deleteVerbEntry(supabase: SupabaseClient, entryId: string): Promise<void> {
  await deletePackItemsForEntry(supabase, entryId);
  const { error: irrErr } = await supabase.from("irregular_verbs").update({ entry_id: null }).eq("entry_id", entryId);
  if (irrErr) throw new Error(`irregular_verbs unlink: ${irrErr.message}`);
  const { error } = await supabase.from("lexicon_entries").delete().eq("id", entryId);
  if (error) throw new Error(`lexicon_entries delete: ${error.message}`);
}

async function main(): Promise<void> {
  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Loading flagged verb entries…");
  const rows = await loadFlaggedVerbs(supabase);
  console.log(`  ${rows.length} flagged verbs\n`);

  let deleted = 0;
  let kept = 0;
  let errors = 0;

  for (const row of rows) {
    const label = row.lemma_norm;
    try {
      const raw = await callOpenAIWithRetry(buildCleanPrompt(row.lemma_norm));
      const v = parseCleanJson(raw);

      if (!v.should_delete) {
        console.log(`[kept] ${label} — ${v.reason}`);
        kept += 1;
      } else {
        await deleteVerbEntry(supabase, row.id);
        console.log(`[deleted] ${label} — ${v.reason}`);
        deleted += 1;
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
  console.log(`deleted: ${deleted}`);
  console.log(`kept: ${kept}`);
  console.log(`errors: ${errors}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
