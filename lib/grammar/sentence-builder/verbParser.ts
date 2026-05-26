/**
 * verbParser.ts
 *
 * Parses a plain English sentence and extracts:
 *  - the main verb in base form
 *  - the complement (object/place after the verb)
 *
 * Strategy: pattern-based tokenisation, ordered from most reliable (after auxiliaries)
 * to least reliable (raw subject + inflected verb). The user always gets a chance to
 * correct the detected verb before building.
 */

import type { SentenceBuilderVerb } from "./types";

// ─── Result type ──────────────────────────────────────────────────────────────

export type SentenceParseResult = {
  verb: string;
  complement: string;
  confidence: "high" | "medium" | "low";
  note: string;
};

// ─── Hardcoded reverse lookup (past / pp → base) ─────────────────────────────

const IRREGULAR_REVERSE: Record<string, string> = {
  // be
  was: "be", were: "be", been: "be",
  // have
  had: "have",
  // do
  did: "do", done: "do",
  // go
  went: "go", gone: "go",
  // come
  came: "come",
  // say
  said: "say",
  // get
  got: "get", gotten: "get",
  // make
  made: "make",
  // know
  knew: "know", known: "know",
  // take
  took: "take", taken: "take",
  // see
  saw: "see", seen: "see",
  // give
  gave: "give", given: "give",
  // find
  found: "find",
  // think
  thought: "think",
  // tell
  told: "tell",
  // become
  became: "become",
  // leave
  left: "leave",
  // feel
  felt: "feel",
  // put: same form
  // bring
  brought: "bring",
  // keep
  kept: "keep",
  // begin
  began: "begin", begun: "begin",
  // run
  ran: "run",
  // sit
  sat: "sit",
  // eat
  ate: "eat", eaten: "eat",
  // drink
  drank: "drink", drunk: "drink",
  // write
  wrote: "write", written: "write",
  // speak
  spoke: "speak", spoken: "speak",
  // break
  broke: "break", broken: "break",
  // choose
  chose: "choose", chosen: "choose",
  // drive
  drove: "drive", driven: "drive",
  // fall
  fell: "fall", fallen: "fall",
  // fly
  flew: "fly", flown: "fly",
  // forget
  forgot: "forget", forgotten: "forget",
  // grow
  grew: "grow", grown: "grow",
  // hide
  hid: "hide", hidden: "hide",
  // hold
  held: "hold",
  // lead
  led: "lead",
  // lose
  lost: "lose",
  // meet
  met: "meet",
  // pay
  paid: "pay",
  // ride
  rode: "ride", ridden: "ride",
  // rise
  rose: "rise", risen: "rise",
  // send
  sent: "send",
  // show
  shown: "show",
  // sleep
  slept: "sleep",
  // stand
  stood: "stand",
  // steal
  stole: "steal", stolen: "steal",
  // swim
  swam: "swim", swum: "swim",
  // teach
  taught: "teach",
  // throw
  threw: "throw", thrown: "throw",
  // understand
  understood: "understand",
  // win
  won: "win",
  // wear
  wore: "wear", worn: "wear",
  // hear
  heard: "hear",
  // buy
  bought: "buy",
  // build
  built: "build",
  // spend
  spent: "spend",
  // catch
  caught: "catch",
  // fight
  fought: "fight",
  // light
  lit: "light",
  // mean
  meant: "mean",
  // sell
  sold: "sell",
  // sing
  sang: "sing", sung: "sing",
  // strike
  struck: "strike",
  // wake
  woke: "wake", woken: "wake",
  // lie (recline)
  lay: "lie", lain: "lie",
  // read — same spelling, ambiguous; skip
};

// ─── Character helpers ────────────────────────────────────────────────────────

function isConsonant(c: string): boolean {
  return /^[bcdfghjklmnpqrstvwxyz]$/i.test(c);
}

function isVowel(c: string): boolean {
  return /^[aeiou]$/i.test(c);
}

// ─── De-inflection ────────────────────────────────────────────────────────────

