/**
 * POST /api/vocab/run-migration
 * 
 * Run migration to update lexicon_entries unique constraint
 * This requires service role permissions
 */

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseAdmin();

    // Try to execute migration SQL
    // Note: Supabase JS client doesn't support DDL directly, but we can try using RPC
    // If that doesn't work, we'll need to run it manually in SQL Editor

    const migrationSQL = `
      -- Drop old unique constraint
      alter table if exists lexicon_entries drop constraint if exists lexicon_entries_lemma_norm_unique;

      -- Add new unique constraint on (lemma_norm, pos)
      alter table if exists lexicon_entries 
        add constraint lexicon_entries_lemma_norm_pos_unique unique (lemma_norm, pos);

      -- Update index
      drop index if exists idx_lexicon_entries_lemma_norm;
      create index if not exists idx_lexicon_entries_lemma_norm_pos on lexicon_entries(lemma_norm, pos);
    `;

    // Try to execute via RPC (if pg_execute function exists)
    // Otherwise, we'll need to check if constraint already exists
    const { data: checkData, error: checkError } = await supabase
      .from("lexicon_entries")
      .select("id")
      .limit(1);

    if (checkError) {
      return NextResponse.json(
        { error: `Cannot connect to database: ${checkError.message}` },
        { status: 500 }
      );
    }

    // Check if new constraint exists by trying to insert duplicate (lemma_norm, pos)
    // This is a workaround - we can't execute DDL directly through JS client
    // The migration must be run manually in Supabase SQL Editor

    return NextResponse.json({
      ok: true,
      message: "Migration SQL must be run manually in Supabase SQL Editor",
      sql: migrationSQL,
      instructions: [
        "1. Go to Supabase Dashboard → SQL Editor",
        "2. Create a new query",
        "3. Paste the SQL from the 'sql' field above",
        "4. Run the query",
      ],
    });
  } catch (e: any) {
    console.error("[run-migration] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
