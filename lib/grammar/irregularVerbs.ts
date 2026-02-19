/**
 * Loads irregular verbs data and builds a map for tense validation.
 */

import fs from "fs";
import path from "path";
import type { IrregularMap } from "./tensePatterns";

type IrregularEntry = { base: string; past_simple: string; past_participle: string };

let cachedMap: IrregularMap | null = null;

export function getIrregularMap(): IrregularMap {
  if (cachedMap) return cachedMap;
  const jsonPath = path.join(process.cwd(), "data", "irregular-verbs.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const jsonStr = raw.replace(/^\/\*\*[\s\S]*?\*\//, "").trim();
  const arr = JSON.parse(jsonStr) as IrregularEntry[];
  const map: IrregularMap = {};
  for (const v of arr) {
    const base = v.base?.trim().toLowerCase();
    if (base) {
      map[base] = {
        past: v.past_simple ?? "",
        pastParticiple: v.past_participle ?? "",
      };
    }
  }
  cachedMap = map;
  return map;
}