/** "-ing" form → base form.  eating→eat, running→run, making→make, studying→study */
export function deIngToBase(word: string): string {
  if (!word.endsWith("ing") || word.length < 4) return word;
  const stem = word.slice(0, -3);
  if (!stem) return word;

  // lying→lie, dying→die, tying→tie
  if (stem.endsWith("y") && stem.length >= 2 && isConsonant(stem.slice(-2, -1))) {
    return stem.slice(0, -1) + "ie";
  }

  // double consonant: running→run, swimming→swim, getting→get
  const last = stem.slice(-1);
  const secondLast = stem.length >= 2 ? stem.slice(-2, -1) : "";
  if (stem.length >= 2 && last === secondLast && isConsonant(last)) {
    return stem.slice(0, -1);
  }

  // dropped 'e': making→make, giving→give, coming→come, writing→write
  // Pattern: consonant–vowel–consonant (CVC) at end without w/x/y
  if (stem.length >= 3) {
    const l1 = stem.slice(-1);
    const l2 = stem.slice(-2, -1);
    const l3 = stem.slice(-3, -2);
    if (isConsonant(l1) && isVowel(l2) && isConsonant(l3) && !/[wxy]/.test(l1)) {
      return stem + "e";
    }
  }

  return stem;
}

/** Third-person singular "-s/-es/-ies" → base form.  eats→eat, goes→go, studies→study */
export function deSToBase(word: string): string {
  if (word.endsWith("ies") && word.length > 3) return word.slice(0, -3) + "y";
  // watches, teaches, passes, buzzes, goes (oes)
  if (
    word.endsWith("ches") || word.endsWith("shes") || word.endsWith("ses") ||
    word.endsWith("xes")  || word.endsWith("zes")  || word.endsWith("oes")
  ) {
    return word.slice(0, -2); // remove "es"
  }
  if (word.endsWith("es") && word.length > 3) return word.slice(0, -2);
  if (word.endsWith("s")  && word.length > 2) return word.slice(0, -1);
  return word;
}

/** Regular past "-ed" form → base form.  walked→walk, stopped→stop, loved→love */
export function deEdToBase(word: string): string {
  if (word.endsWith("ied") && word.length > 3) return word.slice(0, -3) + "y";
  if (!word.endsWith("ed") || word.length < 3) return word;
  const stem = word.slice(0, -2);

  // double consonant: stopped→stop, dropped→drop
  const last = stem.slice(-1);
  const secondLast = stem.length >= 2 ? stem.slice(-2, -1) : "";
  if (stem.length >= 2 && last === secondLast && isConsonant(last)) {
    return stem.slice(0, -1);
  }

  // dropped 'e': loved→love, baked→bake (stem = "lov", "bak")
  if (stem.length >= 3) {
    const l1 = stem.slice(-1);
    const l2 = stem.slice(-2, -1);
    const l3 = stem.slice(-3, -2);
    if (isConsonant(l1) && isVowel(l2) && isConsonant(l3)) return stem + "e";
  }

  return stem;
}

// ─── Reverse map builder ─────────────────────────────────────────────────────

function buildReverseMap(loaded: SentenceBuilderVerb[]): Record<string, string> {
  const map: Record<string, string> = { ...IRREGULAR_REVERSE };
  for (const v of loaded) {
    const b = v.base.toLowerCase();
    if (v.past && v.past !== b)           map[v.past.toLowerCase()] = b;
    if (v.pastParticiple && v.pastParticiple !== b) map[v.pastParticiple.toLowerCase()] = b;
  }
  return map;
}

// ─── Token sets ───────────────────────────────────────────────────────────────

const SUBJECTS     = new Set(["i","you","he","she","it","we","they"]);
const MODALS       = new Set(["can","could","should","must","might","may","would","shall"]);
const BE_FORMS     = new Set(["is","am","are","was","were","be"]);
const HAVE_FORMS   = new Set(["have","has","had"]);
const DO_FORMS     = new Set(["do","does","did"]);

