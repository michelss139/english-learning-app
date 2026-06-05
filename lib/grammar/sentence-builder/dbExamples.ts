import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { supabase as clientSupabase } from "@/lib/supabase/client";

export type DbSentenceExample = {
  id: string;
  verb: string;
  tense: string | null;
  modal: string | null;
  subject: string;
  type: "affirmative" | "negative";
  sentence_en: string;
  sentence_pl: string;
};

// ── Server-side (admin client) ────────────────────────────────────────────────

export async function getExamplesByTense(
  tense: string,
  limit = 6
): Promise<DbSentenceExample[]> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("sentence_examples")
    .select("id,verb,tense,modal,subject,type,sentence_en,sentence_pl")
    .eq("tense", tense)
    .eq("type", "affirmative")
    .limit(limit);

  if (error) return [];
  return (data ?? []) as DbSentenceExample[];
}

export async function getExamplesByModal(
  modal: string,
  limit = 6
): Promise<DbSentenceExample[]> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("sentence_examples")
    .select("id,verb,tense,modal,subject,type,sentence_en,sentence_pl")
    .eq("modal", modal)
    .eq("type", "affirmative")
    .limit(limit);

  if (error) return [];
  return (data ?? []) as DbSentenceExample[];
}

// ── Client-side (anon client) ─────────────────────────────────────────────────

export async function fetchChallengeExamples(opts: {
  tense?: string | null;
  modal?: string | null;
  limit?: number;
}): Promise<DbSentenceExample[]> {
  let query = clientSupabase
    .from("sentence_examples")
    .select("id,verb,tense,modal,subject,type,sentence_en,sentence_pl");

  if (opts.tense) {
    query = query.eq("tense", opts.tense);
  } else if (opts.modal) {
    query = query.eq("modal", opts.modal);
  }

  const { data, error } = await query.limit(opts.limit ?? 200);
  if (error) return [];
  return (data ?? []) as DbSentenceExample[];
}

export function pickRandomExample(
  examples: DbSentenceExample[],
  excludeId?: string
): DbSentenceExample | null {
  const pool = excludeId ? examples.filter((e) => e.id !== excludeId) : examples;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
