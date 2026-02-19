/**
 * Grammar Form Engine – deterministic validation of verb forms for story gaps.
 * No LLM, no heuristics. Validates structure + baseVerb derivation + irregular verbs.
 */

export type TenseSlug =
  | "present-simple"
  | "present-continuous"
  | "past-simple"
  | "past-continuous"
  | "present-perfect"
  | "present-perfect-continuous"
  | "past-perfect"
  | "past-perfect-continuous"
  | "future-simple"
  | "future-continuous"
  | "future-perfect"
  | "future-perfect-simple"
  | "future-perfect-continuous";

export type IrregularForms = {
  base: string;
  past: string;
  pastParticiple: string;
  pastVariants?: string[];
  pastParticipleVariants?: string[];
};

export type ValidateGapAnswerArgs = {
  tense: TenseSlug;
  baseVerb: string;
  correctAnswer: string;
  irregular: Record<string, IrregularForms>;
};

export type ValidateGapAnswerResult = { ok: true } | { ok: false; reason: string };

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function tokenize(s: string): string[] {
  return normalize(s).split(/\s+/).filter(Boolean);
}

function isCVC(word: string): boolean {
  if (word.length < 3) return false;
  const c = "[bcdfghjklmnpqrstvwxz]";
  const v = "[aeiou]";
  const last3 = word.slice(-3);
  const re = new RegExp(`${c}${v}${c}$`);
  if (!re.test(last3)) return false;
  if (/[wxy]$/.test(word)) return false;
  return true;
}

function isOneSyllable(word: string): boolean {
  const vowels = word.match(/[aeiouy]/gi);
  if (!vowels) return true;
  const count = vowels.length;
  if (count > 1) return false;
  if (word.endsWith("e") && word.length > 2) {
    const before = word.slice(0, -1);
    const v = before.match(/[aeiouy]/gi);
    return !v || v.length === 0;
  }
  return count <= 1;
}

export function makeIngForms(baseVerb: string): string[] {
  const base = baseVerb.trim().toLowerCase();
  if (!base) return [];
  const forms = new Set<string>();

  if (base.endsWith("ie")) {
    forms.add(base.slice(0, -2) + "ying");
  } else if (base.endsWith("e") && !/^[aeiou].*e$/.test(base) && base.length > 2) {
    forms.add(base.slice(0, -1) + "ing");
  } else if (isCVC(base) && isOneSyllable(base)) {
    forms.add(base + base.slice(-1) + "ing");
  } else {
    forms.add(base + "ing");
  }
  return Array.from(forms);
}

export function make3rdPersonForms(baseVerb: string): string[] {
  const base = baseVerb.trim().toLowerCase();
  if (!base) return [];
  const forms = new Set<string>();

  if (base === "have") {
    forms.add("has");
    return Array.from(forms);
  }
  if (base === "be") {
    forms.add("is");
    forms.add("are");
    forms.add("am");
    return Array.from(forms);
  }
  if (/[sxz]$/.test(base) || base.endsWith("ch") || base.endsWith("sh") || base.endsWith("o")) {
    forms.add(base + "es");
  } else if (base.endsWith("y") && base.length > 1) {
    const before = base.slice(0, -1);
    if (/[bcdfghjklmnpqrstvwxz]/.test(before.slice(-1))) {
      forms.add(before + "ies");
    } else {
      forms.add(base + "s");
    }
  } else {
    forms.add(base + "s");
  }
  return Array.from(forms);
}

export function makePastEdForms(baseVerb: string): string[] {
  const base = baseVerb.trim().toLowerCase();
  if (!base) return [];
  const forms = new Set<string>();

  if (base.endsWith("e")) {
    forms.add(base + "d");
  } else if (base.endsWith("y") && base.length > 1 && /[bcdfghjklmnpqrstvwxz]/.test(base.slice(-2, -1))) {
    forms.add(base.slice(0, -1) + "ied");
  } else if (isCVC(base) && isOneSyllable(base)) {
    forms.add(base + base.slice(-1) + "ed");
  } else {
    forms.add(base + "ed");
  }
  return Array.from(forms);
}

function getAllPastForms(irregular: IrregularForms): Set<string> {
  const set = new Set<string>();
  set.add(irregular.past.toLowerCase());
  if (irregular.pastVariants) {
    irregular.pastVariants.forEach((v) => set.add(v.toLowerCase()));
  }
  return set;
}

function getAllPastParticipleForms(irregular: IrregularForms): Set<string> {
  const set = new Set<string>();
  set.add(irregular.pastParticiple.toLowerCase());
  if (irregular.pastParticipleVariants) {
    irregular.pastParticipleVariants.forEach((v) => set.add(v.toLowerCase()));
  }
  return set;
}

function getV3Forms(
  base: string,
  irregular: Record<string, IrregularForms>
): Set<string> {
  const irr = irregular[base];
  if (irr) {
    return getAllPastParticipleForms(irr);
  }
  return new Set(makePastEdForms(base));
}

function getPastForms(
  base: string,
  irregular: Record<string, IrregularForms>
): Set<string> {
  const irr = irregular[base];
  if (irr) {
    return getAllPastForms(irr);
  }
  return new Set(makePastEdForms(base));
}

const TENSE_SLUGS: TenseSlug[] = [
  "present-simple",
  "present-continuous",
  "past-simple",
  "past-continuous",
  "present-perfect",
  "present-perfect-continuous",
  "past-perfect",
  "past-perfect-continuous",
  "future-simple",
  "future-continuous",
  "future-perfect",
  "future-perfect-simple",
  "future-perfect-continuous",
];

