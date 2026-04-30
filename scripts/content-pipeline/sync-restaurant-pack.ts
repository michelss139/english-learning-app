/**
 * Import missing lexicon lemmas (OpenAI) for restaurant daily pack, then rebuild pack items from JSON.
 * Requires: .env.local with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY.
 * Usage: npm run sync:restaurant-pack
 */
import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { execSync } from "node:child_process";
import { importLexiconBatch } from "../../lib/lexicon/importLexiconBatch";
import { createSupabaseAdmin } from "../../lib/supabase/admin";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const JSON_REL = "content/imported/2026-02-26_food_restaurant_daily.json";

async function main(): Promise<void> {
  const supabase = createSupabaseAdmin();
  const words = ["soup", "beverage"];
  console.log("importLexiconBatch (core) for:", words.join(", "));
  const { created, failed } = await importLexiconBatch(supabase, words, { mode: "core" });
  console.log("created:", created, "failed:", failed);
  if (failed.length > 0) {
    for (const f of failed) {
      console.warn(`  ${f.word}: ${f.error}`);
    }
  }
  const { error: titleErr } = await supabase
    .from("vocab_packs")
    .update({ display_title: "W restauracji" })
    .eq("slug", "food-restaurant-daily");
  if (titleErr) {
    throw new Error(`display_title update: ${titleErr.message}`);
  }
  const jsonPath = path.resolve(process.cwd(), JSON_REL);
  execSync(
    `npx tsx scripts/content-pipeline/build-pack.ts food restaurant daily "${jsonPath}" --publish`,
    { stdio: "inherit", cwd: process.cwd(), env: process.env },
  );
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
