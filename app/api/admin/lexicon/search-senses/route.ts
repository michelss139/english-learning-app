import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserIdFromApiRequest } from "@/lib/auth/adminApiAuth";

type SearchSenseRow = {
  sense_id: string;
  lemma: string;
  pos: string;
  translation_pl: string | null;
  definition_en: string;
  sense_order: number;
};

function normQ(q: string): string {
  return q.trim().toLowerCase();
}

function pickTranslationPl(embed: unknown): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return embed[0]?.translation_pl ?? null;
  }
  if (typeof embed === "object" && embed !== null && "translation_pl" in embed) {
    const value = (embed as { translation_pl?: string }).translation_pl;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function dedupeAndSort(rows: SearchSenseRow[]): SearchSenseRow[] {
  const bySense = new Map<string, SearchSenseRow>();

  for (const row of rows) {
    if (!row.sense_id || !row.lemma || !row.definition_en) continue;
    if (!bySense.has(row.sense_id)) {
      bySense.set(row.sense_id, row);
    }
  }

  return [...bySense.values()]
    .sort((a, b) => {
      const lemmaCmp = a.lemma.localeCompare(b.lemma, "en");
      if (lemmaCmp !== 0) return lemmaCmp;
      return a.sense_order - b.sense_order;
    })
    .slice(0, 20);
}

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseAdmin();

    const userId = await getUserIdFromApiRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized — sign in or send Authorization: Bearer <token>" },
        { status: 401 }
      );
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profErr || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const q = normQ(url.searchParams.get("q") ?? "");

    if (!q) {
      return NextResponse.json([]);
    }

    const lemmaExactRows: SearchSenseRow[] = [];
    const translationExactRows: SearchSenseRow[] = [];
    const lemmaPrefixRows: SearchSenseRow[] = [];
    const translationPrefixRows: SearchSenseRow[] = [];
    const substringRows: SearchSenseRow[] = [];

    const { data: lemmaExact, error: lemmaExactErr } = await supabase
      .from("lexicon_entries")
      .select(
        `
        lemma,
        pos,
        lexicon_senses!inner(
          id,
          definition_en,
          sense_order,
          lexicon_translations(translation_pl)
        )
      `
      )
      .eq("lemma_norm", q)
      .limit(50);

    if (lemmaExactErr) {
      return NextResponse.json({ error: lemmaExactErr.message }, { status: 500 });
    }

    for (const entry of lemmaExact ?? []) {
      const sensesRaw = entry.lexicon_senses;
      const senses = Array.isArray(sensesRaw) ? sensesRaw : sensesRaw ? [sensesRaw] : [];
      for (const sense of senses) {
        const definition_en = String((sense as { definition_en?: string }).definition_en ?? "").trim();
        if (!definition_en) continue;
        lemmaExactRows.push({
          sense_id: String((sense as { id?: string }).id ?? ""),
          lemma: String(entry.lemma ?? ""),
          pos: String(entry.pos ?? ""),
          translation_pl: pickTranslationPl((sense as { lexicon_translations?: unknown }).lexicon_translations),
          definition_en,
          sense_order: Number((sense as { sense_order?: number }).sense_order ?? 0),
        });
      }
    }

    const { data: translationExact, error: translationExactErr } = await supabase
      .from("lexicon_translations")
      .select(
        `
        translation_pl,
        lexicon_senses!inner(
          id,
          definition_en,
          sense_order,
          lexicon_entries!inner(lemma, pos)
        )
      `
      )
      .eq("translation_pl", q)
      .limit(50);

    if (translationExactErr) {
      return NextResponse.json({ error: translationExactErr.message }, { status: 500 });
    }

    for (const row of translationExact ?? []) {
      const senseRaw = row.lexicon_senses;
      const sense = Array.isArray(senseRaw) ? senseRaw[0] : senseRaw;
      if (!sense) continue;
      const entryRaw = (sense as { lexicon_entries?: unknown }).lexicon_entries;
      const entry = Array.isArray(entryRaw) ? entryRaw[0] : entryRaw;
      const definition_en = String((sense as { definition_en?: string }).definition_en ?? "").trim();
      if (!entry || typeof entry !== "object" || !definition_en) continue;

      translationExactRows.push({
        sense_id: String((sense as { id?: string }).id ?? ""),
        lemma: String((entry as { lemma?: string }).lemma ?? ""),
        pos: String((entry as { pos?: string }).pos ?? ""),
        translation_pl: typeof row.translation_pl === "string" ? row.translation_pl : null,
        definition_en,
        sense_order: Number((sense as { sense_order?: number }).sense_order ?? 0),
      });
    }

    const { data: lemmaPrefix, error: lemmaPrefixErr } = await supabase
      .from("lexicon_entries")
      .select(
        `
        lemma,
        lemma_norm,
        pos,
        lexicon_senses!inner(
          id,
          definition_en,
          sense_order,
          lexicon_translations(translation_pl)
        )
      `
      )
      .ilike("lemma_norm", `${q}%`)
      .limit(50);

    if (lemmaPrefixErr) {
      return NextResponse.json({ error: lemmaPrefixErr.message }, { status: 500 });
    }

    for (const entry of lemmaPrefix ?? []) {
      const lemmaNorm = String(entry.lemma_norm ?? "").toLowerCase();
      if (lemmaNorm === q) continue;
      const sensesRaw = entry.lexicon_senses;
      const senses = Array.isArray(sensesRaw) ? sensesRaw : sensesRaw ? [sensesRaw] : [];
      for (const sense of senses) {
        const definition_en = String((sense as { definition_en?: string }).definition_en ?? "").trim();
        if (!definition_en) continue;
        lemmaPrefixRows.push({
          sense_id: String((sense as { id?: string }).id ?? ""),
          lemma: String(entry.lemma ?? ""),
          pos: String(entry.pos ?? ""),
          translation_pl: pickTranslationPl((sense as { lexicon_translations?: unknown }).lexicon_translations),
          definition_en,
          sense_order: Number((sense as { sense_order?: number }).sense_order ?? 0),
        });
      }
    }

    const { data: translationPrefix, error: translationPrefixErr } = await supabase
      .from("lexicon_translations")
      .select(
        `
        translation_pl,
        lexicon_senses!inner(
          id,
          definition_en,
          sense_order,
          lexicon_entries!inner(lemma, pos)
        )
      `
      )
      .ilike("translation_pl", `${q}%`)
      .limit(50);

    if (translationPrefixErr) {
      return NextResponse.json({ error: translationPrefixErr.message }, { status: 500 });
    }

    for (const row of translationPrefix ?? []) {
      if (typeof row.translation_pl === "string" && row.translation_pl.trim().toLowerCase() === q) continue;
      const senseRaw = row.lexicon_senses;
      const sense = Array.isArray(senseRaw) ? senseRaw[0] : senseRaw;
      if (!sense) continue;
      const entryRaw = (sense as { lexicon_entries?: unknown }).lexicon_entries;
      const entry = Array.isArray(entryRaw) ? entryRaw[0] : entryRaw;
      const definition_en = String((sense as { definition_en?: string }).definition_en ?? "").trim();
      if (!entry || typeof entry !== "object" || !definition_en) continue;

      translationPrefixRows.push({
        sense_id: String((sense as { id?: string }).id ?? ""),
        lemma: String((entry as { lemma?: string }).lemma ?? ""),
        pos: String((entry as { pos?: string }).pos ?? ""),
        translation_pl: typeof row.translation_pl === "string" ? row.translation_pl : null,
        definition_en,
        sense_order: Number((sense as { sense_order?: number }).sense_order ?? 0),
      });
    }

    const rankedRows = [
      ...dedupeAndSort(lemmaExactRows),
      ...dedupeAndSort(translationExactRows),
      ...dedupeAndSort(lemmaPrefixRows),
      ...dedupeAndSort(translationPrefixRows),
    ];

    const highPriorityRows = dedupeAndSort(rankedRows);
    if (highPriorityRows.length > 0) {
      return NextResponse.json(highPriorityRows.slice(0, 20));
    }

    const substringPattern = `%${q}%`;

    const { data: lemmaSubstring, error: lemmaSubstringErr } = await supabase
      .from("lexicon_entries")
      .select(
        `
        lemma,
        pos,
        lexicon_senses!inner(
          id,
          definition_en,
          sense_order,
          lexicon_translations(translation_pl)
        )
      `
      )
      .ilike("lemma_norm", substringPattern)
      .limit(80);

    if (lemmaSubstringErr) {
      return NextResponse.json({ error: lemmaSubstringErr.message }, { status: 500 });
    }

    for (const entry of lemmaSubstring ?? []) {
      const sensesRaw = entry.lexicon_senses;
      const senses = Array.isArray(sensesRaw) ? sensesRaw : sensesRaw ? [sensesRaw] : [];
      for (const sense of senses) {
        const definition_en = String((sense as { definition_en?: string }).definition_en ?? "").trim();
        if (!definition_en) continue;
        substringRows.push({
          sense_id: String((sense as { id?: string }).id ?? ""),
          lemma: String(entry.lemma ?? ""),
          pos: String(entry.pos ?? ""),
          translation_pl: pickTranslationPl((sense as { lexicon_translations?: unknown }).lexicon_translations),
          definition_en,
          sense_order: Number((sense as { sense_order?: number }).sense_order ?? 0),
        });
      }
    }

    const { data: translationSubstring, error: translationSubstringErr } = await supabase
      .from("lexicon_translations")
      .select(
        `
        translation_pl,
        lexicon_senses!inner(
          id,
          definition_en,
          sense_order,
          lexicon_entries!inner(lemma, pos)
        )
      `
      )
      .ilike("translation_pl", substringPattern)
      .limit(80);

    if (translationSubstringErr) {
      return NextResponse.json({ error: translationSubstringErr.message }, { status: 500 });
    }

    for (const row of translationSubstring ?? []) {
      const senseRaw = row.lexicon_senses;
      const sense = Array.isArray(senseRaw) ? senseRaw[0] : senseRaw;
      if (!sense) continue;
      const entryRaw = (sense as { lexicon_entries?: unknown }).lexicon_entries;
      const entry = Array.isArray(entryRaw) ? entryRaw[0] : entryRaw;
      const definition_en = String((sense as { definition_en?: string }).definition_en ?? "").trim();
      if (!entry || typeof entry !== "object" || !definition_en) continue;

      substringRows.push({
        sense_id: String((sense as { id?: string }).id ?? ""),
        lemma: String((entry as { lemma?: string }).lemma ?? ""),
        pos: String((entry as { pos?: string }).pos ?? ""),
        translation_pl: typeof row.translation_pl === "string" ? row.translation_pl : null,
        definition_en,
        sense_order: Number((sense as { sense_order?: number }).sense_order ?? 0),
      });
    }

    return NextResponse.json(dedupeAndSort(substringRows));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
