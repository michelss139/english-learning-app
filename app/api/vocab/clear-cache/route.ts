/**
 * POST /api/vocab/clear-cache
 * 
 * Clear cache for a specific word (for development/testing)
 * Requires admin/service role (or add auth check)
 */

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  lemma: string;
};

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseAdmin();

    const body = (await req.json().catch(() => null)) as Body | null;
    const lemma = (body?.lemma ?? "").toString().trim().toLowerCase();

    if (!lemma) {
      return NextResponse.json({ error: "lemma is required" }, { status: 400 });
    }

    // Find all entries for this lemma
    const { data: entries, error: entriesErr } = await supabase
      .from("lexicon_entries")
      .select("id")
      .eq("lemma_norm", lemma);

    if (entriesErr) {
      return NextResponse.json({ error: `Failed to fetch entries: ${entriesErr.message}` }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ ok: true, message: `No entries found for '${lemma}'` });
    }

    const entryIds = entries.map((e) => e.id);

    // Delete senses (cascade will handle translations and examples)
    const { error: sensesErr } = await supabase
      .from("lexicon_senses")
      .delete()
      .in("entry_id", entryIds);

    if (sensesErr) {
      return NextResponse.json({ error: `Failed to delete senses: ${sensesErr.message}` }, { status: 500 });
    }

    // Delete verb forms
    const { error: verbFormsErr } = await supabase
      .from("lexicon_verb_forms")
      .delete()
      .in("entry_id", entryIds);

    if (verbFormsErr) {
      return NextResponse.json({ error: `Failed to delete verb forms: ${verbFormsErr.message}` }, { status: 500 });
    }

    // Delete entries
    const { error: entriesDeleteErr } = await supabase
      .from("lexicon_entries")
      .delete()
      .in("id", entryIds);

    if (entriesDeleteErr) {
      return NextResponse.json({ error: `Failed to delete entries: ${entriesDeleteErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully removed ${entries.length} entry/entries for '${lemma}'`,
    });
  } catch (e: any) {
    console.error("[clear-cache] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
