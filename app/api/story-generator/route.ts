import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { validateGapAnswer, make3rdPersonForms, type IrregularForms } from "@/lib/grammar/formEngine";
import { getIrregularMap } from "@/lib/grammar/irregularLoader";
import type { GrammarTenseSlug } from "@/lib/grammar/types";
import { STORY_PROFILES, type StoryProfileKey } from "@/lib/story/profiles";

type StoryGap = {
  id: string;
  baseVerb: string;
  correctAnswer: string;
  tense: GrammarTenseSlug;
};

type StoryPayload = {
  title: string;
  story: string;
  gaps: StoryGap[];
  profile: StoryProfileKey;
};

type Body = {
  profile?: string;
};

type GapCandidate = {
  start: number;
  end: number;
  tense: GrammarTenseSlug;
  baseVerb: string;
  correctAnswer: string;
};

const MODEL_PRIMARY = "gpt-4.1";
const MODEL_FALLBACK = "gpt-4.1-mini";
const STORY_TEMPERATURE = 0.6;
const STORY_ATTEMPTS = 4;
const MIN_GAPS = 10;
const MAX_GAPS = 12;
const MAX_AUTOPROMOTE = 3;
const CACHE_LIMIT = 10;
const CACHE_REFILL_FLOOR = 3;

const storyPool = new Map<StoryProfileKey, StoryPayload[]>();
const refillInFlight = new Set<StoryProfileKey>();

