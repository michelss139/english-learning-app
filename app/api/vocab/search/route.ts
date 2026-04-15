import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { LexiconSearchRow } from "@/lib/vocab/packSearchTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

function normQ(q: string): string {
  return q.trim().toLowerCase();
}

function pickTranslationPl(embed: unknown): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return embed[0]?.translation_pl ?? null;
  }
  if (typeof embed === "object" && embed !== null && "translation_pl" in embed) {
    const v = (embed as { translation_pl?: string }).translation_pl;
    return typeof v === "string" ? v : null;
  }
  return null;
}

/**
 * Autocomplete relevance: lower score = higher in the list.
 * Lemma matches outrank PL translation; exact/prefix outrank substring (ilike) matches.
 */
function lexiconSenseMatchScore(lemmaNorm: string, translationPl: string | null, q: string): number {
  const l = lemmaNorm.toLowerCase();
  const qn = q.toLowerCase();
  const t = (translationPl ?? "").toLowerCase().trim();

  if (l === qn) return 1;
  if (l.startsWith(qn)) return 2;
  if (t === qn) return 3;
  if (qn.length > 0 && t.startsWith(qn)) return 4;
  if (l.includes(qn)) return 5;
  if (t.includes(qn)) return 6;
  return 7;
}

/** Raw hit while gathering lemma + translation branches (internal ranking only). */
type LexiconSenseSearchCollected = {
  sense_id: string;
  entry_id: string;
  lemma: string;
  lemma_norm: string;
  pos: string;
  translation_pl: string | null;
  definition_en: string;
};

/**
 * Deduplicate by sense_id, rank match quality, cap at 20.
 * Each row is one lexicon sense — same UI / autocomplete row model.
 */
function mergeLexiconSenseSearchRows(
  rows: LexiconSenseSearchCollected[],
  q: string,
): LexiconSenseSearchCollected[] {
  const bySense = new Map<string, LexiconSenseSearchCollected>();
  for (const r of rows) {
    const prev = bySense.get(r.sense_id);
    if (!prev) {
      bySense.set(r.sense_id, r);
    } else {
      const sr = lexiconSenseMatchScore(r.lemma_norm, r.translation_pl, q);
      const sp = lexiconSenseMatchScore(prev.lemma_norm, prev.translation_pl, q);
      const winner =
        sr < sp || (sr === sp && r.lemma_norm.localeCompare(prev.lemma_norm, "pl") < 0) ? r : prev;
      bySense.set(r.sense_id, winner);
    }
  }

  const sorted = [...bySense.values()].sort((a, b) => {
    const ra = lexiconSenseMatchScore(a.lemma_norm, a.translation_pl, q);
    const rb = lexiconSenseMatchScore(b.lemma_norm, b.translation_pl, q);
    if (ra !== rb) return ra - rb;
    const lemmaCmp = a.lemma_norm.localeCompare(b.lemma_norm, "pl");
    if (lemmaCmp !== 0) return lemmaCmp;
    return a.sense_id.localeCompare(b.sense_id);
  });

  return sorted.slice(0, 20);
}

/** One example_en per sense_id (earliest created_at), for search result hydration. */
async function attachFirstExampleEn(
  supabase: SupabaseClient,
  hits: LexiconSenseSearchCollected[],
): Promise<LexiconSearchRow[]> {
  const senseIds = [...new Set(hits.map((h) => h.sense_id))];
  const exampleBySense = new Map<string, string>();

  if (senseIds.length > 0) {
    const { data: examples, error } = await supabase
      .from("lexicon_examples")
      .select("sense_id, example_en, created_at")
      .in("sense_id", senseIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[vocab/search] examples batch", error);
    } else {
      for (const row of examples ?? []) {
        const sid = row.sense_id as string;
        const ex = typeof row.example_en === "string" ? row.example_en.trim() : "";
        if (!exampleBySense.has(sid) && ex) {
          exampleBySense.set(sid, ex);
        }
      }
    }
  }

  return hits.map((h) => ({
    sense_id: h.sense_id,
    entry_id: h.entry_id,
    lemma: h.lemma,
    pos: h.pos,
    translation_pl: h.translation_pl,
    definition_en: h.definition_en,
    example_en: exampleBySense.get(h.sense_id) ?? null,
  }));
}

