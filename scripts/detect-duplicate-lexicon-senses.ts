/**
 * Read-only: find lexicon_senses that share the same entry + same PL translation (likely duplicate meanings).
 *
 * Run: npx tsx scripts/detect-duplicate-lexicon-senses.ts
 *      npx tsx scripts/detect-duplicate-lexicon-senses.ts --json   # stdout: JSON only
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (same as other scripts; dotenv loads .env.local)
 */
import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "./lib/verb-lexicon-shared";
import { findDuplicateSenseGroups } from "../lib/lexicon/duplicateSenseDetection";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

/** No DB writes — reserved for a future cleanup pass. */
const DRY_RUN = true;

/** Max duplicate-groups to include in the report (API uses 50). */
const MAX_GROUPS = 100;

async function main(): Promise<void> {
  const jsonOnly = process.argv.includes("--json");

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!jsonOnly) {
    console.log("detect-duplicate-lexicon-senses (read-only; DRY_RUN=%s — no writes)", DRY_RUN);
    console.log("Loading lexicon_translations + senses + entries…");
  }

  const out = await findDuplicateSenseGroups(supabase, { maxGroups: MAX_GROUPS, includeReason: true });

  const jsonPayload = JSON.stringify(out, null, 2);

  if (jsonOnly) {
    console.log(jsonPayload);
  } else {
    console.log(`Reporting first ${out.length} groups (max ${MAX_GROUPS})\n`);
    for (const g of out) {
      console.log("—".repeat(72));
      console.log(
        `${g.lemma}  |  ${g.translation_pl}  |  entry ${g.entry_id}  |  likely_duplicate=${g.likely_duplicate}`,
      );
      if (g.reason) console.log(`  reason: ${g.reason}`);
      for (const s of g.senses) {
        const defPreview = s.definition_en.length > 120 ? `${s.definition_en.slice(0, 120)}…` : s.definition_en;
        console.log(`  • ${s.sense_id}: ${defPreview || "(empty)"}`);
      }
    }
    console.log("—".repeat(72));
    const dumpPath = path.join(process.cwd(), "scripts", "duplicate-lexicon-senses-report.json");
    fs.writeFileSync(dumpPath, jsonPayload, "utf8");
    console.log(`\nJSON dump: ${dumpPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
