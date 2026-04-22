import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserIdFromApiRequest } from "@/lib/auth/adminApiAuth";
import { importLexiconBatch } from "@/lib/lexicon/importLexiconBatch";
import { analyzePackWordsAgainstLexicon, normalizeWordsInput, type ReadyPackLemma } from "@/lib/vocab/packBuilder";

type BuildBody = {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  vocab_mode?: unknown;
  category?: unknown;
  display_title?: unknown;
  display_section?: unknown;
  display_subsection?: unknown;
  is_published?: unknown;
  words?: unknown;
  create_missing?: unknown;
  update_existing_pack?: unknown;
};

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseAdmin();

    const userId = await getUserIdFromApiRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: BuildBody;
    try {
      body = (await req.json()) as BuildBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const vocabMode = body.vocab_mode === "daily" || body.vocab_mode === "precise" ? body.vocab_mode : null;
    const isPublished = typeof body.is_published === "boolean" ? body.is_published : null;
    const createMissing = body.create_missing !== false;
    const updateExistingPack = body.update_existing_pack === true;
    const description = optionalText(body.description);
    const category = optionalText(body.category) ?? "general";
    const displayTitle = optionalText(body.display_title);
    const displaySection = optionalText(body.display_section);
    const displaySubsection = optionalText(body.display_subsection);

    if (!title) {
      return NextResponse.json({ error: '"title" is required' }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json({ error: '"slug" is required' }, { status: 400 });
    }
    if (!vocabMode) {
      return NextResponse.json({ error: '"vocab_mode" must be "daily" or "precise"' }, { status: 400 });
    }
    if (isPublished === null) {
      return NextResponse.json({ error: '"is_published" must be a boolean' }, { status: 400 });
    }

    const normalizedWords = normalizeWordsInput(body.words);
    if (!normalizedWords) {
      return NextResponse.json({ error: '"words" must be an array of strings' }, { status: 400 });
    }
    if (normalizedWords.normalized.length === 0) {
      return NextResponse.json({ error: 'At least one valid word is required in "words"' }, { status: 400 });
    }

    const { data: existingPack, error: packFindError } = await supabase
      .from("vocab_packs")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (packFindError) {
      return NextResponse.json({ error: packFindError.message }, { status: 500 });
    }

    let packId = "";
    let createdPack = false;
    let updatedPack = false;

    const packPayload = {
      slug,
      title,
      description,
      vocab_mode: vocabMode,
      category,
      display_title: displayTitle,
      display_section: displaySection,
      display_subsection: displaySubsection,
      is_published: isPublished,
    };

    if (existingPack) {
      if (!updateExistingPack) {
        return NextResponse.json(
          { error: "Pack slug already exists. Set update_existing_pack=true to update metadata and append items." },
          { status: 400 }
        );
      }

      packId = existingPack.id;
      const { error: updateError } = await supabase.from("vocab_packs").update(packPayload).eq("id", packId);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      updatedPack = true;
    } else {
      const { data: insertedPack, error: insertError } = await supabase
        .from("vocab_packs")
        .insert({
          ...packPayload,
          order_index: 0,
        })
        .select("id")
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      packId = insertedPack.id;
      createdPack = true;
    }

    const failed: Array<{ word: string; reason: string }> = [];
    const usedExisting: string[] = [];
    const createdLexicon: string[] = [];
    const skippedExistingPackItems: string[] = [];

    const initialAnalysis = await analyzePackWordsAgainstLexicon(supabase, normalizedWords.normalized);

    for (const row of initialAnalysis.ambiguous) {
      failed.push({ word: row.word, reason: row.reason });
    }

    let allReady: ReadyPackLemma[] = [...initialAnalysis.ready];

    if (initialAnalysis.missing.length > 0 && createMissing) {
      const importResult = await importLexiconBatch(supabase, initialAnalysis.missing, { mode: "core" });
      createdLexicon.push(...importResult.created);
      failed.push(...importResult.failed.map((item) => ({ word: item.word, reason: item.error })));

      const recheckWords = uniqueStrings(importResult.created);
      if (recheckWords.length > 0) {
        const postImportAnalysis = await analyzePackWordsAgainstLexicon(supabase, recheckWords);
        allReady = [...allReady, ...postImportAnalysis.ready];

        for (const row of postImportAnalysis.ambiguous) {
          failed.push({ word: row.word, reason: `ambiguous_after_import:${row.reason}` });
        }
        for (const word of postImportAnalysis.missing) {
          failed.push({ word, reason: "missing_after_import" });
        }
      }
    } else {
      for (const word of initialAnalysis.missing) {
        failed.push({ word, reason: createMissing ? "missing_unresolved" : "missing_in_lexicon" });
      }
    }

    const readyByWord = new Map(allReady.map((row) => [row.word, row]));
    const orderedCandidates = normalizedWords.normalized
      .map((word, index) => {
        const ready = readyByWord.get(word);
        if (!ready) return null;
        return {
          ...ready,
          input_order_index: index,
        };
      })
      .filter((row): row is ReadyPackLemma & { input_order_index: number } => row !== null);

    const candidateSenseIds = orderedCandidates.map((row) => row.sense_id);
    let existingSenseIds = new Set<string>();

    if (candidateSenseIds.length > 0) {
      const { data: existingItems, error: existingItemsError } = await supabase
        .from("vocab_pack_items")
        .select("sense_id")
        .eq("pack_id", packId)
        .in("sense_id", candidateSenseIds);

      if (existingItemsError) {
        return NextResponse.json({ error: existingItemsError.message }, { status: 500 });
      }

      existingSenseIds = new Set((existingItems ?? []).map((row) => String(row.sense_id ?? "")).filter(Boolean));
    }

    const itemsToInsert: Array<{ pack_id: string; sense_id: string; order_index: number }> = [];
    for (const candidate of orderedCandidates) {
      if (existingSenseIds.has(candidate.sense_id)) {
        skippedExistingPackItems.push(candidate.word);
        continue;
      }

      itemsToInsert.push({
        pack_id: packId,
        sense_id: candidate.sense_id,
        order_index: candidate.input_order_index,
      });

      if (createdLexicon.includes(candidate.word)) {
        continue;
      }
      usedExisting.push(candidate.word);
    }

    if (itemsToInsert.length > 0) {
      const { error: insertItemsError } = await supabase.from("vocab_pack_items").insert(itemsToInsert);
      if (insertItemsError) {
        return NextResponse.json({ error: insertItemsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      pack_id: packId,
      slug,
      created_pack: createdPack,
      updated_pack: updatedPack,
      items_added: itemsToInsert.length,
      used_existing: uniqueStrings(usedExisting),
      created_lexicon: uniqueStrings(createdLexicon),
      skipped_existing_pack_items: uniqueStrings(skippedExistingPackItems),
      failed,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
