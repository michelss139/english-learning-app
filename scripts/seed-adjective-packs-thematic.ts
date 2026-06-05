/**
 * Replaces level-based adjective packs with thematic daily/precise packs.
 *
 * Usage:
 *   npx tsx scripts/seed-adjective-packs-thematic.ts --dry-run
 *   npx tsx scripts/seed-adjective-packs-thematic.ts
 *   npx tsx scripts/seed-adjective-packs-thematic.ts --delete-old   ← also removes old adjectives-a1-* etc.
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
  domains: Array<string | null>;      // null = domain IS NULL in DB
  cefrLevels: CefrLevel[] | null;     // null = all levels
  orderBase: number;
};

const CATEGORIES: CategoryDef[] = [
  // ── DAILY ──────────────────────────────────────────────────────────────────
  {
    slugPrefix: "adj-daily-emotions",
    title: "Emocje i nastrój",
    displaySection: "Emocje i nastrój",
    vocabMode: "daily",
    domains: ["adjectives:emotions"],
    cefrLevels: null,
    orderBase: 3000,
  },
  {
    slugPrefix: "adj-daily-personality",
    title: "Charakter i osobowość",
    displaySection: "Charakter i osobowość",
    vocabMode: "daily",
    domains: ["adjectives:personality", "adjectives:relationships"],
    cefrLevels: null,
    orderBase: 3100,
  },
  {
    slugPrefix: "adj-daily-appearance",
    title: "Wygląd i opis",
    displaySection: "Wygląd i opis",
    vocabMode: "daily",
    domains: ["adjectives:appearance", "adjectives:home"],
    cefrLevels: null,
    orderBase: 3200,
  },
  {
    slugPrefix: "adj-daily-food",
    title: "Jedzenie i smaki",
    displaySection: "Jedzenie i smaki",
    vocabMode: "daily",
    domains: ["adjectives:food"],
    cefrLevels: null,
    orderBase: 3300,
  },
  {
    slugPrefix: "adj-daily-weather",
    title: "Pogoda",
    displaySection: "Pogoda",
    vocabMode: "daily",
    domains: ["adjectives:weather"],
    cefrLevels: null,
    orderBase: 3400,
  },
  {
    slugPrefix: "adj-daily-nature",
    title: "Przyroda i otoczenie",
    displaySection: "Przyroda i otoczenie",
    vocabMode: "daily",
    domains: ["adjectives:nature"],
    cefrLevels: null,
    orderBase: 3500,
  },
  {
    slugPrefix: "adj-daily-health",
    title: "Zdrowie i ciało",
    displaySection: "Zdrowie i ciało",
    vocabMode: "daily",
    domains: ["adjectives:health"],
    cefrLevels: null,
    orderBase: 3600,
  },
  {
    slugPrefix: "adj-daily-communication",
    title: "Komunikacja i inne",
    displaySection: "Komunikacja i inne",
    vocabMode: "daily",
    domains: ["adjectives:communication", null],
    cefrLevels: null,
    orderBase: 3700,
  },
  {
    slugPrefix: "adj-daily-core",
    title: "Podstawowe opisowe",
    displaySection: "Podstawowe opisowe",
    vocabMode: "daily",
    domains: ["adjectives:general"],
    cefrLevels: ["A1", "A2"],
    orderBase: 3800,
  },
  // ── PRECISE ────────────────────────────────────────────────────────────────
  {
    slugPrefix: "adj-precise-work",
    title: "Praca i finanse",
    displaySection: "Praca i finanse",
    vocabMode: "precise",
    domains: ["adjectives:work", "adjectives:money"],
    cefrLevels: null,
    orderBase: 4000,
  },
  {
    slugPrefix: "adj-precise-travel",
    title: "Podróże i miejsca",
    displaySection: "Podróże i miejsca",
    vocabMode: "precise",
    domains: ["adjectives:travel"],
    cefrLevels: null,
    orderBase: 4100,
  },
  {
    slugPrefix: "adj-precise-tech",
    title: "Technologia i edukacja",
    displaySection: "Technologia i edukacja",
    vocabMode: "precise",
    domains: ["adjectives:technology", "adjectives:education"],
    cefrLevels: null,
    orderBase: 4200,
  },
  {
    slugPrefix: "adj-precise-problems",
    title: "Trudności i problemy",
    displaySection: "Trudności i problemy",
    vocabMode: "precise",
    domains: ["adjectives:problems"],
    cefrLevels: null,
    orderBase: 4300,
  },
  {
    slugPrefix: "adj-precise-advanced",
    title: "Zaawansowane opisowe",
    displaySection: "Zaawansowane opisowe",
    vocabMode: "precise",
    domains: ["adjectives:general"],
    cefrLevels: ["B1", "B2"],
    orderBase: 4400,
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
        .eq("lexicon_entries.pos", "adjective")
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

  // Sort alphabetically and deduplicate by id
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
  const { data: old, error } = await supabase
    .from("vocab_packs")
    .select("id, slug")
    .like("slug", "adjectives-%");

  if (error) throw new Error(`fetch old packs: ${error.message}`);
  if (!old || old.length === 0) {
    console.log("  No old level-based adjective packs found.");
    return;
  }

  console.log(`  Found ${old.length} old level-based packs to delete.`);
  if (dryRun) {
    for (const p of old) console.log(`    [dry] would delete: ${p.slug}`);
    return;
  }

  const ids = old.map((p: any) => p.id);
  // Items cascade-delete via FK, but let's be explicit
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

  console.log("\nAdjective Packs — Thematic Seeder");
  if (dryRun) console.log("  DRY RUN — no writes");
  console.log();

  // Optionally delete old level-based packs
  if (deleteOld) {
    console.log("── Deleting old level-based adjective packs ──");
    await deleteOldLevelPacks(supabase, dryRun);
    console.log();
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const cat of CATEGORIES) {
    const senses = await fetchSensesForCategory(supabase, cat);
    const totalPacks = Math.ceil(senses.length / GROUP_SIZE);

    console.log(
      `── ${cat.title} [${cat.vocabMode}] — ${senses.length} adjectives → ${totalPacks} pack(s)`,
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
          category: "adjectives",
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
        .insert(items.map((item, idx) => ({
          pack_id: packId,
          sense_id: item.id,
          order_index: idx + 1,
        })));

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
