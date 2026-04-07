import type { SupabaseClient } from "@supabase/supabase-js";
import { patternsWithTypes, type PatternWithType } from "./patternType";

/**
 * Pairs each irregular verb id with lexicon_patterns from its primary sense (first sense_order).
 * Classification (phrase vs structure) is derived in memory — see getPatternType.
 */
export async function loadLexiconPatternsForIrregularVerbs(
  supabase: SupabaseClient,
  verbs: Array<{ id: string; entry_id: string | null }>,
): Promise<Map<string, PatternWithType[]>> {
  const out = new Map<string, PatternWithType[]>();
  const entryIds = [...new Set(verbs.map((v) => v.entry_id).filter(Boolean))] as string[];
  if (entryIds.length === 0) return out;

  const { data: senseRows, error: senseErr } = await supabase
    .from("lexicon_senses")
    .select("id, entry_id, sense_order")
    .in("entry_id", entryIds)
    .order("entry_id", { ascending: true })
    .order("sense_order", { ascending: true });

  if (senseErr || !senseRows?.length) return out;

  const entryToSenseId = new Map<string, string>();
  for (const s of senseRows) {
    if (!entryToSenseId.has(s.entry_id)) entryToSenseId.set(s.entry_id, s.id);
  }
  const senseIds = [...entryToSenseId.values()];

  const { data: patRows, error: patErr } = await supabase
    .from("lexicon_patterns")
    .select("sense_id, pattern")
    .in("sense_id", senseIds);

  if (patErr || !patRows?.length) return out;

  const senseToPatterns = new Map<string, string[]>();
  for (const r of patRows) {
    const sid = r.sense_id as string;
    const p = (r.pattern as string)?.trim();
    if (!p) continue;
    const list = senseToPatterns.get(sid) ?? [];
    list.push(p);
    senseToPatterns.set(sid, list);
  }

  const entryToPatternStrings = new Map<string, string[]>();
  for (const [eid, sid] of entryToSenseId) {
    const arr = senseToPatterns.get(sid);
    if (arr?.length) entryToPatternStrings.set(eid, arr);
  }

  for (const v of verbs) {
    const eid = v.entry_id;
    if (!eid) continue;
    const strings = entryToPatternStrings.get(eid);
    if (strings?.length) out.set(v.id, patternsWithTypes(strings));
  }

  return out;
}