export function validateGapAnswer(args: ValidateGapAnswerArgs): ValidateGapAnswerResult {
  const { tense, baseVerb, correctAnswer, irregular } = args;
  const ans = normalize(correctAnswer);
  const base = normalize(baseVerb);

  if (!ans) return { ok: false, reason: "empty_answer" };
  if (!base) return { ok: false, reason: "empty_base" };

  if (!TENSE_SLUGS.includes(tense)) {
    return { ok: false, reason: "unsupported_tense" };
  }

  const tokens = tokenize(correctAnswer);

  switch (tense) {
    case "present-simple": {
      if (tokens.length !== 1) return { ok: false, reason: "structure_mismatch" };
      const word = tokens[0];
      if (base === word) return { ok: true };
      const third = make3rdPersonForms(base);
      if (third.includes(word)) return { ok: true };
      return { ok: false, reason: "verb_mismatch" };
    }

    case "present-continuous": {
      if (tokens.length !== 2) return { ok: false, reason: "structure_mismatch" };
      if (!["am", "is", "are"].includes(tokens[0])) return { ok: false, reason: "structure_mismatch" };
      const ingForms = makeIngForms(base);
      if (!ingForms.includes(tokens[1])) return { ok: false, reason: "verb_mismatch" };
      return { ok: true };
    }

    case "past-simple": {
      if (tokens.length !== 1) return { ok: false, reason: "structure_mismatch" };
      const word = tokens[0];
      const pastForms = getPastForms(base, irregular);
      if (pastForms.has(word)) return { ok: true };
      return { ok: false, reason: base in irregular ? "irregular_mismatch" : "verb_mismatch" };
    }

    case "past-continuous": {
      if (tokens.length !== 2) return { ok: false, reason: "structure_mismatch" };
      if (!["was", "were"].includes(tokens[0])) return { ok: false, reason: "structure_mismatch" };
      const ingForms = makeIngForms(base);
      if (!ingForms.includes(tokens[1])) return { ok: false, reason: "verb_mismatch" };
      return { ok: true };
    }

    case "present-perfect": {
      if (tokens.length !== 2) return { ok: false, reason: "structure_mismatch" };
      if (!["have", "has"].includes(tokens[0])) return { ok: false, reason: "structure_mismatch" };
      const v3Forms = getV3Forms(base, irregular);
      if (!v3Forms.has(tokens[1])) return { ok: false, reason: base in irregular ? "irregular_mismatch" : "verb_mismatch" };
      return { ok: true };
    }

    case "present-perfect-continuous": {
      if (tokens.length !== 3) return { ok: false, reason: "structure_mismatch" };
      if (!["have", "has"].includes(tokens[0])) return { ok: false, reason: "structure_mismatch" };
      if (tokens[1] !== "been") return { ok: false, reason: "structure_mismatch" };
      const ingForms = makeIngForms(base);
      if (!ingForms.includes(tokens[2])) return { ok: false, reason: "verb_mismatch" };
      return { ok: true };
    }

    case "past-perfect": {
      if (tokens.length !== 2) return { ok: false, reason: "structure_mismatch" };
      if (tokens[0] !== "had") return { ok: false, reason: "structure_mismatch" };
      const v3Forms = getV3Forms(base, irregular);
      if (!v3Forms.has(tokens[1])) return { ok: false, reason: base in irregular ? "irregular_mismatch" : "verb_mismatch" };
      return { ok: true };
    }

    case "past-perfect-continuous": {
      if (tokens.length !== 3) return { ok: false, reason: "structure_mismatch" };
      if (tokens[0] !== "had") return { ok: false, reason: "structure_mismatch" };
      if (tokens[1] !== "been") return { ok: false, reason: "structure_mismatch" };
      const ingForms = makeIngForms(base);
      if (!ingForms.includes(tokens[2])) return { ok: false, reason: "verb_mismatch" };
      return { ok: true };
    }

    case "future-simple": {
      if (tokens.length !== 2) return { ok: false, reason: "structure_mismatch" };
      if (tokens[0] !== "will") return { ok: false, reason: "structure_mismatch" };
      if (tokens[1] !== base) return { ok: false, reason: "verb_mismatch" };
      return { ok: true };
    }

    case "future-continuous": {
      if (tokens.length !== 3) return { ok: false, reason: "structure_mismatch" };
      if (tokens[0] !== "will") return { ok: false, reason: "structure_mismatch" };
      if (tokens[1] !== "be") return { ok: false, reason: "structure_mismatch" };
      const ingForms = makeIngForms(base);
      if (!ingForms.includes(tokens[2])) return { ok: false, reason: "verb_mismatch" };
      return { ok: true };
    }

    case "future-perfect":
    case "future-perfect-simple": {
      if (tokens.length !== 3) return { ok: false, reason: "structure_mismatch" };
      if (tokens[0] !== "will") return { ok: false, reason: "structure_mismatch" };
      if (tokens[1] !== "have") return { ok: false, reason: "structure_mismatch" };
      const v3Forms = getV3Forms(base, irregular);
      if (!v3Forms.has(tokens[2])) return { ok: false, reason: base in irregular ? "irregular_mismatch" : "verb_mismatch" };
      return { ok: true };
    }

    case "future-perfect-continuous": {
      if (tokens.length !== 4) return { ok: false, reason: "structure_mismatch" };
      if (tokens[0] !== "will") return { ok: false, reason: "structure_mismatch" };
      if (tokens[1] !== "have") return { ok: false, reason: "structure_mismatch" };
      if (tokens[2] !== "been") return { ok: false, reason: "structure_mismatch" };
      const ingForms = makeIngForms(base);
      if (!ingForms.includes(tokens[3])) return { ok: false, reason: "verb_mismatch" };
      return { ok: true };
    }

    default:
      return { ok: false, reason: "unsupported_tense" };
  }
}
