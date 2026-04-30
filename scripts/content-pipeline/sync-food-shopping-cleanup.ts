/**
 * Sync Food & Shopping catalog cleanup to Supabase:
 * - enrich lemmas required by edited packs,
 * - update display titles / unpublish groceries,
 * - rebuild drinks and electronics pack items from JSON.
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY.
 */
import "dotenv/config";

import { execSync } from "node:child_process";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { importLexiconBatch } from "../../lib/lexicon/importLexiconBatch";
import { createSupabaseAdmin } from "../../lib/supabase/admin";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const PACK_BUILDS = [
  {
    category: "food",
    subcategory: "drinks",
    mode: "daily",
    json: "content/imported/2026-02-26_food_drinks_daily.json",
  },
  {
    category: "shopping",
    subcategory: "electronics-and-gadgets",
    mode: "daily",
    json: "content/imported/2026-04-05_shopping_electronics-and-gadgets_daily.json",
  },
] as const;

const DISPLAY_TITLES: Array<{ slug: string; display_title: string }> = [
  { slug: "shopping-clothing-and-accessories-daily", display_title: "Ciuchy" },
  { slug: "food-drinks-daily", display_title: "Napoje" },
  { slug: "shopping-electronics-and-gadgets-daily", display_title: "elektronika" },
  { slug: "food-fruits-daily", display_title: "owoce" },
  { slug: "food-vegetables-daily", display_title: "warzywa" },
];

async function main(): Promise<void> {
  const supabase = createSupabaseAdmin();
  const words = ["beverage", "screen"];

  console.log("importLexiconBatch (core) for:", words.join(", "));
  const { created, failed } = await importLexiconBatch(supabase, words, { mode: "core" });
  console.log("created/updated:", created, "failed:", failed);
  if (failed.length > 0) {
    for (const f of failed) {
      console.warn(`  ${f.word}: ${f.error}`);
    }
  }

  for (const row of DISPLAY_TITLES) {
    const { error } = await supabase
      .from("vocab_packs")
      .update({ display_title: row.display_title })
      .eq("slug", row.slug);
    if (error) throw new Error(`display_title update (${row.slug}): ${error.message}`);
  }

  const { error: unpublishErr } = await supabase
    .from("vocab_packs")
    .update({ is_published: false })
    .eq("slug", "shopping-groceries-and-food-items-daily");
  if (unpublishErr) throw new Error(`groceries unpublish: ${unpublishErr.message}`);

  for (const build of PACK_BUILDS) {
    const jsonPath = path.resolve(process.cwd(), build.json);
    execSync(
      `npx tsx scripts/content-pipeline/build-pack.ts ${build.category} ${build.subcategory} ${build.mode} "${jsonPath}" --publish`,
      { stdio: "inherit", cwd: process.cwd(), env: process.env },
    );
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
