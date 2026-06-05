/**
 * Replaces level-based verb packs with thematic daily/precise packs.
 *
 * Usage:
 *   npx tsx scripts/seed-verb-packs-thematic.ts --dry-run
 *   npx tsx scripts/seed-verb-packs-thematic.ts
 *   npx tsx scripts/seed-verb-packs-thematic.ts --delete-old   ← also removes old verbs-a1-* etc.
 */

import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sleep, requiredEnv } from "./lib/verb-lexicon-shared";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const GROUP_SIZE = 20;

// ─── Category definitions ─────────────────────────────────────────────────────

type CefrLevel = "A1" | "A2" | "B1" | "B2";

type CategoryDef = {
  slugPrefix: string;
  title: string;
  displaySection: string;
  vocabMode: "daily" | "precise";
  domains: Array<string | null>;   // null = domain IS NULL in DB
  cefrLevels: CefrLevel[] | null;  // null = all levels (including null CEFR)
  orderBase: number;
};

const CATEGORIES: CategoryDef[] = [
  // ── DAILY ──────────────────────────────────────────────────────────────────
  {
    slugPrefix: "verb-daily-emotions",
    title: "Emocje i nastrój",
    displaySection: "Emocje i nastrój",   // ← same as adjective category
    vocabMode: "daily",
    domains: ["verbs:emotions"],
    cefrLevels: null,
    orderBase: 2000,
  },
  {
    slugPrefix: "verb-daily-relationships",
    title: "Relacje i ludzie",
    displaySection: "Charakter i osobowość",  // ← same as adjective category
    vocabMode: "daily",
    domains: ["verbs:relationships"],
    cefrLevels: null,
    orderBase: 2100,
  },
  {
    slugPrefix: "verb-daily-home",
    title: "Dom i życie codzienne",
    displaySection: "Dom i życie codzienne",
    vocabMode: "daily",
    domains: ["verbs:home", "verbs:daily_life"],
    cefrLevels: null,
    orderBase: 2200,
  },
  {
    slugPrefix: "verb-daily-food",
    title: "Jedzenie i zakupy",
    displaySection: "Jedzenie i smaki",   // ← same section as adjective food
    vocabMode: "daily",
    domains: ["verbs:food", "verbs:shopping"],
    cefrLevels: null,
    orderBase: 2300,
  },
  {
    slugPrefix: "verb-daily-health",
    title: "Zdrowie i ciało",
    displaySection: "Zdrowie i ciało",   // ← same as adjective category
    vocabMode: "daily",
    domains: ["verbs:health"],
    cefrLevels: null,
    orderBase: 2400,
  },
  {
    slugPrefix: "verb-daily-travel",
    title: "Podróże i transport",
    displaySection: "Podróże i transport",
    vocabMode: "daily",
    domains: ["verbs:travel", "verbs:transport"],
    cefrLevels: null,
    orderBase: 2500,
  },
  {
    slugPrefix: "verb-daily-communication",
    title: "Komunikacja",
    displaySection: "Komunikacja i inne",   // ← same as adjective category
    vocabMode: "daily",
    domains: ["verbs:communication"],
    cefrLevels: null,
    orderBase: 2600,
  },
  {
    slugPrefix: "verb-daily-core",
    title: "Podstawowe czynności",
    displaySection: "Podstawowe czynności",
    vocabMode: "daily",
    // verbs:general A1/A2 + null-domain A1/A2
    domains: ["verbs:general", null],
    cefrLevels: ["A1", "A2"],
    orderBase: 2700,
  },
  // ── PRECISE ────────────────────────────────────────────────────────────────
  {
    slugPrefix: "verb-precise-work",
    title: "Praca i finanse",
    displaySection: "Praca i finanse",   // ← same as adjective category
    vocabMode: "precise",
    domains: ["verbs:work", "verbs:money"],
    cefrLevels: null,
    orderBase: 5000,
  },
  {
    slugPrefix: "verb-precise-tech",
    title: "Technologia i edukacja",
    displaySection: "Technologia i edukacja",   // ← same as adjective category
    vocabMode: "precise",
    domains: ["verbs:technology", "verbs:education"],
    cefrLevels: null,
    orderBase: 5100,
  },
  {
    slugPrefix: "verb-precise-problems",
    title: "Trudności i problemy",
    displaySection: "Trudności i problemy",   // ← same as adjective category
    vocabMode: "precise",
    domains: ["verbs:problems"],
    cefrLevels: null,
    orderBase: 5200,
  },
  {
    slugPrefix: "verb-precise-advanced",
    title: "Zaawansowane czynności",
    displaySection: "Zaawansowane czynności",
    vocabMode: "precise",
    // verbs:general B1/B2 + null-domain B1/B2
    domains: ["verbs:general", null],
    cefrLevels: ["B1", "B2"],
    orderBase: 5300,
  },
  {
    slugPrefix: "verb-precise-irregular",
    title: "Nieregularne",
    displaySection: "Nieregularne",
    vocabMode: "precise",
    // all irregular verbs, all CEFR levels (including null)
    domains: ["verbs:irregular"],
    cefrLevels: null,
    orderBase: 5400,
  },
];

// ─── DB helpers ───────────────────────────────────────────────────────────────

type SenseRow = { id: string; lemma: string };

