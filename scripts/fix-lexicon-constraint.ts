/**
 * Script to fix lexicon_entries unique constraint and remove cache for "work"
 * Run with: npx tsx scripts/fix-lexicon-constraint.ts
 */

import { createSupabaseAdmin } from "../lib/supabase/admin";

async function main() {
  const supabase = createSupabaseAdmin();

  console.log("1. Running migration to update unique constraint...");

  // Drop old unique constraint
  const { error: dropErr } = await supabase.rpc("exec_sql", {
    sql: `
      alter table if exists lexicon_entries drop constraint if exists lexicon_entries_lemma_norm_unique;
    `,
  });

  if (dropErr) {
    // Try direct SQL execution
    console.log("Trying alternative method...");
    const { error: altErr } = await supabase
      .from("lexicon_entries")
      .select("id")
      .limit(1);

    if (altErr) {
      console.error("Cannot connect to Supabase. Please run the migration manually in Supabase SQL Editor:");
      console.log(`
-- Run this in Supabase SQL Editor:

-- Drop old unique constraint
alter table if exists lexicon_entries drop constraint if exists lexicon_entries_lemma_norm_unique;

-- Add new unique constraint on (lemma_norm, pos)
alter table if exists lexicon_entries 
  add constraint lexicon_entries_lemma_norm_pos_unique unique (lemma_norm, pos);

-- Update index
drop index if exists idx_lexicon_entries_lemma_norm;
create index if not exists idx_lexicon_entries_lemma_norm_pos on lexicon_entries(lemma_norm, pos);
      `);
      process.exit(1);
    }
  }

  // Since we can't easily run DDL through Supabase client, we'll just delete cache for "work"
  console.log("2. Removing cache for 'work'...");

  const lemma_norm = "work";

  // Find all entries for "work"
  const { data: entries, error: entriesErr } = await supabase
    .from("lexicon_entries")
    .select("id")
    .eq("lemma_norm", lemma_norm);

  if (entriesErr) {
    console.error("Error fetching entries:", entriesErr);
    process.exit(1);
  }

  if (!entries || entries.length === 0) {
    console.log("No entries found for 'work'. Nothing to delete.");
    return;
  }

  const entryIds = entries.map((e) => e.id);

  // Delete senses (cascade will handle translations and examples)
  const { error: sensesErr } = await supabase
    .from("lexicon_senses")
    .delete()
    .in("entry_id", entryIds);

  if (sensesErr) {
    console.error("Error deleting senses:", sensesErr);
    process.exit(1);
  }

  // Delete verb forms
  const { error: verbFormsErr } = await supabase
    .from("lexicon_verb_forms")
    .delete()
    .in("entry_id", entryIds);

  if (verbFormsErr) {
    console.error("Error deleting verb forms:", verbFormsErr);
    process.exit(1);
  }

  // Delete entries
  const { error: entriesDeleteErr } = await supabase
    .from("lexicon_entries")
    .delete()
    .in("id", entryIds);

  if (entriesDeleteErr) {
    console.error("Error deleting entries:", entriesDeleteErr);
    process.exit(1);
  }

  console.log(`✅ Successfully removed ${entries.length} entry/entries for 'work'`);
  console.log("\n⚠️  IMPORTANT: You still need to run the migration SQL manually in Supabase SQL Editor:");
  console.log(`
-- Run this in Supabase SQL Editor:

-- Drop old unique constraint
alter table if exists lexicon_entries drop constraint if exists lexicon_entries_lemma_norm_unique;

-- Add new unique constraint on (lemma_norm, pos)
alter table if exists lexicon_entries 
  add constraint lexicon_entries_lemma_norm_pos_unique unique (lemma_norm, pos);

-- Update index
drop index if exists idx_lexicon_entries_lemma_norm;
create index if not exists idx_lexicon_entries_lemma_norm_pos on lexicon_entries(lemma_norm, pos);
  `);
}

main().catch(console.error);