const KNOWN_AUX = new Set(["am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "will"]);
const SIMPLE_SUBJECTS = new Set(["i", "you", "we", "they", "he", "she", "it"]);
const OPTIONAL_ADVERBS = new Set([
  "always",
  "already",
  "just",
  "never",
  "often",
  "usually",
  "sometimes",
  "still",
  "really",
  "probably",
  "quickly",
  "slowly",
]);

const MALFORMED_BASE_FIXES: Record<string, string> = {
  sitt: "sit",
  sipp: "sip",
  runn: "run",
  stopp: "stop",
  plann: "plan",
  runing: "run",
  lieing: "lie",
  tieing: "tie",
  dieing: "die",
  makeing: "make",
  takeing: "take",
  comeing: "come",
  haveing: "have",
  writeing: "write",
  driveing: "drive",
  stoping: "stop",
  planing: "plan",
  swiming: "swim",
  geting: "get",
  puting: "put",
  leting: "let",
  seting: "set",
  forgeting: "forget",
  begining: "begin",
};

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

function isWord(s: string): boolean {
  return /^[a-z]+$/.test(s);
}

function normalizeSpacing(text: string): string {
  return text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function countWords(text: string): number {
  const words = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g);
  return words ? words.length : 0;
}

function isProfileKey(value: string): value is StoryProfileKey {
  return value in STORY_PROFILES;
}

function pushToPool(profile: StoryProfileKey, payload: StoryPayload): void {
  const list = storyPool.get(profile) ?? [];
  list.push(payload);
  while (list.length > CACHE_LIMIT) list.shift();
  storyPool.set(profile, list);
}

function popFromPool(profile: StoryProfileKey): StoryPayload | null {
  const list = storyPool.get(profile);
  if (!list || list.length === 0) return null;
  const next = list.shift() ?? null;
  storyPool.set(profile, list);
  return next;
}

function poolSize(profile: StoryProfileKey): number {
  return (storyPool.get(profile) ?? []).length;
}

const B1_VOCAB_HINTS =
  "Prefer everyday B1 words: walk, rain, call, decide, feel, notice, remember, wait, talk, arrive, work, go, see, think, know, leave, come, start, finish, help, look, live, use, need, want, try, stop, open, close, sit, stand, run, move, enjoy, like, love, hate, hope, expect, forget, understand, believe, hear, watch, read, write, speak, ask, answer, tell, say, give, take, make, get, find, lose, buy, sell, pay, cost, break, fix, build, change, keep, hold, put, bring, send.";

function buildNarrationPrompt(profile: StoryProfileKey): string {
  const profileConfig = STORY_PROFILES[profile];
  const tenses = profileConfig.tenses;
  const tenseHints = tenses
    .map((t) => {
      switch (t) {
        case "past-simple":
          return "single past form (walked/went)";
        case "past-continuous":
          return "was/were + verb-ing";
        case "past-perfect":
          return "had + past participle";
        case "present-perfect":
          return "have/has + past participle";
        case "present-perfect-continuous":
          return "have/has been + verb-ing";
        case "future-simple":
          return "will + base verb";
        case "future-perfect-simple":
          return "will have + past participle";
        case "present-simple":
          return "present simple lexical verb";
        default:
          return t;
      }
    })
    .join(", ");

  const hasPastMix =
    tenses.includes("past-continuous") &&
    tenses.includes("past-simple") &&
    tenses.includes("past-perfect");

  const schemaBlock = hasPastMix
    ? `
Past tense schema (MANDATORY when using these tenses):
- Past Continuous: background / scene / actions in progress (was/were + V-ing). Use for atmosphere.
- Past Simple: events (short actions, points on timeline). Use for what happened.
- Past Perfect: before the event (had + V3). Use for what had happened earlier.
Build the story in this order: background → event → what had happened before.`
    : "";

  return `You are an English storyteller. Write a natural story at B1 level.

HARD RULES:
- Length: 180-240 words. One continuous narration. No bullet lists, no meta commentary.
- Language level: B1. No literary or rare vocabulary. ${B1_VOCAB_HINTS}
- Grammar patterns to use: ${tenseHints}
- Include 10–12 clear instances of these verb structures across the story.
- Every occurrence of a selected tense structure MUST be a gap. Do NOT write target forms in plain text if they belong to selected tenses. If you use "was walking" or "had finished", that MUST become a gap.
- Keep multi-word verb forms compact and adjacent. NO adverbs between auxiliary and main verb (e.g. "had always enjoyed" is forbidden; use "had enjoyed" or a different structure).
- You may use other tenses as minimal "glue" (e.g. Present Simple for facts), but: no gaps for non-selected tenses; keep glue simple and B1.

Narrative profile:
- Label: ${profileConfig.label}
- Description: ${profileConfig.description}
${schemaBlock}

Return only the story text.`;
}

function isRetryableError(res: Response, text: string): boolean {
  if (res.status >= 500) return true;
  if (res.status === 429) return true;
  const lower = text.toLowerCase();
  if (lower.includes("model") && (lower.includes("unavailable") || lower.includes("not found"))) return true;
  return false;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ text: string }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: STORY_TEMPERATURE,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content:
            "You are an English storyteller. Output only clean story prose. B1 level. No literary vocabulary. Every selected tense structure must appear as a gap candidate (compact forms, no adverbs inside).",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`OpenAI HTTP ${res.status}: ${text}`);
    (err as Error & { res: Response; text: string }).res = res;
    (err as Error & { res: Response; text: string }).text = text;
    throw err;
  }

  let jsonRaw: unknown;
  try {
    jsonRaw = JSON.parse(text);
  } catch {
    throw new Error(`OpenAI response not JSON: ${text}`);
  }

  const json = jsonRaw as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned empty content.");
  }

  return { text: content.trim() };
}

async function generateRawNarration(profile: StoryProfileKey, _attempt: number): Promise<string> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const prompt = buildNarrationPrompt(profile);

  let lastError: Error | null = null;

  try {
    const { text } = await callOpenAI(apiKey, MODEL_PRIMARY, prompt);
    if (process.env.NODE_ENV !== "production") {
      console.log("STORY_MODEL_USED", MODEL_PRIMARY);
    }
    const storyText = normalizeSpacing(text);
    const words = countWords(storyText);
    if (words < 150 || words > 250) {
      throw new Error(`Story length out of range: ${words}`);
    }
    return storyText;
  } catch (e) {
    lastError = e instanceof Error ? e : new Error(String(e));
    const err = lastError as Error & { res?: Response; text?: string };
    const res = err.res;
    const text = err.text ?? "";
    if (res && isRetryableError(res, text)) {
      if (process.env.NODE_ENV !== "production") {
        console.log("STORY_MODEL_FALLBACK", MODEL_FALLBACK);
      }
      const { text: fallbackText } = await callOpenAI(apiKey, MODEL_FALLBACK, prompt);
      const storyText = normalizeSpacing(fallbackText);
      const words = countWords(storyText);
      if (words < 150 || words > 250) {
        throw new Error(`Story length out of range: ${words}`);
      }
      return storyText;
    }
    throw lastError;
  }
}

