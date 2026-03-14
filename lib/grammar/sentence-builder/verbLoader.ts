import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { SentenceBuilderVerb } from "./types";
import { SENTENCE_BUILDER_VERB_WHITELIST } from "./verbWhitelist";

let cachedVerbs: SentenceBuilderVerb[] | null = null;
let cachedPromise: Promise<SentenceBuilderVerb[]> | null = null;

function normalizeCell(value: string | null): string {
  return (value ?? "")
    .split("/")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)[0] ?? "";
}

export async function loadSentenceBuilderVerbs(): Promise<SentenceBuilderVerb[]> {
  if (cachedVerbs) {
    return cachedVerbs;
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  cachedPromise = (async () => {
    const supabase = createSupabaseAdmin();
    const whitelist = new Set<string>(SENTENCE_BUILDER_VERB_WHITELIST);

    const { data, error } = await supabase
      .from("irregular_verbs")
      .select("base, past_simple, past_participle")
      .in("base", [...whitelist]);

    if (error) {
      cachedPromise = null;
      throw new Error(`Failed to load sentence builder verbs: ${error.message}`);
    }

    const rows =
      data?.map((row) => ({
        base: normalizeCell(row.base),
        past: normalizeCell(row.past_simple),
        pastParticiple: normalizeCell(row.past_participle),
      })) ?? [];

    const map = new Map(
      rows
        .filter((row) => whitelist.has(row.base) && row.base && row.past && row.pastParticiple)
        .map((row) => [row.base, row])
    );
    cachedVerbs = SENTENCE_BUILDER_VERB_WHITELIST.map((base) => map.get(base)).filter(
      (row): row is SentenceBuilderVerb => Boolean(row)
    );

    return cachedVerbs;
  })();

  return cachedPromise;
}

export function clearSentenceBuilderVerbCache(): void {
  cachedVerbs = null;
  cachedPromise = null;
}