/**
 * GET /api/vocab/search?q=
 * Lexicon-wide search: each result is one lexicon sense (for sense-first autocomplete). Auth: Bearer JWT.
 */
export async function GET(req: Request) {
  try {
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

    const url = new URL(req.url);
    const qRaw = (url.searchParams.get("q") ?? "").toString();
    const q = normQ(qRaw);

    if (q.length < 2) {
      return NextResponse.json({ results: [] as LexiconSearchRow[] });
    }

    const pattern = `%${q}%`;
    const collected: LexiconSenseSearchCollected[] = [];

    const { data: lemmaHits, error: lemmaErr } = await supabase
      .from("lexicon_entries")
      .select(
        `
        id,
        lemma,
        lemma_norm,
        pos,
        lexicon_senses!inner(
          id,
          definition_en,
          lexicon_translations(translation_pl)
        )
      `,
      )
      .ilike("lemma_norm", pattern)
      .limit(80);

    if (lemmaErr) {
      console.error("[vocab/search] lemma query", lemmaErr);
      return NextResponse.json({ error: lemmaErr.message }, { status: 500 });
    }

    for (const entry of lemmaHits ?? []) {
      const sensesRaw = entry.lexicon_senses;
      const sensesList = Array.isArray(sensesRaw) ? sensesRaw : sensesRaw ? [sensesRaw] : [];
      for (const sense of sensesList) {
        collected.push({
          sense_id: sense.id as string,
          entry_id: entry.id as string,
          lemma: entry.lemma as string,
          lemma_norm: String(entry.lemma_norm ?? entry.lemma ?? "").toLowerCase(),
          pos: entry.pos as string,
          translation_pl: pickTranslationPl(
            (sense as { lexicon_translations?: unknown }).lexicon_translations,
          ),
          definition_en: String((sense as { definition_en?: string }).definition_en ?? ""),
        });
      }
    }

    const { data: transHits, error: transErr } = await supabase
      .from("lexicon_translations")
      .select(
        `
        translation_pl,
        lexicon_senses!inner(
          id,
          definition_en,
          lexicon_entries!inner(id, lemma, lemma_norm, pos),
          lexicon_translations(translation_pl)
        )
      `,
      )
      .ilike("translation_pl", pattern)
      .limit(80);

    if (transErr) {
      console.error("[vocab/search] translation query", transErr);
      return NextResponse.json({ error: transErr.message }, { status: 500 });
    }

    for (const row of transHits ?? []) {
      const senseRaw = row.lexicon_senses;
      const sense = Array.isArray(senseRaw) ? senseRaw[0] : senseRaw;
      if (!sense) continue;

      const entryRaw = (sense as { lexicon_entries?: unknown }).lexicon_entries;
      const entry = Array.isArray(entryRaw) ? entryRaw[0] : entryRaw;
      if (!entry || typeof entry !== "object") continue;

      const e = entry as { id: string; lemma: string; lemma_norm: string; pos: string };

      collected.push({
        sense_id: sense.id as string,
        entry_id: e.id,
        lemma: e.lemma,
        lemma_norm: String(e.lemma_norm ?? e.lemma ?? "").toLowerCase(),
        pos: e.pos,
        translation_pl:
          pickTranslationPl((sense as { lexicon_translations?: unknown }).lexicon_translations) ??
          (typeof row.translation_pl === "string" ? row.translation_pl : null),
        definition_en: String((sense as { definition_en?: string }).definition_en ?? ""),
      });
    }

    const merged = mergeLexiconSenseSearchRows(collected, q);
    const results = await attachFirstExampleEn(supabase, merged);

    return NextResponse.json({ results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