function tokenizeWithOffsets(text: string): Array<{ value: string; lower: string; start: number; end: number }> {
  const tokens: Array<{ value: string; lower: string; start: number; end: number }> = [];
  const re = /[A-Za-z]+(?:'[A-Za-z]+)?/g;
  let match = re.exec(text);
  while (match) {
    const value = match[0];
    tokens.push({
      value,
      lower: value.toLowerCase(),
      start: match.index,
      end: match.index + value.length,
    });
    match = re.exec(text);
  }
  return tokens;
}

function buildIrregularReverse(irregular: Record<string, IrregularForms>) {
  const pastToBase = new Map<string, string>();
  const v3ToBase = new Map<string, string>();
  for (const [baseRaw, forms] of Object.entries(irregular)) {
    const base = baseRaw.toLowerCase();
    pastToBase.set(forms.past.toLowerCase(), base);
    v3ToBase.set(forms.pastParticiple.toLowerCase(), base);
    for (const variant of forms.pastVariants ?? []) {
      pastToBase.set(variant.toLowerCase(), base);
    }
    for (const variant of forms.pastParticipleVariants ?? []) {
      v3ToBase.set(variant.toLowerCase(), base);
    }
  }
  return { pastToBase, v3ToBase };
}

function baseCandidatesFromIng(ingForm: string): string[] {
  const ing = ingForm.toLowerCase();
  if (!ing.endsWith("ing") || ing.length < 5) return [];
  const root = ing.slice(0, -3);
  const candidates = new Set<string>();
  candidates.add(root);
  candidates.add(root + "e");
  if (root.endsWith(root.slice(-1) + root.slice(-1))) {
    candidates.add(root.slice(0, -1));
  }
  if (ing.endsWith("ying")) {
    candidates.add(ing.slice(0, -4) + "ie");
  }
  return Array.from(candidates).filter(isWord);
}

function baseCandidatesFromEd(edForm: string): string[] {
  const ed = edForm.toLowerCase();
  const candidates = new Set<string>();
  if (ed.endsWith("ied") && ed.length > 3) {
    candidates.add(ed.slice(0, -3) + "y");
  }
  if (ed.endsWith("ed") && ed.length > 3) {
    const root = ed.slice(0, -2);
    candidates.add(root);
    candidates.add(root + "e");
    if (root.length > 2 && root.slice(-1) === root.slice(-2, -1)) {
      candidates.add(root.slice(0, -1));
    }
  }
  return Array.from(candidates).filter(isWord);
}

function deriveThirdPersonBase(word: string): string[] {
  const w = word.toLowerCase();
  const out = new Set<string>();
  if (w.endsWith("ies") && w.length > 3) out.add(w.slice(0, -3) + "y");
  if (w.endsWith("es") && w.length > 2) out.add(w.slice(0, -2));
  if (w.endsWith("s") && w.length > 1) out.add(w.slice(0, -1));
  return Array.from(out).filter(isWord);
}

function pickValidBase(
  tense: GrammarTenseSlug,
  answer: string,
  candidates: string[],
  irregular: Record<string, IrregularForms>
): string | null {
  for (const candidate of candidates) {
    const normalized = normalizeBaseVerb(candidate);
    const validation = validateGapAnswer({
      tense: tense as import("@/lib/grammar/formEngine").TenseSlug,
      baseVerb: normalized,
      correctAnswer: answer,
      irregular,
    });
    if (validation.ok) return normalized;
  }
  return null;
}

function normalizeBaseVerb(baseVerb: string): string {
  const b = baseVerb.trim().toLowerCase();
  if (!b) return baseVerb;
  const fixed = MALFORMED_BASE_FIXES[b];
  if (fixed) return fixed;
  if (b === "was" || b === "were") return "be";
  if (b === "had") return "have";
  if (b.length > 3 && b.slice(-1) === b.slice(-2, -1)) {
    const single = b.slice(0, -1);
    if (MALFORMED_BASE_FIXES[single] !== undefined) return MALFORMED_BASE_FIXES[single];
  }
  return b;
}

function extractCandidates(
  story: string,
  selectedTenses: readonly GrammarTenseSlug[],
  irregular: Record<string, IrregularForms>
): GapCandidate[] {
  const selected = new Set(selectedTenses);
  const tokens = tokenizeWithOffsets(story);
  const out: GapCandidate[] = [];
  const { pastToBase, v3ToBase } = buildIrregularReverse(irregular);

  for (let i = 0; i < tokens.length; i += 1) {
    const t0 = tokens[i];
    const t1 = tokens[i + 1];
    const t2 = tokens[i + 2];

    if (
      selected.has("future-perfect-simple") &&
      t0?.lower === "will" &&
      t1?.lower === "have" &&
      t2 &&
      isWord(t2.lower)
    ) {
      const answer = `will have ${t2.lower}`;
      const base =
        v3ToBase.get(t2.lower) ??
        pickValidBase("future-perfect-simple", answer, baseCandidatesFromEd(t2.lower), irregular);
      if (base) {
        out.push({
          start: t0.start,
          end: t2.end,
          tense: "future-perfect-simple",
          baseVerb: base,
          correctAnswer: answer,
        });
        i += 2;
        continue;
      }
    }
    if (
      selected.has("future-perfect-simple") &&
      t0?.lower === "will" &&
      t1?.lower === "have" &&
      t2 &&
      OPTIONAL_ADVERBS.has(t2.lower) &&
      tokens[i + 3] &&
      isWord(tokens[i + 3].lower)
    ) {
      const t3 = tokens[i + 3];
      const answer = `will have ${t3.lower}`;
      const base =
        v3ToBase.get(t3.lower) ??
        pickValidBase("future-perfect-simple", answer, baseCandidatesFromEd(t3.lower), irregular);
      if (base) {
        out.push({
          start: t0.start,
          end: t3.end,
          tense: "future-perfect-simple",
          baseVerb: base,
          correctAnswer: answer,
        });
        i += 3;
        continue;
      }
    }

    if (
      selected.has("present-perfect-continuous") &&
      t0 &&
      (t0.lower === "have" || t0.lower === "has") &&
      t1?.lower === "been" &&
      t2 &&
      t2.lower.endsWith("ing")
    ) {
      const answer = `${t0.lower} been ${t2.lower}`;
      const base = pickValidBase("present-perfect-continuous", answer, baseCandidatesFromIng(t2.lower), irregular);
      if (base) {
        out.push({
          start: t0.start,
          end: t2.end,
          tense: "present-perfect-continuous",
          baseVerb: base,
          correctAnswer: answer,
        });
        i += 2;
        continue;
      }
    }

    if (selected.has("past-continuous") && t0 && (t0.lower === "was" || t0.lower === "were") && t1 && t1.lower.endsWith("ing")) {
      const answer = `${t0.lower} ${t1.lower}`;
      const base = pickValidBase("past-continuous", answer, baseCandidatesFromIng(t1.lower), irregular);
      if (base) {
        out.push({
          start: t0.start,
          end: t1.end,
          tense: "past-continuous",
          baseVerb: base,
          correctAnswer: answer,
        });
        i += 1;
        continue;
      }
    }

    if (selected.has("past-perfect") && t0?.lower === "had" && t1 && isWord(t1.lower)) {
      const answer = `had ${t1.lower}`;
      const base = v3ToBase.get(t1.lower) ?? pickValidBase("past-perfect", answer, baseCandidatesFromEd(t1.lower), irregular);
      if (base) {
        out.push({
          start: t0.start,
          end: t1.end,
          tense: "past-perfect",
          baseVerb: base,
          correctAnswer: answer,
        });
        i += 1;
        continue;
      }
    }
    if (
      selected.has("past-perfect") &&
      t0?.lower === "had" &&
      t1 &&
      OPTIONAL_ADVERBS.has(t1.lower) &&
      t2 &&
      isWord(t2.lower)
    ) {
      const answer = `had ${t2.lower}`;
      const base = v3ToBase.get(t2.lower) ?? pickValidBase("past-perfect", answer, baseCandidatesFromEd(t2.lower), irregular);
      if (base) {
        out.push({
          start: t0.start,
          end: t2.end,
          tense: "past-perfect",
          baseVerb: base,
          correctAnswer: answer,
        });
        i += 2;
        continue;
      }
    }

    if (selected.has("present-perfect") && t0 && (t0.lower === "have" || t0.lower === "has") && t1 && isWord(t1.lower)) {
      const answer = `${t0.lower} ${t1.lower}`;
      const base = v3ToBase.get(t1.lower) ?? pickValidBase("present-perfect", answer, baseCandidatesFromEd(t1.lower), irregular);
      if (base) {
        out.push({
          start: t0.start,
          end: t1.end,
          tense: "present-perfect",
          baseVerb: base,
          correctAnswer: answer,
        });
        i += 1;
        continue;
      }
    }
    if (
      selected.has("present-perfect") &&
      t0 &&
      (t0.lower === "have" || t0.lower === "has") &&
      t1 &&
      OPTIONAL_ADVERBS.has(t1.lower) &&
      t2 &&
      isWord(t2.lower)
    ) {
      const answer = `${t0.lower} ${t2.lower}`;
      const base = v3ToBase.get(t2.lower) ?? pickValidBase("present-perfect", answer, baseCandidatesFromEd(t2.lower), irregular);
      if (base) {
        out.push({
          start: t0.start,
          end: t2.end,
          tense: "present-perfect",
          baseVerb: base,
          correctAnswer: answer,
        });
        i += 2;
        continue;
      }
    }

    if (selected.has("future-simple") && t0?.lower === "will" && t1 && isWord(t1.lower)) {
      const answer = `will ${t1.lower}`;
      const base = pickValidBase("future-simple", answer, [t1.lower], irregular);
      if (base) {
        out.push({
          start: t0.start,
          end: t1.end,
          tense: "future-simple",
          baseVerb: base,
          correctAnswer: answer,
        });
        i += 1;
        continue;
      }
    }

    if (
      selected.has("past-simple") &&
      t0 &&
      isWord(t0.lower) &&
      !KNOWN_AUX.has(t0.lower) &&
      !(tokens[i - 1] && KNOWN_AUX.has(tokens[i - 1].lower))
    ) {
      const fromIrregular = pastToBase.get(t0.lower);
      const fromRegular = t0.lower.endsWith("ed")
        ? pickValidBase("past-simple", t0.lower, baseCandidatesFromEd(t0.lower), irregular)
        : null;
      const base = fromIrregular ?? fromRegular;
      if (base) {
        out.push({
          start: t0.start,
          end: t0.end,
          tense: "past-simple",
          baseVerb: base,
          correctAnswer: t0.lower,
        });
        continue;
      }
    }

    if (
      selected.has("present-simple") &&
      t0 &&
      isWord(t0.lower) &&
      !KNOWN_AUX.has(t0.lower) &&
      !(tokens[i - 1] && KNOWN_AUX.has(tokens[i - 1].lower))
    ) {
      const prev = tokens[i - 1]?.lower ?? "";
      if (!SIMPLE_SUBJECTS.has(prev)) continue;

      const answer = t0.lower;
      const candidateBases =
        prev === "he" || prev === "she" || prev === "it"
          ? [t0.lower, ...deriveThirdPersonBase(t0.lower)]
          : [t0.lower];
      const validBase = pickValidBase("present-simple", answer, candidateBases, irregular);
      if (validBase) {
        out.push({
          start: t0.start,
          end: t0.end,
          tense: "present-simple",
          baseVerb: validBase,
          correctAnswer: answer,
        });
        continue;
      }
    }
  }

  return out;
}

function overlaps(a: GapCandidate, b: GapCandidate): boolean {
  return a.start < b.end && b.start < a.end;
}

function overlapsAny(candidate: GapCandidate, spans: Array<{ start: number; end: number }>): boolean {
  return spans.some((s) => candidate.start < s.end && s.start < candidate.end);
}

function findAutopromoteCandidates(
  story: string,
  selectedTenses: readonly GrammarTenseSlug[],
  irregular: Record<string, IrregularForms>,
  excludedSpans: Array<{ start: number; end: number }>
): GapCandidate[] {
  const all = extractCandidates(story, selectedTenses, irregular);
  const promoted: GapCandidate[] = [];
  for (const c of all) {
    if (overlapsAny(c, excludedSpans)) continue;
    if (promoted.some((p) => overlaps(p, c))) continue;
    promoted.push(c);
    if (promoted.length >= MAX_AUTOPROMOTE) break;
  }
  return promoted;
}

function validatePastMixDistribution(
  chosen: GapCandidate[],
  selectedTenses: readonly GrammarTenseSlug[]
): boolean {
  const hasAll =
    selectedTenses.includes("past-continuous") &&
    selectedTenses.includes("past-simple") &&
    selectedTenses.includes("past-perfect");
  if (!hasAll) return true;

  const counts = new Map<GrammarTenseSlug, number>();
  for (const t of selectedTenses) counts.set(t, 0);
  for (const c of chosen) counts.set(c.tense, (counts.get(c.tense) ?? 0) + 1);

  const pc = counts.get("past-continuous") ?? 0;
  const ps = counts.get("past-simple") ?? 0;
  const pp = counts.get("past-perfect") ?? 0;
  return pc >= 3 && ps >= 3 && pp >= 2;
}

function selectBalancedCandidates(
  candidates: GapCandidate[],
  selectedTenses: readonly GrammarTenseSlug[]
): GapCandidate[] | null {
  const byTense = new Map<GrammarTenseSlug, GapCandidate[]>();
  for (const tense of selectedTenses) byTense.set(tense, []);
  for (const c of candidates) {
    const list = byTense.get(c.tense);
    if (list) list.push(c);
  }

  for (const tense of selectedTenses) {
    const list = byTense.get(tense) ?? [];
    if (list.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.error("STORY_GENERATOR_EMPTY_TENSE_CANDIDATES", tense);
      }
      return null;
    }
    list.sort((a, b) => a.start - b.start);
  }

  const coverageOrder = [...selectedTenses].sort(
    (a, b) => (byTense.get(a)?.length ?? 0) - (byTense.get(b)?.length ?? 0)
  );

  function buildCoverage(idx: number, acc: GapCandidate[]): GapCandidate[] | null {
    if (idx >= coverageOrder.length) return acc;
    const tense = coverageOrder[idx];
    const list = byTense.get(tense) ?? [];
    for (const candidate of list) {
      if (acc.every((existing) => !overlaps(existing, candidate))) {
        const found = buildCoverage(idx + 1, [...acc, candidate]);
        if (found) return found;
      }
    }
    return null;
  }

  const chosen = buildCoverage(0, []);
  if (!chosen) {
    if (process.env.NODE_ENV !== "production") {
      console.error("STORY_GENERATOR_COVERAGE_SELECTION_FAILED");
    }
    return null;
  }

  const pool = candidates
    .filter((c) => !chosen.some((x) => x.start === c.start && x.end === c.end && x.tense === c.tense))
    .sort((a, b) => a.start - b.start);

  const maxDesired = Math.min(MAX_GAPS, candidates.length);
  const minDesired = Math.min(MIN_GAPS, maxDesired);

  let round = 0;
  while (chosen.length < maxDesired) {
    const tense = selectedTenses[round % selectedTenses.length];
    const list = byTense.get(tense) ?? [];
    const next = list.find(
      (c) =>
        !chosen.some((x) => x.start === c.start && x.end === c.end) &&
        chosen.every((x) => !overlaps(x, c))
    );
    if (next) {
      chosen.push(next);
    } else {
      const anyNext = pool.find(
        (c) =>
          !chosen.some((x) => x.start === c.start && x.end === c.end && x.tense === c.tense) &&
          chosen.every((x) => !overlaps(x, c))
      );
      if (!anyNext) break;
      chosen.push(anyNext);
    }
    round += 1;
  }

  if (chosen.length < minDesired) {
    if (process.env.NODE_ENV !== "production") {
      console.error("STORY_GENERATOR_TOO_FEW_NON_OVERLAP_CANDIDATES", chosen.length, minDesired);
    }
    return null;
  }

  const perTense = new Map<GrammarTenseSlug, number>();
  for (const tense of selectedTenses) perTense.set(tense, 0);
  for (const c of chosen) perTense.set(c.tense, (perTense.get(c.tense) ?? 0) + 1);
  if (selectedTenses.some((t) => (perTense.get(t) ?? 0) < 1)) return null;

  return chosen.sort((a, b) => a.start - b.start);
}

