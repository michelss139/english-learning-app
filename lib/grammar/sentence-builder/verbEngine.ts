import type { SentenceBuilderVerb } from "./types";

let irregularVerbMap: Record<string, SentenceBuilderVerb> = {};

function normalizeVerb(verb: string): string {
  return verb.trim().toLowerCase();
}

function isConsonant(letter: string): boolean {
  return /^[bcdfghjklmnpqrstvwxyz]$/i.test(letter);
}

function isVowel(letter: string): boolean {
  return /^[aeiou]$/i.test(letter);
}

function isShortCvc(word: string): boolean {
  if (word.length < 3) return false;
  const letters = word.slice(-3).split("");
  const [first, second, third] = letters;

  if (!isConsonant(first) || !isVowel(second) || !isConsonant(third)) {
    return false;
  }

  return !/[wxy]$/i.test(word);
}

function isOneSyllable(word: string): boolean {
  const vowels = word.match(/[aeiouy]/gi);

  if (!vowels) return true;
  if (vowels.length > 1) return false;

  if (word.endsWith("e") && word.length > 2) {
    const stem = word.slice(0, -1);
    const stemVowels = stem.match(/[aeiouy]/gi);
    return !stemVowels || stemVowels.length === 0;
  }

  return true;
}

function makeRegularPastForm(verb: string): string {
  if (verb.endsWith("e")) {
    return `${verb}d`;
  }

  if (verb.endsWith("y") && verb.length > 1 && isConsonant(verb.slice(-2, -1))) {
    return `${verb.slice(0, -1)}ied`;
  }

  if (isShortCvc(verb) && isOneSyllable(verb)) {
    return `${verb}${verb.slice(-1)}ed`;
  }

  return `${verb}ed`;
}

export function registerSentenceBuilderVerbs(verbs: SentenceBuilderVerb[]): void {
  irregularVerbMap = Object.fromEntries(
    verbs.map((verb) => [
      normalizeVerb(verb.base),
      {
        base: normalizeVerb(verb.base),
        past: normalizeVerb(verb.past),
        pastParticiple: normalizeVerb(verb.pastParticiple),
      },
    ])
  );
}

export function getPastSimple(verb: string): string {
  const base = normalizeVerb(verb);
  return irregularVerbMap[base]?.past ?? makeRegularPastForm(base);
}

export function getPastParticiple(verb: string): string {
  const base = normalizeVerb(verb);
  return irregularVerbMap[base]?.pastParticiple ?? makeRegularPastForm(base);
}

export function getIngForm(verb: string): string {
  const base = normalizeVerb(verb);

  if (base.endsWith("ie")) {
    return `${base.slice(0, -2)}ying`;
  }

  if (base.endsWith("e") && !base.endsWith("ee")) {
    return `${base.slice(0, -1)}ing`;
  }

  if (isShortCvc(base) && isOneSyllable(base)) {
    return `${base}${base.slice(-1)}ing`;
  }

  return `${base}ing`;
}

export function getThirdPersonForm(verb: string): string {
  const base = normalizeVerb(verb);

  if (base === "have") {
    return "has";
  }

  if (/[sxz]$/.test(base) || base.endsWith("ch") || base.endsWith("sh") || base.endsWith("o")) {
    return `${base}es`;
  }

  if (base.endsWith("y") && base.length > 1 && isConsonant(base.slice(-2, -1))) {
    return `${base.slice(0, -1)}ies`;
  }

  return `${base}s`;
}
