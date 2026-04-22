import type { SupabaseClient } from "@supabase/supabase-js";

export type PackCompletionBadge = "none" | "partial" | "perfect";

/**
 * Badge rules (pack list completion icon):
 * - none (gray): user has no vocab_pack answer events for this pack
 * - perfect (green): user completed at least one session with countMode "all", all answers correct, event count === pack item count
 * - partial (yellow): any other activity (started, subset, mistakes, or completed non-all / imperfect)
 */
export async function computePackCompletionBadges(
  supabase: SupabaseClient,
  studentId: string,
  packIds: string[],
  itemCountByPackId: Map<string, number>,
): Promise<Map<string, PackCompletionBadge>> {
  const out = new Map<string, PackCompletionBadge>();
  if (packIds.length === 0) return out;

  for (const id of packIds) {
    out.set(id, "none");
  }

  const { data: anyEvents, error: evErr } = await supabase
    .from("vocab_answer_events")
    .select("pack_id")
    .eq("student_id", studentId)
    .eq("context_type", "vocab_pack")
    .in("pack_id", packIds);

  if (evErr) {
    console.error("[packCompletionBadge] events", evErr);
    return out;
  }

  const packsWithActivity = new Set<string>();
  for (const row of anyEvents ?? []) {
    const pid = row.pack_id as string | undefined;
    if (pid) packsWithActivity.add(pid);
  }

  const { data: sessions, error: tsErr } = await supabase
    .from("training_sessions")
    .select("id, context_id, metadata, completed_at")
    .eq("student_id", studentId)
    .eq("exercise_type", "pack")
    .not("completed_at", "is", null)
    .in("context_id", packIds);

  if (tsErr) {
    console.error("[packCompletionBadge] training_sessions", tsErr);
    for (const pid of packsWithActivity) {
      out.set(pid, "partial");
    }
    return out;
  }

  const allModeCompleted = (sessions ?? []).filter((s) => {
    const meta = s.metadata as { countMode?: string } | null | undefined;
    return meta?.countMode === "all" && s.completed_at;
  });

  const sessionIds = allModeCompleted.map((s) => s.id as string).filter(Boolean);
  if (sessionIds.length === 0) {
    for (const pid of packsWithActivity) {
      out.set(pid, "partial");
    }
    return out;
  }

  const { data: sessionEvents, error: seErr } = await supabase
    .from("vocab_answer_events")
    .select("session_id, pack_id, is_correct")
    .eq("student_id", studentId)
    .eq("context_type", "vocab_pack")
    .in("session_id", sessionIds);

  if (seErr) {
    console.error("[packCompletionBadge] session events", seErr);
    for (const pid of packsWithActivity) {
      out.set(pid, "partial");
    }
    return out;
  }

  const bySession = new Map<string, { packId: string; total: number; wrong: number }>();
  for (const ev of sessionEvents ?? []) {
    const sid = ev.session_id as string | undefined;
    const pid = ev.pack_id as string | undefined;
    if (!sid || !pid) continue;
    const cur = bySession.get(sid) ?? { packId: pid, total: 0, wrong: 0 };
    cur.total += 1;
    if (ev.is_correct === false) cur.wrong += 1;
    bySession.set(sid, cur);
  }

  const perfectPackIds = new Set<string>();
  for (const s of allModeCompleted) {
    const sid = s.id as string;
    const packId = s.context_id as string;
    const n = itemCountByPackId.get(packId) ?? 0;
    if (n <= 0) continue;
    const agg = bySession.get(sid);
    if (!agg || agg.packId !== packId) continue;
    if (agg.wrong === 0 && agg.total === n) {
      perfectPackIds.add(packId);
    }
  }

  for (const pid of packIds) {
    if (perfectPackIds.has(pid)) {
      out.set(pid, "perfect");
    } else if (packsWithActivity.has(pid)) {
      out.set(pid, "partial");
    } else {
      out.set(pid, "none");
    }
  }

  return out;
}