// negative contractions → the expanded auxiliary form
const NEG_TO_AUX: Record<string, string> = {
  "can't":"can","cannot":"can","couldn't":"could","shouldn't":"should",
  "mustn't":"must","mightn't":"might","mayn't":"may","wouldn't":"would",
  "won't":"will","shan't":"shall","isn't":"is","aren't":"are",
  "wasn't":"was","weren't":"were","hasn't":"has","haven't":"have",
  "hadn't":"had","doesn't":"does","don't":"do","didn't":"did",
};

// ─── Common English base-form verbs (used for gibberish detection) ────────────

const COMMON_BASE_VERBS = new Set([
  // Core
  "be","have","do","go","get","make","know","take","see","come","think","look",
  "want","give","use","find","tell","ask","seem","feel","try","leave","call",
  "keep","let","begin","show","hear","play","run","move","live","believe","hold",
  "bring","happen","write","provide","sit","stand","lose","pay","meet","include",
  "continue","set","learn","change","lead","understand","watch","follow","stop",
  "create","speak","read","spend","grow","open","walk","win","offer","remember",
  "love","consider","appear","buy","wait","serve","die","send","expect","build",
  "stay","fall","cut","reach","kill","remain","suggest","raise","pass","sell",
  "require","report","decide","pull","break","need","work","eat","drink","sleep",
  "drive","fly","swim","fight","wear","choose","rise","help","start","turn","put",
  "carry","save","catch","explain","face","talk","produce","name","describe","pick",
  "allow","fill","return","develop","support","reduce","close","discuss","increase",
  "add","cover","draw","check","visit","receive","hit","point","claim","deal",
  "join","enjoy","avoid","hope","express","mix","enter","apply","listen","accept",
  "experience","share","achieve","push","skip","jump","climb","sing","dance",
  "smile","laugh","cry","teach","study","practise","practice","exercise","train",
  "prepare","test","fix","clean","cook","answer","reply","miss","care","mind",
  "mean","place","hold","let","keep","move","take","show","bring","give","find",
  "think","know","take","come","go","see","want","get","make","say",
  "look","use","find","give","tell","ask","seem","feel","try","leave","call",
  "sit","stand","hear","play","run","walk","read","write","speak","buy","sell",
  "pay","send","receive","open","close","start","stop","wait","follow","watch",
  "pull","push","turn","put","carry","save","catch","reach","raise","pass","cut",
  "fall","rise","break","grow","set","lead","build","spend","win","lose","pay",
  "serve","stay","die","fly","swim","fight","wear","choose","ride","drive",
  "sing","steal","wake","hide","meet","teach","understand","bring","think",
  "keep","hold","mean","send","show","sleep","stand","steal","throw","wear",
  "beat","bend","bind","bite","blow","burn","buy","cast","catch","cling",
  "cost","creep","deal","dig","draw","dream","feed","feel","flee","forget",
  "forgive","freeze","grind","hang","hurt","kneel","knit","leap","lend",
  "let","lie","light","lose","mistake","overcome","prove","quit","ring","rise",
  "seek","shake","shed","shine","shoot","shrink","shut","sink","slide","smell",
  "spell","spend","spin","spit","split","spread","spring","squeeze","stick",
  "sting","strike","strive","swear","sweep","swing","tear","think","thrust",
  "tread","upset","weep","wind","withdraw","wring","type","press","drag",
  "drop","grab","lift","touch","throw","kick","wave","point","sign","mark",
  "draw","paint","print","copy","scan","record","film","photograph","measure",
  "count","calculate","estimate","analyse","analyze","compare","test","check",
  "search","find","locate","identify","classify","sort","arrange","organise",
  "organize","manage","control","direct","lead","guide","advise","warn","inform",
  "notify","announce","declare","explain","describe","define","illustrate",
  "demonstrate","prove","confirm","verify","validate","approve","reject","deny",
  "refuse","allow","permit","prevent","protect","secure","ensure","guarantee",
  "promise","agree","disagree","argue","debate","discuss","negotiate","decide",
  "choose","select","prefer","recommend","suggest","propose","offer","request",
  "demand","require","need","want","wish","hope","expect","assume","suppose",
  "imagine","consider","believe","think","feel","know","understand","realize",
  "recognise","recognize","remember","forget","recall","remind","notice","observe",
  "perceive","see","watch","look","listen","hear","smell","taste","touch","feel",
]);

