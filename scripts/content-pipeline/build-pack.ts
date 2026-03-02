import "dotenv/config";

import path from "node:path";
import { readFile } from "node:fs/promises";
import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Mode = "daily" | "precise";

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

function getCliArgs(): {
  category: string;
  subcategory: string;
  mode: Mode;
  publish: boolean;
  jsonPath: string;
} {
  const argv = process.argv.slice(2).filter((a) => a !== "--publish");
  const publish = process.argv.includes("--publish");
  const [categoryArg, subcategoryArg, modeArg, jsonPathArg] = argv;

  if (!categoryArg || !subcategoryArg || !modeArg || !jsonPathArg) {
    throw new Error(
      'Usage: npm run build:pack <category> <subcategory> <mode> <path-to-json> [--publish]\n' +
        'Example: npm run build:pack home rooms daily --publish content/imported/2026-02-25_home_rooms_daily.json\n' +
        "Build reads only the provided imported JSON file."
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
    jsonPath: path.resolve(process.cwd(), jsonPathArg),
  };
}

type JsonItem = { lemma: string; translation_pl: string };

async function loadSensesFromJson(
  supabase: SupabaseClient,
  jsonPath: string,
  domain: string
): Promise<Array<{ id: string }>> {
  const raw = await readFile(jsonPath, "utf8");
  const parsed = JSON.parse(raw) as { meta?: unknown; items?: JsonItem[] };
  const items = parsed?.items ?? [];
  if (items.length === 0) {
    throw new Error(`No items in JSON file: ${jsonPath}`);
  }

  const senses: Array<{ id: string }> = [];
  for (const item of items) {
    const lemmaNorm = item.lemma.toLowerCase().trim().replace(/\s+/g, " ");
    const translationPl = item.translation_pl.trim().replace(/\s+/g, " ");

    const { data: entryRow } = await supabase
      .from("lexicon_entries")
      .select("id")
      .eq("lemma_norm", lemmaNorm)
      .eq("pos", "noun")
      .maybeSingle();

    if (!entryRow) {
      console.warn(`Skipping: no entry for lemma "${item.lemma}"`);
      continue;
    }

    const entryId = (entryRow as { id: string }).id;
    const { data: senseRows } = await supabase
      .from("lexicon_senses")
      .select(`
        id,
        sense_order,
        lexicon_translations!inner(translation_pl)
      `)
      .eq("entry_id", entryId)
      .order("sense_order", { ascending: true });

    const matched = (senseRows ?? []) as Array<{
      id: string;
      sense_order: number;
      lexicon_translations: Array<{ translation_pl: string }> | { translation_pl: string } | null;
    }>;

    if (matched.length === 0) {
      console.warn(`Skipping: no sense found for lemma "${item.lemma}"`);
      continue;
    }

    // Domain is informational only. Prefer translation match when possible;
    // otherwise fall back to the first sense by sense_order.
    const targetTranslation = translationPl.toLowerCase();
    const byTranslation = matched.find((sense) => {
      const translations = Array.isArray(sense.lexicon_translations)
        ? sense.lexicon_translations
        : sense.lexicon_translations
          ? [sense.lexicon_translations]
          : [];
      return translations.some(
        (t) => (t.translation_pl ?? "").trim().toLowerCase() === targetTranslation
      );
    });

    senses.push({ id: (byTranslation ?? matched[0]).id });
  }
  return senses;
}

async function main(): Promise<void> {
  const { category, subcategory, mode, publish, jsonPath } = getCliArgs();
  console.log(`Publish mode: ${publish ? "ON" : "OFF"}`);
  const domain = `${category}:${subcategory}`;
  const slug = `${category}-${subcategory}-${mode}`;
  const title = `${capitalize(category)} — ${capitalize(subcategory)} (${capitalize(mode)})`;

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Building from JSON: ${jsonPath}`);
  const rawSenses = await loadSensesFromJson(supabase, jsonPath, domain);

  // Deduplicate by sense_id (constraint vocab_pack_items_unique: pack_id + sense_id must be unique)
  const seen = new Set<string>();
  const senses = rawSenses.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
  if (rawSenses.length > senses.length) {
    console.log(`Deduplicated ${rawSenses.length - senses.length} duplicate sense(s)`);
  }

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
