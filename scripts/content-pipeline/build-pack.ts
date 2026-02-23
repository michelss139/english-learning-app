import "dotenv/config";

import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

type Mode = "daily" | "precise";

const DAILY_LEVELS = ["A1", "A2", "B1"];
const PRECISE_LEVELS = ["B2", "C1", "C2"];
const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function getCliArgs(): { category: string; subcategory: string; mode: Mode; publish: boolean } {
  const argv = process.argv.slice(2).filter((a) => a !== "--publish");
  const publish = process.argv.includes("--publish");
  const [categoryArg, subcategoryArg, modeArg] = argv;

  if (!categoryArg || !subcategoryArg || !modeArg) {
    throw new Error(
      'Usage: npm run build:pack <category> <subcategory> <mode> [--publish]\nExample: npm run build:pack garden plants daily'
    );
  }

  const mode = modeArg.toLowerCase();
  if (mode !== "daily" && mode !== "precise") {
    throw new Error('Invalid mode. Allowed values: "daily" | "precise".');
  }

  return {
    category: categoryArg.trim(),
    subcategory: subcategoryArg.trim(),
    mode,
    publish,
  };
}

async function main(): Promise<void> {
  const { category, subcategory, mode, publish } = getCliArgs();
  console.log(`Publish mode: ${publish ? "ON" : "OFF"}`);
  const domain = `${category}:${subcategory}`;
  const slug = `${category}-${subcategory}-${mode}`;
  const title = `${capitalize(category)} — ${capitalize(subcategory)} (${capitalize(mode)})`;

  const levels = mode === "daily" ? DAILY_LEVELS : PRECISE_LEVELS;

  console.log(`Domain resolved to: ${domain}`);

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: sensesRaw, error: sensesErr } = await supabase
    .from("lexicon_senses")
    .select("id, level, lexicon_entries(lemma)")
    .eq("domain", domain)
    .in("level", levels);

  if (sensesErr) {
    throw new Error(`Failed to fetch senses: ${sensesErr.message}`);
  }

  const senses = (sensesRaw ?? []) as Array<{
    id: string;
    level: string;
    lexicon_entries: Array<{ lemma: string }> | null;
  }>;

  senses.sort((a, b) => {
    const levelA = LEVEL_ORDER.indexOf(a.level);
    const levelB = LEVEL_ORDER.indexOf(b.level);
    if (levelA !== levelB) return levelA - levelB;
    const lemmaA = (a.lexicon_entries?.[0]?.lemma ?? "").toLowerCase();
    const lemmaB = (b.lexicon_entries?.[0]?.lemma ?? "").toLowerCase();
    return lemmaA.localeCompare(lemmaB);
  });

  if (senses.length === 0) {
    throw new Error(`No senses found for domain ${domain} and mode ${mode}`);
  }

  console.log(`Found ${senses.length} senses`);

  const { data: existingPack, error: packFindErr } = await supabase
    .from("vocab_packs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (packFindErr) {
    throw new Error(`Failed to check pack: ${packFindErr.message}`);
  }

  let packId: string;

  if (existingPack) {
    packId = existingPack.id;
    console.log("Pack found");
    if (publish) {
      await supabase.from("vocab_packs").update({ is_published: true }).eq("id", packId);
      console.log("Pack published");
    }
  } else {
    const { data: insertedPack, error: insertErr } = await supabase
      .from("vocab_packs")
      .insert({
        slug,
        title,
        description: null,
        is_published: publish,
        order_index: 0,
        vocab_mode: mode,
        category,
      })
      .select("id")
      .single();

    if (insertErr) {
      throw new Error(`Failed to create pack: ${insertErr.message}`);
    }
    packId = insertedPack.id;
    console.log("Pack created");
  }

  const { error: deleteErr } = await supabase
    .from("vocab_pack_items")
    .delete()
    .eq("pack_id", packId);

  if (deleteErr) {
    throw new Error(`Failed to delete old items: ${deleteErr.message}`);
  }

  console.log("Old items deleted");

  const items = senses.map((s, i) => ({
    pack_id: packId,
    sense_id: s.id,
    order_index: i,
  }));

  const { error: insertItemsErr } = await supabase
    .from("vocab_pack_items")
    .insert(items);

  if (insertItemsErr) {
    throw new Error(`Failed to insert items: ${insertItemsErr.message}`);
  }

  console.log(`Inserted ${items.length} items`);
  console.log("Build successful.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Build failed: ${message}`);
  process.exit(1);
});
