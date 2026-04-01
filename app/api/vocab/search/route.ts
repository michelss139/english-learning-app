import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { VocabPackSearchRow } from "@/lib/vocab/packSearchTypes";

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

type PackEmbed = { title?: string; is_published?: boolean };
type VpiEmbed = { vocab_packs?: PackEmbed | PackEmbed[] };

/** 1 = best: exact lemma → starts → contains → translation-only style match */
function matchRank(lemmaNorm: string, translationPl: string | null, q: string): number {
  const l = lemmaNorm.toLowerCase();
  const qn = q.toLowerCase();
  if (l === qn) return 1;
  if (l.startsWith(qn)) return 2;
  if (l.includes(qn)) return 3;
  const t = (translationPl ?? "").toLowerCase();
  if (t.includes(qn)) return 4;
  return 5;
}

type CollectedRow = VocabPackSearchRow & { lemma_norm: string };

function pickPackTitle(rows: unknown): string {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const titles = rows
    .flatMap((vpi) => {
      const packs = (vpi as VpiEmbed)?.vocab_packs;
      const pack = Array.isArray(packs) ? packs[0] : packs;
      return pack?.title ? [String(pack.title)] : [];
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pl"));
  return titles[0] ?? "";
}

/** Dedupe by sense_id; rank by match quality; pick lexicographically smallest pack_title for ties */
function mergeSearchRows(rows: CollectedRow[], q: string): VocabPackSearchRow[] {
  const bySense = new Map<string, CollectedRow>();
  for (const r of rows) {
    const prev = bySense.get(r.sense_id);
    if (!prev) {
      bySense.set(r.sense_id, r);
    } else {
      const title = [prev.pack_title, r.pack_title].filter(Boolean).sort((a, b) => a.localeCompare(b, "pl"))[0];
      bySense.set(r.sense_id, { ...prev, pack_title: title });
    }
  }

  const sorted = [...bySense.values()].sort((a, b) => {
    const ra = matchRank(a.lemma_norm, a.translation_pl, q);
    const rb = matchRank(b.lemma_norm, b.translation_pl, q);
    if (ra !== rb) return ra - rb;
    const lemmaCmp = a.lemma_norm.localeCompare(b.lemma_norm, "pl");
    if (lemmaCmp !== 0) return lemmaCmp;
    return a.sense_id.localeCompare(b.sense_id);
  });

  return sorted.slice(0, 12).map((row) => ({
    sense_id: row.sense_id,
    entry_id: row.entry_id,
    lemma: row.lemma,
    pos: row.pos,
    translation_pl: row.translation_pl,
    definition_en: row.definition_en,
    pack_title: row.pack_title,
  }));
}

/**
 * GET /api/vocab/search?q=
 * Pack-lemma search (published packs only). Auth: Bearer JWT.
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
      return NextResponse.json({ results: [] as VocabPackSearchRow[] });
    }

    const pattern = `%${q}%`;

    const collected: CollectedRow[] = [];

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
          lexicon_translations(translation_pl),
          vocab_pack_items!inner(
            vocab_packs!inner(title, is_published)
          )
        )
      `
      )
      .ilike("lemma_norm", pattern)
      .limit(40);

    if (lemmaErr) {
      console.error("[vocab/search] lemma query", lemmaErr);
      return NextResponse.json({ error: lemmaErr.message }, { status: 500 });
    }

    for (const entry of lemmaHits ?? []) {
      const sensesRaw = entry.lexicon_senses;
      const sensesList = Array.isArray(sensesRaw) ? sensesRaw : sensesRaw ? [sensesRaw] : [];
      for (const sense of sensesList) {
        const vpis = sense.vocab_pack_items;
        const vpiList = Array.isArray(vpis) ? vpis : vpis ? [vpis] : [];
        const published = vpiList.filter((vpi) => {
          const packs = (vpi as VpiEmbed)?.vocab_packs;
          const pack = Array.isArray(packs) ? packs[0] : packs;
          return pack?.is_published === true;
        });
        if (published.length === 0) continue;

        collected.push({
          sense_id: sense.id,
          entry_id: entry.id,
          lemma: entry.lemma,
          lemma_norm: String(entry.lemma_norm ?? entry.lemma ?? "").toLowerCase(),
          pos: entry.pos,
          translation_pl: pickTranslationPl(sense.lexicon_translations),
          definition_en: sense.definition_en ?? "",
          pack_title: pickPackTitle(published),
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
          lexicon_translations(translation_pl),
          vocab_pack_items!inner(
            vocab_packs!inner(title, is_published)
          )
        )
      `
      )
      .ilike("translation_pl", pattern)
      .limit(40);

    if (transErr) {
      console.error("[vocab/search] translation query", transErr);
      return NextResponse.json({ error: transErr.message }, { status: 500 });
    }

    for (const row of transHits ?? []) {
      const senseRaw = row.lexicon_senses;
      const sense = Array.isArray(senseRaw) ? senseRaw[0] : senseRaw;
      if (!sense) continue;

      const entryRaw = sense.lexicon_entries;
      const entry = Array.isArray(entryRaw) ? entryRaw[0] : entryRaw;
      if (!entry) continue;

      const vpis = sense.vocab_pack_items;
      const vpiList = Array.isArray(vpis) ? vpis : vpis ? [vpis] : [];
      const published = vpiList.filter((vpi) => {
        const packs = (vpi as VpiEmbed)?.vocab_packs;
        const pack = Array.isArray(packs) ? packs[0] : packs;
        return pack?.is_published === true;
      });
      if (published.length === 0) continue;

      collected.push({
        sense_id: sense.id,
        entry_id: entry.id,
        lemma: entry.lemma,
        lemma_norm: String(entry.lemma_norm ?? entry.lemma ?? "").toLowerCase(),
        pos: entry.pos,
        translation_pl: pickTranslationPl(sense.lexicon_translations) ?? row.translation_pl ?? null,
        definition_en: sense.definition_en ?? "",
        pack_title: pickPackTitle(published),
      });
    }

    const results = mergeSearchRows(collected, q);

    return NextResponse.json({ results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
