/**
 * GET /api/vocab/check-migration
 * 
 * Check if migration has been run (by trying to detect the new constraint)
 */

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseAdmin();

    // Try to insert two entries with same lemma_norm but different pos
    // If this works, migration has been run
    const testLemma = "test_migration_check_" + Date.now();
    const testLemmaNorm = testLemma.toLowerCase();

    // Try to insert first entry
    const { data: entry1, error: insert1Err } = await supabase
      .from("lexicon_entries")
      .insert({
        lemma: testLemma,
        lemma_norm: testLemmaNorm,
        pos: "noun",
      })
      .select("id")
      .single();

    if (insert1Err) {
      // Check if it's a unique constraint error (old constraint)
      if (String(insert1Err.message).includes("unique constraint") || 
          String(insert1Err.message).includes("duplicate key")) {
        return NextResponse.json({
          ok: false,
          migrationRun: false,
          message: "Old unique constraint still exists. Migration needs to be run.",
          error: insert1Err.message,
        });
      }
      return NextResponse.json({
        ok: false,
        error: insert1Err.message,
      }, { status: 500 });
    }

    // Try to insert second entry with same lemma_norm but different pos
    const { data: entry2, error: insert2Err } = await supabase
      .from("lexicon_entries")
      .insert({
        lemma: testLemma,
        lemma_norm: testLemmaNorm,
        pos: "verb",
      })
      .select("id")
      .single();

    // Clean up test entries
    if (entry1) {
      await supabase.from("lexicon_entries").delete().eq("id", entry1.id);
    }
    if (entry2) {
      await supabase.from("lexicon_entries").delete().eq("id", entry2.id);
    }

    if (insert2Err) {
      // If second insert fails with unique constraint, old constraint still exists
      if (String(insert2Err.message).includes("unique constraint") || 
          String(insert2Err.message).includes("duplicate key")) {
        return NextResponse.json({
          ok: false,
          migrationRun: false,
          message: "Old unique constraint still exists. Migration needs to be run.",
          error: insert2Err.message,
        });
      }
      return NextResponse.json({
        ok: false,
        error: insert2Err.message,
      }, { status: 500 });
    }

    // If both inserts succeeded, migration has been run
    return NextResponse.json({
      ok: true,
      migrationRun: true,
      message: "Migration has been run successfully. Multiple POS per lemma is supported.",
    });
  } catch (e: any) {
    console.error("[check-migration] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