// ─── Compound / complex sentence conjunctions ─────────────────────────────────

const COMPOUND_CONJUNCTIONS = new Set([
  "and","but","or","nor","so","yet",
  "because","since","although","though","even","while","whilst",
  "when","whenever","where","wherever","if","unless","until","once",
  "after","before","as","whereas","whether","provided","given","despite",
]);

// ─── Time-marker stripping ────────────────────────────────────────────────────

const TIME_MARKERS = [
  "every day","every week","every morning","every night","every year",
  "yesterday","last night","last week","last year","two days ago",
  "today","tomorrow","now","later","already","recently","just",
  "always","usually","often","never","sometimes","still",
];

function stripTimeMarkers(text: string): string {
  let result = text;
  for (const m of TIME_MARKERS) {
    result = result.replace(new RegExp(`\\b${m}\\b`, "gi"), "");
  }
  return result.replace(/\s+/g, " ").trim();
}

// ─── Tokeniser ────────────────────────────────────────────────────────────────

function tokenize(sentence: string): string[] {
  return sentence
    .replace(/[?!.,;:"']/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase());
}

// ─── Core extraction helper ───────────────────────────────────────────────────

/**
 * Given a token that we know is NOT in base form, try to convert it to base.
 * Flags control which transformations are allowed.
 */
function toBaseForm(
  token: string,
  reverseMap: Record<string, string>,
  allowIng = false,
  allowS   = false,
  allowEd  = false,
): { base: string; method: string } | null {
  if (reverseMap[token]) return { base: reverseMap[token], method: "irregular" };
  if (allowIng && token.endsWith("ing")) {
    const b = deIngToBase(token);
    if (b !== token) return { base: b, method: "-ing" };
  }
  if (allowEd && token.endsWith("ed")) {
    const b = deEdToBase(token);
    if (b !== token) return { base: b, method: "-ed" };
  }
  if (allowS && (token.endsWith("s") || token.endsWith("es"))) {
    const b = deSToBase(token);
    if (b !== token) return { base: b, method: "-s" };
  }
  return null;
}

// ─── Gibberish / unrecognised input check ────────────────────────────────────

/**
 * Returns true if at least one token looks like a real English word.
 * Checks: known grammar words, irregular verb forms, de-inflectable tokens,
 * words that have a vowel AND appear in the common-verb set.
 */
function looksLikeEnglish(
  tokens: string[],
  reverseMap: Record<string, string>,
): boolean {
  const knownGrammar = new Set([
    ...SUBJECTS, ...MODALS, ...BE_FORMS, ...HAVE_FORMS, ...DO_FORMS,
    ...Object.keys(NEG_TO_AUX),
    // Very common function words
    "a","an","the","this","that","these","those",
    "my","your","his","her","its","our","their",
    "some","any","all","no","not","also","very",
    "to","in","on","at","for","with","by","from",
    "about","as","into","out","up","down","over",
    "and","but","or","if","when","because","so",
  ]);

  for (const t of tokens) {
    if (knownGrammar.has(t)) return true;
    if (reverseMap[t]) return true;
    if (COMMON_BASE_VERBS.has(t)) return true;
    // De-inflectable → likely a real verb
    if (t.endsWith("ing") && deIngToBase(t) !== t) return true;
    if (t.endsWith("ed")  && deEdToBase(t)  !== t) return true;
    if ((t.endsWith("s") || t.endsWith("es")) && deSToBase(t) !== t) {
      // Only count if the stripped form is in COMMON_BASE_VERBS or reverseMap values
      const stripped = deSToBase(t);
      if (COMMON_BASE_VERBS.has(stripped) || Object.values(reverseMap).includes(stripped)) {
        return true;
      }
    }
  }
  return false;
}

// ─── Main public function ────────────────────────────────────────────────────

export function parseSentence(
  sentence: string,
  loadedIrregulars: SentenceBuilderVerb[],
): SentenceParseResult | null {
  const raw = sentence.trim();
  if (!raw) return null;

  const tokens = tokenize(raw);
  if (tokens.length === 0) return null;

  const reverseMap = buildReverseMap(loadedIrregulars);

  // ── Gibberish / non-English input guard ───────────────────────────────────
  if (!looksLikeEnglish(tokens, reverseMap)) return null;

  let verbIndex = -1;
  let verb      = "";
  let confidence: SentenceParseResult["confidence"] = "low";
  let note      = "";

  function complement(): string {
    if (verbIndex < 0) return "";
    const rest = tokens.slice(verbIndex + 1).join(" ");
    return stripTimeMarkers(rest);
  }

  // ── 1. Negated modal contractions (can't, shouldn't, won't…) ─────────────
  for (let i = 0; i < tokens.length && !verb; i++) {
    const aux = NEG_TO_AUX[tokens[i]];
    if (!aux || !MODALS.has(aux) && aux !== "will") continue;

    const next  = tokens[i + 1];
    const next2 = tokens[i + 2];
    const next3 = tokens[i + 3];

    if (next === "have" && next2 === "been" && next3?.endsWith("ing")) {
      // can't have been doing → perfect continuous
      verbIndex = i + 3; verb = deIngToBase(next3); confidence = "high";
      note = `Modal perfect continuous po "${tokens[i]}"`;
    } else if (next === "have" && next2) {
      // can't have + pp → perfect
      const r = toBaseForm(next2, reverseMap, false, false, true);
      verbIndex = i + 2;
      verb      = r?.base ?? next2;
      confidence = "high";
      note      = `Modal perfect po "${tokens[i]}"`;
    } else if (next === "be" && next2?.endsWith("ing")) {
      // can't be eating → continuous
      verbIndex = i + 2;
      verb      = deIngToBase(next2);
      confidence = "high";
      note      = `Modal continuous po "${tokens[i]}"`;
    } else if (next) {
      // can't eat
      verbIndex = i + 1;
      verb      = next;
      confidence = "high";
      note      = `Base form po "${tokens[i]}"`;
    }
  }

  // ── 2. Modals (can, could, should…) ──────────────────────────────────────
  for (let i = 0; i < tokens.length && !verb; i++) {
    if (!MODALS.has(tokens[i])) continue;
    const next  = tokens[i + 1];
    const next2 = tokens[i + 2];
    const next3 = tokens[i + 3];

    if (!next) continue;

    if (next === "not") {
      // could not + base
      if (next2 === "have" && next3 === "been" && tokens[i + 4]?.endsWith("ing")) {
        // could not have been doing
        verbIndex = i + 4; verb = deIngToBase(tokens[i + 4]!); confidence = "high";
        note = `Modal perfect continuous po "${tokens[i]} not have"`;
      } else if (next2 === "have" && next3) {
        // could not have + pp
        const r = toBaseForm(next3, reverseMap, false, false, true);
        verbIndex = i + 3; verb = r?.base ?? next3; confidence = "high";
        note = `Modal perfect po "${tokens[i]} not have"`;
      } else if (next2) {
        verbIndex = i + 2; verb = next2; confidence = "high"; note = `Po "${tokens[i]} not"`;
      }
    } else if (next === "have" && next2 === "been" && next3?.endsWith("ing")) {
      // could have been doing → perfect continuous
      verbIndex = i + 3; verb = deIngToBase(next3); confidence = "high";
      note = `Modal perfect continuous po "${tokens[i]}"`;
    } else if (next === "have" && next2) {
      // could have + pp
      const r = toBaseForm(next2, reverseMap, false, false, true);
      verbIndex = i + 2; verb = r?.base ?? next2; confidence = "high"; note = `Modal perfect po "${tokens[i]}"`;
    } else if ((next === "be" || next === "been") && next2?.endsWith("ing")) {
      verbIndex = i + 2; verb = deIngToBase(next2); confidence = "high"; note = `Modal continuous po "${tokens[i]}"`;
    } else {
      verbIndex = i + 1; verb = next; confidence = "high"; note = `Base form po modalu "${tokens[i]}"`;
    }
  }

  // ── 3. will / won't ───────────────────────────────────────────────────────
  for (let i = 0; i < tokens.length && !verb; i++) {
    if (tokens[i] !== "will") continue;
    const next  = tokens[i + 1];
    const next2 = tokens[i + 2];
    if (next === "not" && next2) {
      verbIndex = i + 2; verb = next2; confidence = "high"; note = `Base form po "will not"`;
    } else if (next) {
      verbIndex = i + 1; verb = next; confidence = "high"; note = `Base form po "will"`;
    }
  }

  // ── 4. Negated auxiliaries (doesn't, don't, didn't → base; isn't → -ing; hasn't → pp) ─
  for (let i = 0; i < tokens.length && !verb; i++) {
    const aux = NEG_TO_AUX[tokens[i]];
    if (!aux) continue;

    const next  = tokens[i + 1];
    const next2 = tokens[i + 2];
    if (!next) continue;

    if (DO_FORMS.has(aux)) {
      // don't/doesn't/didn't + base
      verbIndex = i + 1; verb = next; confidence = "high"; note = `Base form po "${tokens[i]}"`;
    } else if (BE_FORMS.has(aux) && next.endsWith("ing")) {
      // isn't/wasn't/aren't/weren't + -ing
      verbIndex = i + 1; verb = deIngToBase(next); confidence = "high"; note = `Continuous po "${tokens[i]}"`;
    } else if (HAVE_FORMS.has(aux)) {
      if (next === "been" && next2?.endsWith("ing")) {
        // haven't been practising → perfect continuous
        verbIndex = i + 2; verb = deIngToBase(next2); confidence = "high";
        note = `Perfect continuous po "${tokens[i]}"`;
      } else {
        // hasn't/haven't/hadn't + pp
        const r = toBaseForm(next, reverseMap, false, false, true);
        verbIndex = i + 1; verb = r?.base ?? next; confidence = "high"; note = `Perfect po "${tokens[i]}"`;
      }
    }
  }

  // ── 5. do/does/did (aux in questions & "do not" long form) ───────────────
  for (let i = 0; i < tokens.length && !verb; i++) {
    if (!DO_FORMS.has(tokens[i])) continue;
    const next  = tokens[i + 1];
    const next2 = tokens[i + 2];

    if (!next) continue;
    if (next === "not" && next2) {
      verbIndex = i + 2; verb = next2; confidence = "high"; note = `Base form po "${tokens[i]} not"`;
    } else if (SUBJECTS.has(next) && next2) {
      // Did she eat? / Do you go?
      verbIndex = i + 2; verb = next2; confidence = "high"; note = `Pytanie z "${tokens[i]}"`;
    } else if (!SUBJECTS.has(next) && !MODALS.has(next) && !BE_FORMS.has(next) && !HAVE_FORMS.has(next)) {
      verbIndex = i + 1; verb = next; confidence = "medium"; note = `Base form po "${tokens[i]}"`;
    }
  }

  // ── 6. is/am/are/was/were + -ing (continuous) ────────────────────────────
  for (let i = 0; i < tokens.length && !verb; i++) {
    if (!BE_FORMS.has(tokens[i])) continue;
    const next  = tokens[i + 1];
    const next2 = tokens[i + 2];

    if (!next) continue;
    if (next === "not" && next2?.endsWith("ing")) {
      verbIndex = i + 2; verb = deIngToBase(next2); confidence = "high"; note = `Continuous po "${tokens[i]} not"`;
    } else if (SUBJECTS.has(next) && next2?.endsWith("ing")) {
      // Is she eating?
      verbIndex = i + 2; verb = deIngToBase(next2); confidence = "high"; note = `Continuous po "${tokens[i]}"`;
    } else if (next.endsWith("ing")) {
      verbIndex = i + 1; verb = deIngToBase(next); confidence = "high"; note = `Continuous po "${tokens[i]}"`;
    }
  }

  // ── 7. have/has/had + past participle (perfect) ───────────────────────────
  //    Special-cased FIRST: have + been + V-ing (perfect continuous)
  for (let i = 0; i < tokens.length && !verb; i++) {
    if (!HAVE_FORMS.has(tokens[i])) continue;
    const next  = tokens[i + 1];
    const next2 = tokens[i + 2];
    const next3 = tokens[i + 3];

    if (!next) continue;

    if (next === "not" && next2 === "been" && next3?.endsWith("ing")) {
      // have not been practising → perfect continuous
      verbIndex = i + 3; verb = deIngToBase(next3); confidence = "high";
      note = `Perfect continuous po "${tokens[i]} not"`;
    } else if (next === "not" && next2) {
      // have not + pp
      const r = toBaseForm(next2, reverseMap, false, false, true);
      verbIndex = i + 2; verb = r?.base ?? next2; confidence = "high"; note = `Perfect po "${tokens[i]} not"`;
    } else if (SUBJECTS.has(next) && next2 === "been" && next3?.endsWith("ing")) {
      // Have you been practising? → perfect continuous question
      verbIndex = i + 3; verb = deIngToBase(next3); confidence = "high";
      note = `Perfect continuous pytanie po "${tokens[i]}"`;
    } else if (SUBJECTS.has(next) && next2) {
      // Has she eaten?
      const r = toBaseForm(next2, reverseMap, false, false, true);
      verbIndex = i + 2; verb = r?.base ?? next2; confidence = "high"; note = `Pytanie perfect po "${tokens[i]}"`;
    } else if (next === "been" && next2?.endsWith("ing")) {
      // have been practising → perfect continuous (positive statement)
      verbIndex = i + 2; verb = deIngToBase(next2); confidence = "high";
      note = `Perfect continuous po "${tokens[i]}"`;
    } else if (!SUBJECTS.has(next) && !MODALS.has(next) && !BE_FORMS.has(next)) {
      const r = toBaseForm(next, reverseMap, false, false, true);
      verbIndex = i + 1; verb = r?.base ?? next; confidence = "high"; note = `Perfect po "${tokens[i]}"`;
    }
  }

  // ── 8. Subject + inflected verb (last resort) ─────────────────────────────
  for (let i = 0; i < tokens.length - 1 && !verb; i++) {
    const isSubject = SUBJECTS.has(tokens[i]) || (i === 0 && /^[a-z]/.test(tokens[i]));
    if (!isSubject) continue;

    const next = tokens[i + 1];
    // Skip if next is any auxiliary or another subject
    if (
      SUBJECTS.has(next) || MODALS.has(next) || BE_FORMS.has(next) ||
      HAVE_FORMS.has(next) || DO_FORMS.has(next)
    ) continue;

    const r = toBaseForm(next, reverseMap, false, true, true);
    if (r) {
      verbIndex = i + 1; verb = r.base; confidence = "medium";
      note = `Wykryto po podmiocie (forma "${next}", ${r.method})`;
    } else {
      // Assume already base form — but only if it looks like a real English verb
      if (COMMON_BASE_VERBS.has(next) || reverseMap[next]) {
        verbIndex = i + 1; verb = next; confidence = "low";
        note = `Założono base form po podmiocie`;
      }
      // else: skip — likely gibberish or unrecognised word
    }
  }

  if (!verb || verbIndex < 0) return null;

  // ── Compound / complex sentence note ─────────────────────────────────────
  const hasConjunction = tokens.some((t) => COMPOUND_CONJUNCTIONS.has(t));
  const finalNote = hasConjunction
    ? `${note} · zdanie złożone, wykryto pierwszą klauzulę`
    : note;

  return {
    verb,
    complement: complement(),
    confidence,
    note: finalNote,
  };
}