function injectGapsIntoStory(
  storyText: string,
  selectedTenses: readonly GrammarTenseSlug[],
  irregular: Record<string, IrregularForms>
): { story: string; gaps: StoryGap[]; autopromoteCount?: number } | { error: string } {
  const candidates = extractCandidates(storyText, selectedTenses, irregular);
  let selectedCandidates = selectBalancedCandidates(candidates, selectedTenses);
  if (!selectedCandidates) return { error: "candidate_selection_failed" };

  const excludedSpans = selectedCandidates.map((c) => ({ start: c.start, end: c.end }));
  const autopromote = findAutopromoteCandidates(storyText, selectedTenses, irregular, excludedSpans);
  const toAdd = autopromote.slice(0, Math.min(MAX_AUTOPROMOTE, MAX_GAPS - selectedCandidates.length));
  for (const c of toAdd) {
    if (selectedCandidates.every((x) => !overlaps(x, c))) {
      selectedCandidates = [...selectedCandidates, c].sort((a, b) => a.start - b.start);
    }
  }

  if (!validatePastMixDistribution(selectedCandidates, selectedTenses)) {
    return { error: "past_mix_distribution_failed" };
  }

  const gaps: StoryGap[] = selectedCandidates.map((candidate, idx) => ({
    id: `g${idx + 1}`,
    baseVerb: normalizeBaseVerb(candidate.baseVerb),
    correctAnswer: candidate.correctAnswer,
    tense: candidate.tense,
  }));

  let story = storyText;
  const replacements = selectedCandidates
    .map((candidate, idx) => ({
      start: candidate.start,
      end: candidate.end,
      placeholder: `{{g${idx + 1}}}`,
      gap: gaps[idx],
    }))
    .sort((a, b) => b.start - a.start);

  for (const r of replacements) {
    story = story.slice(0, r.start) + r.placeholder + story.slice(r.end);
  }

  for (const gap of gaps) {
    const validation = validateGapAnswer({
      tense: gap.tense as import("@/lib/grammar/formEngine").TenseSlug,
      baseVerb: gap.baseVerb,
      correctAnswer: gap.correctAnswer,
      irregular,
    });
    if (!validation.ok) {
      return { error: `form_validation_failed:${gap.id}:${validation.reason}` };
    }
  }

  const placeholders = Array.from(story.matchAll(/\{\{(g\d+)\}\}/g)).map((m) => m[1]);
  if (placeholders.length !== gaps.length) return { error: "placeholder_gap_count_mismatch" };
  if (new Set(placeholders).size !== placeholders.length) return { error: "duplicate_placeholders" };
  for (const gap of gaps) {
    const count = (story.match(new RegExp(`\\{\\{${gap.id}\\}\\}`, "g")) ?? []).length;
    if (count !== 1) return { error: `placeholder_count_mismatch:${gap.id}` };
  }

  const tenseCounts = new Map<GrammarTenseSlug, number>();
  for (const tense of selectedTenses) tenseCounts.set(tense, 0);
  for (const gap of gaps) tenseCounts.set(gap.tense, (tenseCounts.get(gap.tense) ?? 0) + 1);
  if (selectedTenses.some((tense) => (tenseCounts.get(tense) ?? 0) < 1)) {
    return { error: "tense_balance_failed" };
  }

  const autopromoteCount = toAdd.length;
  if (process.env.NODE_ENV !== "production") {
    const dist = Object.fromEntries(
      Array.from(tenseCounts.entries()).map(([k, v]) => [k, v])
    );
    console.log("STORY_GAPS", {
      count: gaps.length,
      tenseDistribution: dist,
      autopromoteCount,
    });
  }

  return { story, gaps, autopromoteCount };
}