async function fetchSensesForCategory(
  supabase: SupabaseClient,
  cat: CategoryDef,
): Promise<SenseRow[]> {
  const PAGE = 1000;
  const out: SenseRow[] = [];

  for (const domain of cat.domains) {
    let from = 0;
    while (true) {
      let q = supabase
        .from("lexicon_senses")
        .select("id, lexicon_entries!inner(lemma, pos)")
        .eq("lexicon_entries.pos", "verb")
        .range(from, from + PAGE - 1)
        .order("id");

      if (domain === null) {
        q = q.is("domain", null);
      } else {
        q = q.eq("domain", domain);
      }

      if (cat.cefrLevels) {
        q = q.in("cefr_level", cat.cefrLevels);
      }

      const { data, error } = await q;
      if (error) throw new Error(`fetch senses: ${error.message}`);
      if (!data || data.length === 0) break;

      for (const row of data as any[]) {
        const lemma: string = row.lexicon_entries?.lemma ?? "—";
        out.push({ id: row.id, lemma });
      }

      from += PAGE;
      if (data.length < PAGE) break;
    }
  }

  // Deduplicate by id, then sort alphabetically
  const seen = new Set<string>();
  const unique = out.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  unique.sort((a, b) => a.lemma.localeCompare(b.lemma));
  return unique;
}

async function deleteOldLevelPacks(supabase: SupabaseClient, dryRun: boolean) {
  // Match old level-based slugs: verbs-a1-*, verbs-a2-*, verbs-b1-*, verbs-b2-*
  const patterns = ["verbs-a1-%", "verbs-a2-%", "verbs-b1-%", "verbs-b2-%"];
  const toDelete: Array<{ id: string; slug: string }> = [];

  for (const pattern of patterns) {
    const { data, error } = await supabase
      .from("vocab_packs")
      .select("id, slug")
      .like("slug", pattern);
    if (error) throw new Error(`fetch old packs: ${error.message}`);
    if (data) toDelete.push(...(data as any[]));
  }

  if (toDelete.length === 0) {
    console.log("  No old level-based verb packs found.");
    return;
  }

  console.log(`  Found ${toDelete.length} old level-based packs to delete.`);
  if (dryRun) {
    for (const p of toDelete) console.log(`    [dry] would delete: ${p.slug}`);
    return;
  }

  const ids = toDelete.map((p) => p.id);
  await supabase.from("vocab_pack_items").delete().in("pack_id", ids);
  await supabase.from("vocab_packs").delete().in("id", ids);
  console.log(`  Deleted ${ids.length} old packs.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const deleteOld = argv.includes("--delete-old");

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  console.log("\nVerb Packs — Thematic Seeder");
  if (dryRun) console.log("  DRY RUN — no writes");
  console.log();

  if (deleteOld) {
    console.log("── Deleting old level-based verb packs ──");
    await deleteOldLevelPacks(supabase, dryRun);
    console.log();
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const cat of CATEGORIES) {
    const senses = await fetchSensesForCategory(supabase, cat);
    const totalPacks = Math.ceil(senses.length / GROUP_SIZE);

    console.log(
      `── ${cat.title} [${cat.vocabMode}] — ${senses.length} verbs → ${totalPacks} pack(s)`,
    );

    if (dryRun) {
      for (let i = 0; i < totalPacks; i++) {
        const slug = `${cat.slugPrefix}-part-${String(i + 1).padStart(2, "0")}`;
        const items = senses.slice(i * GROUP_SIZE, (i + 1) * GROUP_SIZE);
        console.log(`  [dry] ${slug}: ${items.map((s) => s.lemma).join(", ")}`);
      }
      totalCreated += totalPacks;
      continue;
    }

    // Check existing
    const { data: existing } = await supabase
      .from("vocab_packs")
      .select("slug")
      .like("slug", `${cat.slugPrefix}%`);
    const existingSlugs = new Set((existing ?? []).map((p: any) => p.slug));

    for (let i = 0; i < totalPacks; i++) {
      const partNum = i + 1;
      const slug = `${cat.slugPrefix}-part-${String(partNum).padStart(2, "0")}`;
      const title =
        totalPacks === 1
          ? cat.title
          : `${cat.title} [Część ${partNum}]`;
      const items = senses.slice(i * GROUP_SIZE, (i + 1) * GROUP_SIZE);

      if (existingSlugs.has(slug)) {
        console.log(`  [skip] ${slug}`);
        totalSkipped++;
        continue;
      }

      const { data: packRow, error: packErr } = await supabase
        .from("vocab_packs")
        .insert({
          slug,
          title,
          display_title: title,
          description: `${cat.title} — zestaw ${partNum} z ${totalPacks}.`,
          is_published: true,
          is_archived: false,
          vocab_mode: cat.vocabMode,
          category: "verbs",
          order_index: cat.orderBase + i,
          display_section: cat.displaySection,
        })
        .select("id")
        .single();

      if (packErr) {
        console.error(`  [error] ${slug}: ${packErr.message}`);
        continue;
      }

      const packId = packRow.id as string;

      const { error: itemsErr } = await supabase
        .from("vocab_pack_items")
        .insert(
          items.map((item, idx) => ({
            pack_id: packId,
            sense_id: item.id,
            order_index: idx + 1,
          })),
        );

      if (itemsErr) {
        console.error(`  [error] ${slug} items: ${itemsErr.message}`);
        await supabase.from("vocab_packs").delete().eq("id", packId);
        continue;
      }

      console.log(`  [ok] ${slug} — "${title}" (${items.length})`);
      totalCreated++;
      await sleep(80);
    }
    console.log();
  }

  console.log("══════════════════════════════");
  console.log(`  created:  ${totalCreated}`);
  console.log(`  skipped:  ${totalSkipped}`);
  if (dryRun) console.log("\n  (dry run — no changes written)");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
