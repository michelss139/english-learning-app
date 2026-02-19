/**
 * Structural tense validation engine.
 * Validates verb form structure against expected tense patterns.
 */

export type IrregularMap = Record<string, { past: string; pastParticiple: string }>;

function splitVariants(s: string): string[] {
  return s.split("/").map((v) => v.trim().toLowerCase()).filter(Boolean);
}

function isV3Valid(v3: string, irregularMap: IrregularMap): boolean {
  const lower = v3.trim().toLowerCase();
  if (!lower) return false;
  // Regular: ends with "ed"
  if (lower.endsWith("ed")) return true;
  // Irregular: matches any past participle in the map
  for (const entry of Object.values(irregularMap)) {
    const variants = splitVariants(entry.pastParticiple);
    if (variants.includes(lower)) return true;
  }
  return false;
}

function isPastSimpleValid(correctAnswer: string, irregularMap: IrregularMap): boolean {
  const lower = correctAnswer.trim().toLowerCase();
  if (!lower) return false;
  // Regular: ends with "ed"
  if (lower.endsWith("ed")) return true;
  // Irregular: matches any past form in irregularMap
  for (const entry of Object.values(irregularMap)) {
    const variants = splitVariants(entry.past);
    if (variants.includes(lower)) return true;
  }
  return false;
}

/**
 * Validates that correctAnswer matches the structural pattern for the given tense.
 */
export function validateTenseForm(
  tenseSlug: string,
  correctAnswer: string,
  irregularMap: IrregularMap
): boolean {
  const s = correctAnswer.trim().toLowerCase();
  if (!s) return false;

  const slug = tenseSlug.toLowerCase();

  switch (slug) {
    case "present-simple": {
      // Base form: ^[a-z]+$
      if (/^[a-z]+$/.test(s)) return true;
      // 3rd person singular: base + s, es, ies
      if (/^[a-z]+(?:s|es|ies)$/.test(s)) return true;
      return false;
    }

    case "present-continuous": {
      return /^(am|is|are)\s+[a-z]+ing$/.test(s);
    }

    case "past-simple": {
      return isPastSimpleValid(correctAnswer, irregularMap);
    }

    case "past-continuous": {
      return /^(was|were)\s+[a-z]+ing$/.test(s);
    }

    case "present-perfect": {
      const m = s.match(/^(have|has)\s+(.+)$/);
      return m ? isV3Valid(m[2], irregularMap) : false;
    }

    case "present-perfect-continuous": {
      return /^(have|has)\s+been\s+[a-z]+ing$/.test(s);
    }

    case "past-perfect": {
      const m = s.match(/^had\s+(.+)$/);
      return m ? isV3Valid(m[1], irregularMap) : false;
    }

    case "past-perfect-continuous": {
      return /^had\s+been\s+[a-z]+ing$/.test(s);
    }

    case "future-simple": {
      return /^will\s+[a-z]+$/.test(s);
    }

    case "future-continuous": {
      return /^will\s+be\s+[a-z]+ing$/.test(s);
    }

    case "future-perfect":
    case "future-perfect-simple": {
      const m = s.match(/^will\s+have\s+(.+)$/);
      return m ? isV3Valid(m[1], irregularMap) : false;
    }

    case "future-perfect-continuous": {
      return /^will\s+have\s+been\s+[a-z]+ing$/.test(s);
    }

    default:
      return false;
  }
}