async function buildStoryPayload(
  profile: StoryProfileKey,
  irregular: Record<string, IrregularForms>
): Promise<{ ok: true; data: StoryPayload } | { ok: false; reason: string }> {
  const selectedTenses = STORY_PROFILES[profile].tenses;

  for (let attempt = 0; attempt < STORY_ATTEMPTS; attempt += 1) {
    try {
      const rawStory = await generateRawNarration(profile, attempt);
      const injected = injectGapsIntoStory(rawStory, selectedTenses, irregular);
      if ("error" in injected) {
        if (process.env.NODE_ENV !== "production") {
          console.error("STORY_GENERATOR_GAP_INJECTION_FAILED", injected.error);
        }
        continue;
      }
      return {
        ok: true,
        data: {
          ...injected,
          title: STORY_PROFILES[profile].label,
          profile,
        },
      };
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("STORY_GENERATOR_ATTEMPT_FAIL", e);
      }
    }
  }

  return { ok: false, reason: "gap_injection_failed" };
}

function maybeRefillPool(profile: StoryProfileKey, irregular: Record<string, IrregularForms>) {
  if (poolSize(profile) >= CACHE_REFILL_FLOOR) return;
  if (refillInFlight.has(profile)) return;
  refillInFlight.add(profile);

  void (async () => {
    try {
      while (poolSize(profile) < CACHE_REFILL_FLOOR) {
        const built = await buildStoryPayload(profile, irregular);
        if (!built.ok) break;
        pushToPool(profile, built.data);
      }
    } finally {
      refillInFlight.delete(profile);
    }
  })();
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const profileRaw = String(body?.profile ?? "").trim();
    if (!profileRaw) {
      return NextResponse.json({ error: "profile is required", reason: "profile_required" }, { status: 400 });
    }
    if (!isProfileKey(profileRaw)) {
      return NextResponse.json({ error: "Invalid profile", reason: "invalid_profile" }, { status: 400 });
    }
    const profile = profileRaw as StoryProfileKey;

    let irregular: Record<string, IrregularForms>;
    try {
      irregular = await getIrregularMap();
    } catch (e) {
      console.error("STORY_GENERATOR_IRREGULAR_LOAD_FAIL", process.env.NODE_ENV !== "production" ? e : "");
      return NextResponse.json({ error: "story_generation_failed", reason: "irregular_load_failed" }, { status: 500 });
    }

    const fromPool = popFromPool(profile);
    if (fromPool) {
      maybeRefillPool(profile, irregular);
      return NextResponse.json({ ok: true, data: fromPool, source: "cache" });
    }

    const built = await buildStoryPayload(profile, irregular);
    if (!built.ok) {
      return NextResponse.json({ error: "story_generation_failed", reason: built.reason }, { status: 500 });
    }

    maybeRefillPool(profile, irregular);
    return NextResponse.json({ ok: true, data: built.data, source: "generated" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
