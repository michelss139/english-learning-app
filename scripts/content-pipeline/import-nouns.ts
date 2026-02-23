import "dotenv/config";

import { mkdir, readFile, rename } from "node:fs/promises";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

type ImportItem = {
  lemma: string;
  pos: "noun";
  translation_pl: string;
  definition_en?: string;
  example_en?: string;
  level: Level;
};

type ImportMeta = {
  category: string;
  subcategory: string;
};

type ImportPayload = {
  meta: ImportMeta;
  items: ImportItem[];
};

const ALLOWED_LEVELS = new Set<Level>(["A1", "A2", "B1", "B2", "C1", "C2"]);

// Support local CLI runs where secrets are often stored in .env.local.
loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolveInputPath(inputArg: string): string {
  return path.isAbsolute(inputArg) ? inputArg : path.resolve(process.cwd(), inputArg);
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function validateJson(raw: unknown): ImportPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid JSON: top-level object is required.");
  }

  const payload = raw as { meta?: unknown; items?: unknown };
  if (!payload.meta || typeof payload.meta !== "object") {
    throw new Error("Invalid JSON: 'meta' object is required.");
  }
  const metaObj = payload.meta as Record<string, unknown>;
  const category = typeof metaObj.category === "string" ? metaObj.category.trim() : "";
  const subcategory = typeof metaObj.subcategory === "string" ? metaObj.subcategory.trim() : "";
  if (!category) {
    throw new Error("Invalid JSON: meta.category is required and must be a non-empty string.");
  }
  if (!subcategory) {
    throw new Error("Invalid JSON: meta.subcategory is required and must be a non-empty string.");
  }
  const meta: ImportMeta = { category, subcategory };

  if (!Array.isArray(payload.items)) {
    throw new Error("Invalid JSON: 'items' array is required.");
  }

  const items: ImportItem[] = payload.items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid item at index ${index}: object expected.`);
    }

    const row = item as Record<string, unknown>;
    const lemma = typeof row.lemma === "string" ? normalizeWhitespace(row.lemma) : "";
    const pos = row.pos;
    const translation = typeof row.translation_pl === "string" ? normalizeWhitespace(row.translation_pl) : "";
    const definition_en = typeof row.definition_en === "string" ? normalizeWhitespace(row.definition_en) : "";
    const example_en = typeof row.example_en === "string" ? normalizeWhitespace(row.example_en) : "";
    const level = row.level;

    if (!lemma) {
      throw new Error(`Invalid item at index ${index}: missing lemma.`);
    }
    if (pos !== "noun") {
      throw new Error(`Invalid item "${lemma}": pos must be "noun".`);
    }
    if (!translation) {
      throw new Error(`Invalid item "${lemma}": missing translation_pl.`);
    }
    if (typeof level !== "string" || !ALLOWED_LEVELS.has(level as Level)) {
      throw new Error(`Invalid item "${lemma}": level must be one of A1-A2-B1-B2-C1-C2.`);
    }

    return {
      lemma,
      pos: "noun",
      translation_pl: translation,
      definition_en: definition_en || undefined,
      example_en: example_en || undefined,
      level: level as Level,
    };
  });

  return {
    meta,
    items,
  };
}


type ProcessResult = "imported" | "skipped" | "refreshed";

async function processItem(
  supabase: any,
  item: ImportItem,
  index: number,
  total: number,
  skipDuplicates: boolean,
  domain: string,
): Promise<ProcessResult> {
  console.log(`Processing item ${index}/${total}: ${item.lemma}`);

  const lemmaNorm = item.lemma.toLowerCase();

  const { data: existingEntry, error: entryFindError } = await supabase
    .from("lexicon_entries")
    .select("id")
    .eq("lemma_norm", lemmaNorm)
    .eq("pos", "noun")
    .maybeSingle();

  if (entryFindError) {
    throw new Error(`ERROR at item ${index}: failed to query lexicon_entries for "${item.lemma}": ${entryFindError.message}`);
  }

  let entryId: string;
  let createdEntry = false;
  if (!existingEntry) {
    const { data: insertedEntry, error: entryInsertError } = await supabase
      .from("lexicon_entries")
      .insert({
        lemma: item.lemma,
        lemma_norm: lemmaNorm,
        pos: "noun",
      })
      .select("id")
      .single();

    if (entryInsertError) {
      throw new Error(`ERROR at item ${index}: failed to insert lexicon_entry for "${item.lemma}": ${entryInsertError.message}`);
    }

    entryId = insertedEntry.id;
    createdEntry = true;
  } else {
    entryId = existingEntry.id;
  }

  const { data: existingTranslationRows, error: existingTranslationError } = await supabase
    .from("lexicon_senses")
    .select(`
      id,
      definition_en,
      level,
      domain,
      lexicon_translations!inner(translation_pl),
      lexicon_examples(id)
    `)
    .eq("entry_id", entryId)
    .eq("lexicon_translations.translation_pl", item.translation_pl);

  if (existingTranslationError) {
    throw new Error(
      `ERROR at item ${index}: failed to check duplicate translation for lemma "${item.lemma}": ${existingTranslationError.message}`,
    );
  }

  if (existingTranslationRows && existingTranslationRows.length > 0) {
    const existingSense = existingTranslationRows[0] as {
      id: string;
      definition_en: string | null;
      level: string | null;
      domain: string | null;
      lexicon_examples?: Array<{ id: string }> | null;
    };
    const isIncomplete =
      !existingSense.definition_en ||
      existingSense.domain == null ||
      !existingSense.lexicon_examples ||
      existingSense.lexicon_examples.length === 0;

    if (isIncomplete) {
      const senseId = existingSense.id;
      const { error: updateErr } = await supabase
        .from("lexicon_senses")
        .update({
          definition_en: item.definition_en ?? "",
          level: item.level,
          domain,
        })
        .eq("id", senseId);

      if (updateErr) {
        throw new Error(
          `ERROR at item ${index}: failed to update incomplete sense for "${item.lemma}": ${updateErr.message}`
        );
      }

      const { error: deleteExamplesErr } = await supabase
        .from("lexicon_examples")
        .delete()
        .eq("sense_id", senseId);

      if (deleteExamplesErr) {
        throw new Error(
          `ERROR at item ${index}: failed to delete old examples for "${item.lemma}": ${deleteExamplesErr.message}`
        );
      }

      if (item.example_en) {
        const { error: exampleInsertError } = await supabase
          .from("lexicon_examples")
          .insert({
            sense_id: senseId,
            example_en: item.example_en,
            source: "ai",
          });

        if (exampleInsertError) {
          throw new Error(
            `ERROR at item ${index}: failed to insert example for "${item.lemma}": ${exampleInsertError.message}`
          );
        }
      }

      console.log(`Refreshed incomplete sense: ${item.lemma}`);
      return "refreshed";
    }

    if (skipDuplicates) {
      console.log("Already imported, skipping.");
      return "skipped";
    }
    throw new Error(`ERROR at item ${index}: duplicate translation for lemma "${item.lemma}".`);
  }

  const { data: lastSense, error: lastSenseError } = await supabase
    .from("lexicon_senses")
    .select("sense_order")
    .eq("entry_id", entryId)
    .order("sense_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSenseError) {
    throw new Error(`ERROR at item ${index}: failed to query sense_order for "${item.lemma}": ${lastSenseError.message}`);
  }

  const nextSenseOrder = typeof lastSense?.sense_order === "number" ? lastSense.sense_order + 1 : 0;

  const { data: insertedSense, error: senseInsertError } = await supabase
    .from("lexicon_senses")
    .insert({
      entry_id: entryId,
      definition_en: item.definition_en ?? "",
      level: item.level,
      sense_order: nextSenseOrder,
      domain,
    })
    .select("id")
    .single();

  if (senseInsertError) {
    throw new Error(`ERROR at item ${index}: failed to insert lexicon_sense for "${item.lemma}": ${senseInsertError.message}`);
  }

  const senseId = insertedSense.id;

  if (item.example_en) {
    const { error: exampleInsertError } = await supabase
      .from("lexicon_examples")
      .insert({
        sense_id: senseId,
        example_en: item.example_en,
        source: "ai",
      });

    if (exampleInsertError) {
      throw new Error(
        `ERROR at item ${index}: failed to insert example for "${item.lemma}": ${exampleInsertError.message}`
      );
    }
  }

  const { error: translationInsertError } = await supabase.from("lexicon_translations").insert({
    sense_id: insertedSense.id,
    translation_pl: item.translation_pl,
  });

  if (translationInsertError) {
    throw new Error(`ERROR at item ${index}: failed to insert translation for "${item.lemma}": ${translationInsertError.message}`);
  }

  if (createdEntry) {
    console.log("Inserted new entry + sense + example.");
  } else {
    console.log("Existing entry found. Added new sense.");
  }
  return "imported";
}

async function moveImportedFile(sourcePath: string): Promise<string> {
  const targetDir = path.resolve(process.cwd(), "content", "imported");
  await mkdir(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, path.basename(sourcePath));
  await rename(sourcePath, targetPath);
  return targetPath;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const skipDuplicates = argv.includes("--skip-duplicates");
  const inputArg = argv.filter((a) => a !== "--skip-duplicates")[0];

  if (!inputArg) {
    throw new Error("Usage: npm run import:nouns [--skip-duplicates] <path-to-json>");
  }

  const inputPath = resolveInputPath(inputArg);
  console.log(`Reading file: ${inputPath}`);
  const rawFile = await readFile(inputPath, "utf8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawFile);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON file: ${message}`);
  }

  const payload = validateJson(parsed);
  const domain = `${payload.meta.category}:${payload.meta.subcategory}`;
  console.log(`Domain resolved to: ${domain}`);
  console.log(`Validating ${payload.items.length} items...`);
  if (skipDuplicates) {
    console.log("Mode: skip already imported (--skip-duplicates).");
  }

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  console.log("Connecting to Supabase...");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let importedCount = 0;
  let skippedCount = 0;
  let refreshedCount = 0;

  for (let i = 0; i < payload.items.length; i += 1) {
    try {
      const result = await processItem(
        supabase,
        payload.items[i],
        i + 1,
        payload.items.length,
        skipDuplicates,
        domain,
      );
      if (result === "imported") importedCount += 1;
      else if (result === "refreshed") refreshedCount += 1;
      else skippedCount += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      console.error("Import aborted.");
      process.exit(1);
    }
  }

  const movedTo = await moveImportedFile(inputPath);
  console.log("Import successful.");
  const parts = [`${importedCount} items imported`];
  if (refreshedCount > 0) parts.push(`${refreshedCount} refreshed`);
  if (skipDuplicates && skippedCount > 0) parts.push(`${skippedCount} skipped`);
  console.log(parts.join(". ") + ".");
  console.log(`File moved to ${movedTo}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Import failed: ${message}`);
  process.exit(1);
});
