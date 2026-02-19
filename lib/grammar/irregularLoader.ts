/**
 * Loads irregular verbs from Supabase with in-memory TTL cache.
 * Used by story-generator for form validation.
 */

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { IrregularForms } from "./formEngine";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cached: Record<string, IrregularForms> | null = null;
let cachedAt = 0;

function toArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((v) => String(v || "").trim().toLowerCase()).filter(Boolean);
  return [];
}

export async function getIrregularMap(): Promise<Record<string, IrregularForms>> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  const supabase = createSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("irregular_verbs")
    .select("base, base_norm, past_simple, past_simple_variants, past_participle, past_participle_variants");

  if (error) {
    const fallback = await loadFallbackFromJson();
    if (fallback) return fallback;
    throw new Error(`Failed to load irregular verbs: ${error.message}`);
  }

  const map: Record<string, IrregularForms> = {};
  for (const row of rows ?? []) {
    const base = (row.base ?? row.base_norm ?? "").trim().toLowerCase();
    if (!base) continue;
    const past = (row.past_simple ?? "").trim().toLowerCase();
    const pastParticiple = (row.past_participle ?? "").trim().toLowerCase();
    const pastVariants = toArray(row.past_simple_variants);
    const pastParticipleVariants = toArray(row.past_participle_variants);
    map[base] = {
      base,
      past,
      pastParticiple,
      pastVariants: pastVariants.length ? pastVariants : undefined,
      pastParticipleVariants: pastParticipleVariants.length ? pastParticipleVariants : undefined,
    };
  }

  cached = map;
  cachedAt = now;
  return map;
}

async function loadFallbackFromJson(): Promise<Record<string, IrregularForms> | null> {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const jsonPath = path.join(process.cwd(), "data", "irregular-verbs.json");
    const raw = fs.readFileSync(jsonPath, "utf-8");
    const jsonStr = raw.replace(/^\/\*\*[\s\S]*?\*\//, "").trim();
    const arr = JSON.parse(jsonStr) as Array<{
      base: string;
      past_simple: string;
      past_participle: string;
    }>;
    const map: Record<string, IrregularForms> = {};
    for (const v of arr) {
      const base = (v.base ?? "").trim().toLowerCase();
      if (!base) continue;
      const pastRaw = (v.past_simple ?? "").trim().toLowerCase();
      const ppRaw = (v.past_participle ?? "").trim().toLowerCase();
      const pastParts = pastRaw.split("/").map((s) => s.trim().toLowerCase()).filter(Boolean);
      const ppParts = ppRaw.split("/").map((s) => s.trim().toLowerCase()).filter(Boolean);
      map[base] = {
        base,
        past: pastParts[0] ?? pastRaw,
        pastParticiple: ppParts[0] ?? ppRaw,
        pastVariants: pastParts.length > 1 ? pastParts : undefined,
        pastParticipleVariants: ppParts.length > 1 ? ppParts : undefined,
      };
    }
    return map;
  } catch {
    return null;
  }
}
