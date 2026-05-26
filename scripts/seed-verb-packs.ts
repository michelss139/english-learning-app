/**
 * Creates vocab_packs for verbs by CEFR level, grouped into sets of 20.
 *
 * Usage:
 *   npx tsx scripts/seed-verb-packs.ts --cefr=A1
 *   npx tsx scripts/seed-verb-packs.ts --cefr=A2
 *   npx tsx scripts/seed-verb-packs.ts --cefr=A1 --dry-run
 *   npx tsx scripts/seed-verb-packs.ts --cefr=A1 --group-size=15
 */

import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { sleep, requiredEnv } from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const DEFAULT_GROUP_SIZE = 20;

const PACK_NAMES: Record<string, { title: (n: number) => string; slug: (n: number) => string; section: string }> = {
  A1: {
    title: (n) => `Czasowniki – pakiet startowy [Część ${n}]`,
    slug: (n) => `verbs-a1-starter-part-${String(n).padStart(2, "0")}`,
    section: "Czasowniki A1",
  },
  A2: {
    title: (n) => `Czasowniki – pakiet średniozaawansowany [Część ${n}]`,
    slug: (n) => `verbs-a2-part-${String(n).padStart(2, "0")}`,
    section: "Czasowniki A2",
  },
  B1: {
    title: (n) => `Czasowniki B1 [Część ${n}]`,
    slug: (n) => `verbs-b1-part-${String(n).padStart(2, "0")}`,
    section: "Czasowniki B1",
  },
  B2: {
    title: (n) => `Czasowniki B2 [Część ${n}]`,
    slug: (n) => `verbs-b2-part-${String(n).padStart(2, "0")}`,
    section: "Czasowniki B2",
  },
};

// ─── CLI args ─────────────────────────────────────────────────────────────────

type Args = { dryRun: boolean; groupSize: number; cefr: string };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const rawSize = argv.find((a) => a.startsWith("--group-size="));
  const rawCefr = argv.find((a) => a.startsWith("--cefr="));

  const groupSize = rawSize
    ? (() => {
        const n = Number(rawSize.split("=")[1]);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_GROUP_SIZE;
      })()
    : DEFAULT_GROUP_SIZE;

  const cefr = rawCefr ? rawCefr.split("=")[1].toUpperCase() : "A1";

  return { dryRun: argv.includes("--dry-run"), groupSize, cefr };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();
  const packConfig = PACK_NAMES[args.cefr];
  if (!packConfig) throw new Error(`Unknown CEFR level: ${args.cefr}. Use A1, A2, B1, or B2.`);

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Step 1: load all verb entries with pos='verb' (paginated)
  type EntryRow = { id: string; lemma: string; pos: string };
  const allVerbEntries: EntryRow[] = [];
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error: eErr } = await supabase
        .from("lexicon_entries")
        .select("id, lemma, pos")
        .eq("pos", "verb")
        .range(from, from + PAGE - 1)
        .order("id");
      if (eErr) throw new Error(`lexicon_entries: ${eErr.message}`);
      if (!data || data.length === 0) break;
      allVerbEntries.push(...(data as EntryRow[]));
      from += PAGE;
      if (data.length < PAGE) break;
    }
  }

  const verbEntryIds = allVerbEntries.map((e) => e.id);
  const verbEntryById = new Map(allVerbEntries.map((e) => [e.id, e]));

  // Step 2: load senses for those entries with the target CEFR level (paginated)
  type SenseRow = { id: string; entry_id: string; domain: string | null; cefr_level: string | null };
  const matchingSenses: SenseRow[] = [];
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error: sErr } = await supabase
        .from("lexicon_senses")
        .select("id, entry_id, domain, cefr_level")
        .eq("cefr_level", args.cefr)
        .range(from, from + PAGE - 1)
        .order("id");
      if (sErr) throw new Error(`lexicon_senses: ${sErr.message}`);
      if (!data || data.length === 0) break;
      matchingSenses.push(...(data as SenseRow[]));
      from += PAGE;
      if (data.length < PAGE) break;
    }
  }

  // Step 3: intersect — verb entries that have a matching A2 sense, excluding phrasal
  const verbEntryIdSet = new Set(verbEntryIds);
  const verbs: Array<{ lemma: string; sense_id: string }> = [];
  for (const sense of matchingSenses) {
    if (sense.domain === "verbs:phrasal") continue;
    if (!verbEntryIdSet.has(sense.entry_id)) continue;
    const entry = verbEntryById.get(sense.entry_id);
    if (entry) verbs.push({ lemma: entry.lemma, sense_id: sense.id });
  }

  if (verbs.length === 0) throw new Error(`No verb senses found for CEFR=${args.cefr}`);

  // Sort alphabetically for consistent ordering
  verbs.sort((a, b) => a.lemma.localeCompare(b.lemma));

  const totalPacks = Math.ceil(verbs.length / args.groupSize);

  console.log(`\nVerb Packs Seeder`);
  console.log(`  CEFR level:      ${args.cefr}`);
  console.log(`  verbs found:     ${verbs.length}`);
  console.log(`  group size:      ${args.groupSize}`);
  console.log(`  packs to create: ${totalPacks}`);
  if (args.dryRun) console.log(`  DRY RUN — no writes`);
  console.log();

  // Check which packs already exist
  const { data: existingPacks } = await supabase
    .from("vocab_packs")
    .select("slug")
    .like("slug", `verbs-${args.cefr.toLowerCase()}%`);

  const existingSlugs = new Set((existingPacks ?? []).map((p: { slug: string }) => p.slug));

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < totalPacks; i++) {
    const partNumber = i + 1;
    const slug = packConfig.slug(partNumber);
    const title = packConfig.title(partNumber);
    const items = verbs.slice(i * args.groupSize, (i + 1) * args.groupSize);

    if (existingSlugs.has(slug)) {
      console.log(`  [skip] ${slug} — already exists`);
      skipped++;
      continue;
    }

    if (args.dryRun) {
      console.log(`  [dry-run] ${slug} — "${title}" (${items.length} verbs)`);
      for (const item of items) {
        process.stdout.write(`    ${item.lemma}  `);
      }
      console.log();
      created++;
      continue;
    }

    // Insert pack
    const { data: packRow, error: packErr } = await supabase
      .from("vocab_packs")
      .insert({
        slug,
        title,
        description: `Czasowniki ${args.cefr} – zestaw ${partNumber} z ${totalPacks}.`,
        is_published: true,
        vocab_mode: "daily",
        category: "verbs",
        order_index: 2000 + i,
        display_section: packConfig.section,
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
      await supabase.from("vocab_packs").delete().eq("id", packId);
      continue;
    }

    console.log(`  [ok] ${slug} — "${title}" (${items.length} verbs)`);
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
