/**
 * Creates vocab_packs for phrasal verbs, randomly grouped into sets of 20.
 *
 * Reads phrasal verb entries from lexicon_entries (pos='verb', domain='verbs:phrasal'),
 * shuffles them randomly, and seeds vocab_packs + vocab_pack_items.
 *
 * Usage:
 *   npx tsx scripts/seed-phrasal-verb-packs.ts
 *   npx tsx scripts/seed-phrasal-verb-packs.ts --dry-run
 *   npx tsx scripts/seed-phrasal-verb-packs.ts --group-size=15
 */

import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { sleep, requiredEnv } from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const DEFAULT_GROUP_SIZE = 20;
const CATEGORY = "phrasal_verbs";
const VOCAB_MODE = "daily";

// ─── CLI args ─────────────────────────────────────────────────────────────────

type Args = { dryRun: boolean; groupSize: number };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const rawSize = argv.find((a) => a.startsWith("--group-size="));
  const groupSize = rawSize
    ? (() => {
        const n = Number(rawSize.split("=")[1]);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_GROUP_SIZE;
      })()
    : DEFAULT_GROUP_SIZE;
  return { dryRun: argv.includes("--dry-run"), groupSize };
}

// ─── Shuffle ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Load all phrasal verb senses directly (domain = 'verbs:phrasal')
  const { data: rows, error } = await supabase
    .from("lexicon_senses")
    .select(`id, lexicon_entries!inner(lemma, pos)`)
    .eq("domain", "verbs:phrasal");

  if (error) throw new Error(`lexicon_senses: ${error.message}`);
  if (!rows || rows.length === 0) throw new Error("No phrasal verb senses found (domain='verbs:phrasal')");

  type EntryRef = { lemma: string; pos: string };
  type SenseWithEntry = { id: string; lexicon_entries: EntryRef | EntryRef[] };

  const phrasal: Array<{ lemma: string; sense_id: string }> = [];
  for (const row of rows as SenseWithEntry[]) {
    const entry = Array.isArray(row.lexicon_entries) ? row.lexicon_entries[0] : row.lexicon_entries;
    if (entry?.pos === "verb") {
      phrasal.push({ lemma: entry.lemma, sense_id: row.id });
    }
  }

  if (phrasal.length === 0) throw new Error("No phrasal verb senses found (domain='verbs:phrasal')");

  // Shuffle
  const shuffled = shuffle(phrasal);
  const totalPacks = Math.ceil(shuffled.length / args.groupSize);

  console.log(`\nPhrasal Verb Packs Seeder`);
  console.log(`  phrasal verbs found: ${phrasal.length}`);
  console.log(`  group size:          ${args.groupSize}`);
  console.log(`  packs to create:     ${totalPacks}`);
  if (args.dryRun) console.log(`  DRY RUN — no writes`);
  console.log();

  // Check which packs already exist
  const { data: existingPacks } = await supabase
    .from("vocab_packs")
    .select("slug")
    .eq("category", CATEGORY);

  const existingSlugs = new Set((existingPacks ?? []).map((p: { slug: string }) => p.slug));

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < totalPacks; i++) {
    const partNumber = i + 1;
    const slug = `phrasal-verbs-part-${String(partNumber).padStart(2, "0")}`;
    const title = `Phrasal Verbs – Part ${partNumber}`;
    const items = shuffled.slice(i * args.groupSize, (i + 1) * args.groupSize);

    if (existingSlugs.has(slug)) {
      console.log(`  [skip] ${slug} — already exists`);
      skipped++;
      continue;
    }

    if (args.dryRun) {
      console.log(`  [dry-run] would create: ${slug} (${items.length} items)`);
      for (const item of items.slice(0, 3)) {
        console.log(`    • ${item.lemma}`);
      }
      if (items.length > 3) console.log(`    … and ${items.length - 3} more`);
      created++;
      continue;
    }

    // Insert pack
    const { data: packRow, error: packErr } = await supabase
      .from("vocab_packs")
      .insert({
        slug,
        title,
        description: `Phrasal verbs – zestaw ${partNumber} z ${totalPacks}.`,
        is_published: true,
        vocab_mode: VOCAB_MODE,
        category: CATEGORY,
        order_index: 1000 + i,
        display_section: "Phrasal Verbs",
        display_title: title,
      })
      .select("id")
      .single();

    if (packErr) {
      console.error(`  [error] ${slug}: ${packErr.message}`);
      continue;
    }

    const packId = packRow.id as string;

    // Insert items
    const packItems = items.map((item, idx) => ({
      pack_id: packId,
      sense_id: item.sense_id,
      order_index: idx + 1,
    }));

    const { error: itemsErr } = await supabase
      .from("vocab_pack_items")
      .insert(packItems);

    if (itemsErr) {
      console.error(`  [error] ${slug} items: ${itemsErr.message}`);
      // Clean up the pack
      await supabase.from("vocab_packs").delete().eq("id", packId);
      continue;
    }

    console.log(`  [ok] ${slug} — ${items.length} items`);
    created++;

    await sleep(100);
  }

  console.log(`\n══════════════════════════`);
  console.log(`  Summary`);
  console.log(`══════════════════════════`);
  console.log(`  total packs: ${totalPacks}`);
  console.log(`  created:     ${created}`);
  console.log(`  skipped:     ${skipped}`);
  if (args.dryRun) console.log(`\n  (dry run — no changes written)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
