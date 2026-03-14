import { pickValidVerbPlace, SENTENCE_BUILDER_MODALS } from "./constants";
import { buildSentence } from "./sentenceEngine";
import {
  SENTENCE_BUILDER_SUBJECTS,
  SENTENCE_BUILDER_TENSES,
  type BuildSentenceOptions,
  type BuildSentenceResult,
  type SentenceBuilderPreset,
  type SentenceBuilderTense,
  type SentenceBuilderType,
  type SentenceBuilderVerb,
} from "./types";

type SubjectKey = keyof typeof SUBJECT_TRANSLATIONS;

type ChallengePolishVerb = {
  base: string;
  /** Present Simple (habitual): "chodzę do kina codziennie" */
  presentSimple: Record<SubjectKey, string>;
  /** Present Continuous (in progress): "idę do kina teraz" */
  presentContinuous: Record<SubjectKey, string>;
  past: Record<SubjectKey, string>;
  future: Record<SubjectKey, string>;
  perfect: Record<SubjectKey, string>;
};

export type SentenceChallenge = {
  prompt: string;
  expectedSentence: string;
  result: BuildSentenceResult;
  options: BuildSentenceOptions;
};

type GenerateChallengeOptions = {
  verbs: SentenceBuilderVerb[];
  preset?: SentenceBuilderPreset;
  step?: number;
};

export type ChallengeValidationResult = {
  correct: boolean;
  expectedSentence: string;
};

const SUBJECT_TRANSLATIONS = {
  I: "Ja",
  you: "Ty",
  he: "On",
  she: "Ona",
  it: "To",
  we: "My",
  they: "Oni",
} as const;

const PLACE_TRANSLATIONS: Record<string, string> = {
  "to the cinema": "do kina",
  "to the restaurant": "do restauracji",
  "to the park": "do parku",
  "to the office": "do biura",
  "to the shop": "do sklepu",
  home: "do domu",
};

const TIME_TRANSLATIONS: Record<string, string> = {
  yesterday: "wczoraj",
  "last night": "ostatniej nocy",
  today: "dzisiaj",
  tomorrow: "jutro",
  "two days ago": "dwa dni temu",
  now: "teraz",
  later: "później",
  "every day": "codziennie",
  usually: "zazwyczaj",
  "on Mondays": "w poniedziałki",
};

function bySubject(
  I: string,
  you: string,
  he: string,
  she: string,
  it: string,
  we: string,
  they: string
): Record<SubjectKey, string> {
  return { I, you, he, she, it, we, they };
}

const POLISH_VERB_FORMS: Record<string, ChallengePolishVerb> = {
  go: {
    base: "iść",
    presentSimple: bySubject("chodzę", "chodzisz", "chodzi", "chodzi", "chodzi", "chodzimy", "chodzą"),
    presentContinuous: bySubject("idę", "idziesz", "idzie", "idzie", "idzie", "idziemy", "idą"),
    past: bySubject("poszedłem", "poszedłeś", "poszedł", "poszła", "poszło", "poszliśmy", "poszli"),
    future: bySubject("pójdę", "pójdziesz", "pójdzie", "pójdzie", "pójdzie", "pójdziemy", "pójdą"),
    perfect: bySubject("poszedłem", "poszedłeś", "poszedł", "poszła", "poszło", "poszliśmy", "poszli"),
  },
  come: {
    base: "przyjść",
    presentSimple: bySubject("przychodzę", "przychodzisz", "przychodzi", "przychodzi", "przychodzi", "przychodzimy", "przychodzą"),
    presentContinuous: bySubject("przychodzę", "przychodzisz", "przychodzi", "przychodzi", "przychodzi", "przychodzimy", "przychodzą"),
    past: bySubject("przyszedłem", "przyszedłeś", "przyszedł", "przyszła", "przyszło", "przyszliśmy", "przyszli"),
    future: bySubject("przyjdę", "przyjdziesz", "przyjdzie", "przyjdzie", "przyjdzie", "przyjdziemy", "przyjdą"),
    perfect: bySubject("przyszedłem", "przyszedłeś", "przyszedł", "przyszła", "przyszło", "przyszliśmy", "przyszli"),
  },
  leave: {
    base: "wyjść",
    presentSimple: bySubject("wychodzę", "wychodzisz", "wychodzi", "wychodzi", "wychodzi", "wychodzimy", "wychodzą"),
    presentContinuous: bySubject("wychodzę", "wychodzisz", "wychodzi", "wychodzi", "wychodzi", "wychodzimy", "wychodzą"),
    past: bySubject("wyszedłem", "wyszedłeś", "wyszedł", "wyszła", "wyszło", "wyszliśmy", "wyszli"),
    future: bySubject("wyjdę", "wyjdziesz", "wyjdzie", "wyjdzie", "wyjdzie", "wyjdziemy", "wyjdą"),
    perfect: bySubject("wyszedłem", "wyszedłeś", "wyszedł", "wyszła", "wyszło", "wyszliśmy", "wyszli"),
  },
  see: {
    base: "zobaczyć",
    presentSimple: bySubject("widzę", "widzisz", "widzi", "widzi", "widzi", "widzimy", "widzą"),
    presentContinuous: bySubject("widzę", "widzisz", "widzi", "widzi", "widzi", "widzimy", "widzą"),
    past: bySubject("zobaczyłem", "zobaczyłeś", "zobaczył", "zobaczyła", "zobaczyło", "zobaczyliśmy", "zobaczyli"),
    future: bySubject("zobaczę", "zobaczysz", "zobaczy", "zobaczy", "zobaczy", "zobaczymy", "zobaczą"),
    perfect: bySubject("zobaczyłem", "zobaczyłeś", "zobaczył", "zobaczyła", "zobaczyło", "zobaczyliśmy", "zobaczyli"),
  },
  meet: {
    base: "spotkać",
    presentSimple: bySubject("spotykam", "spotykasz", "spotyka", "spotyka", "spotyka", "spotykamy", "spotykają"),
    presentContinuous: bySubject("spotykam", "spotykasz", "spotyka", "spotyka", "spotyka", "spotykamy", "spotykają"),
    past: bySubject("spotkałem", "spotkałeś", "spotkał", "spotkała", "spotkało", "spotkaliśmy", "spotkali"),
    future: bySubject("spotkam", "spotkasz", "spotka", "spotka", "spotka", "spotkamy", "spotkają"),
    perfect: bySubject("spotkałem", "spotkałeś", "spotkał", "spotkała", "spotkało", "spotkaliśmy", "spotkali"),
  },
  take: {
    base: "wziąć",
    presentSimple: bySubject("biorę", "bierzesz", "bierze", "bierze", "bierze", "bierzemy", "biorą"),
    presentContinuous: bySubject("biorę", "bierzesz", "bierze", "bierze", "bierze", "bierzemy", "biorą"),
    past: bySubject("wziąłem", "wziąłeś", "wziął", "wzięła", "wzięło", "wzięliśmy", "wzięli"),
    future: bySubject("wezmę", "weźmiesz", "weźmie", "weźmie", "weźmie", "weźmiemy", "wezmą"),
    perfect: bySubject("wziąłem", "wziąłeś", "wziął", "wzięła", "wzięło", "wzięliśmy", "wzięli"),
  },
  give: {
    base: "dać",
    presentSimple: bySubject("daję", "dajesz", "daje", "daje", "daje", "dajemy", "dają"),
    presentContinuous: bySubject("daję", "dajesz", "daje", "daje", "daje", "dajemy", "dają"),
    past: bySubject("dałem", "dałeś", "dał", "dała", "dało", "daliśmy", "dali"),
    future: bySubject("dam", "dasz", "da", "da", "da", "damy", "dadzą"),
    perfect: bySubject("dałem", "dałeś", "dał", "dała", "dało", "daliśmy", "dali"),
  },
  make: {
    base: "zrobić",
    presentSimple: bySubject("robię", "robisz", "robi", "robi", "robi", "robimy", "robią"),
    presentContinuous: bySubject("robię", "robisz", "robi", "robi", "robi", "robimy", "robią"),
    past: bySubject("zrobiłem", "zrobiłeś", "zrobił", "zrobiła", "zrobiło", "zrobiliśmy", "zrobili"),
    future: bySubject("zrobię", "zrobisz", "zrobi", "zrobi", "zrobi", "zrobimy", "zrobią"),
    perfect: bySubject("zrobiłem", "zrobiłeś", "zrobił", "zrobiła", "zrobiło", "zrobiliśmy", "zrobili"),
  },
  find: {
    base: "znaleźć",
    presentSimple: bySubject("znajduję", "znajdujesz", "znajduje", "znajduje", "znajduje", "znajdujemy", "znajdują"),
    presentContinuous: bySubject("znajduję", "znajdujesz", "znajduje", "znajduje", "znajduje", "znajdujemy", "znajdują"),
    past: bySubject("znalazłem", "znalazłeś", "znalazł", "znalazła", "znalazło", "znaleźliśmy", "znaleźli"),
    future: bySubject("znajdę", "znajdziesz", "znajdzie", "znajdzie", "znajdzie", "znajdziemy", "znajdą"),
    perfect: bySubject("znalazłem", "znalazłeś", "znalazł", "znalazła", "znalazło", "znaleźliśmy", "znaleźli"),
  },
  tell: {
    base: "powiedzieć",
    presentSimple: bySubject("mówię", "mówisz", "mówi", "mówi", "mówi", "mówimy", "mówią"),
    presentContinuous: bySubject("mówię", "mówisz", "mówi", "mówi", "mówi", "mówimy", "mówią"),
    past: bySubject("powiedziałem", "powiedziałeś", "powiedział", "powiedziała", "powiedziało", "powiedzieliśmy", "powiedzieli"),
    future: bySubject("powiem", "powiesz", "powie", "powie", "powie", "powiemy", "powiedzą"),
    perfect: bySubject("powiedziałem", "powiedziałeś", "powiedział", "powiedziała", "powiedziało", "powiedzieliśmy", "powiedzieli"),
  },
  think: {
    base: "myśleć",
    presentSimple: bySubject("myślę", "myślisz", "myśli", "myśli", "myśli", "myślimy", "myślą"),
    presentContinuous: bySubject("myślę", "myślisz", "myśli", "myśli", "myśli", "myślimy", "myślą"),
    past: bySubject("pomyślałem", "pomyślałeś", "pomyślał", "pomyślała", "pomyślało", "pomyśleliśmy", "pomyśleli"),
    future: bySubject("pomyślę", "pomyślisz", "pomyśli", "pomyśli", "pomyśli", "pomyślimy", "pomyślą"),
    perfect: bySubject("pomyślałem", "pomyślałeś", "pomyślał", "pomyślała", "pomyślało", "pomyśleliśmy", "pomyśleli"),
  },
  get: {
    base: "dostać",
    presentSimple: bySubject("dostaję", "dostajesz", "dostaje", "dostaje", "dostaje", "dostajemy", "dostają"),
    presentContinuous: bySubject("dostaję", "dostajesz", "dostaje", "dostaje", "dostaje", "dostajemy", "dostają"),
    past: bySubject("dostałem", "dostałeś", "dostał", "dostała", "dostało", "dostaliśmy", "dostali"),
    future: bySubject("dostanę", "dostaniesz", "dostanie", "dostanie", "dostanie", "dostaniemy", "dostaną"),
    perfect: bySubject("dostałem", "dostałeś", "dostał", "dostała", "dostało", "dostaliśmy", "dostali"),
  },
  bring: {
    base: "przynieść",
    presentSimple: bySubject("przynoszę", "przynosisz", "przynosi", "przynosi", "przynosi", "przynosimy", "przynoszą"),
    presentContinuous: bySubject("przynoszę", "przynosisz", "przynosi", "przynosi", "przynosi", "przynosimy", "przynoszą"),
    past: bySubject("przyniosłem", "przyniosłeś", "przyniósł", "przyniosła", "przyniosło", "przynieśliśmy", "przynieśli"),
    future: bySubject("przyniosę", "przyniesiesz", "przyniesie", "przyniesie", "przyniesie", "przyniesiemy", "przyniosą"),
    perfect: bySubject("przyniosłem", "przyniosłeś", "przyniósł", "przyniosła", "przyniosło", "przynieśliśmy", "przynieśli"),
  },
  become: {
    base: "zostać",
    presentSimple: bySubject("zostaję", "zostajesz", "zostaje", "zostaje", "zostaje", "zostajemy", "zostają"),
    presentContinuous: bySubject("zostaję", "zostajesz", "zostaje", "zostaje", "zostaje", "zostajemy", "zostają"),
    past: bySubject("zostałem", "zostałeś", "został", "została", "zostało", "zostaliśmy", "zostali"),
    future: bySubject("zostanę", "zostaniesz", "zostanie", "zostanie", "zostanie", "zostaniemy", "zostaną"),
    perfect: bySubject("zostałem", "zostałeś", "został", "została", "zostało", "zostaliśmy", "zostali"),
  },
};

const MODAL_BASE_TRANSLATIONS: Record<string, string> = {
  can: "mogę",
  could: "mógłbym",
  should: "powinienem",
  must: "muszę",
  might: "mogę",
  may: "mogę",
  would: "chciałbym",
};

const MODAL_CONTINUOUS_TRANSLATIONS: Record<string, string> = {
  can: "mogę teraz",
  could: "mógłbym teraz",
  should: "powinienem teraz",
  must: "muszę teraz",
  might: "mogę teraz",
  may: "mogę teraz",
  would: "chciałbym teraz",
};

const MODAL_PERFECT_TRANSLATIONS: Record<string, Record<keyof typeof SUBJECT_TRANSLATIONS, string>> = {
  should: {
    I: "powinienem był",
    you: "powinieneś",
    he: "powinien był",
    she: "powinna była",
    it: "powinno było",
    we: "powinniśmy",
    they: "powinni",
  },
  could: {
    I: "mogłem",
    you: "mogłeś",
    he: "mógł",
    she: "mogła",
    it: "mogło",
    we: "mogliśmy",
    they: "mogli",
  },
  might: {
    I: "mogłem",
    you: "mogłeś",
    he: "mógł",
    she: "mogła",
    it: "mogło",
    we: "mogliśmy",
    they: "mogli",
  },
  may: {
    I: "mogłem",
    you: "mogłeś",
    he: "mógł",
    she: "mogła",
    it: "mogło",
    we: "mogliśmy",
    they: "mogli",
  },
  would: {
    I: "chciałbym był",
    you: "chciałbyś",
    he: "chciałby",
    she: "chciałaby",
    it: "chciałoby",
    we: "chcielibyśmy",
    they: "chcieliby",
  },
  must: {
    I: "musiałem",
    you: "musiałeś",
    he: "musiał",
    she: "musiała",
    it: "musiało",
    we: "musieliśmy",
    they: "musieli",
  },
  can: {
    I: "mogłem",
    you: "mogłeś",
    he: "mógł",
    she: "mogła",
    it: "mogło",
    we: "mogliśmy",
    they: "mogli",
  },
};

function pickItem<T>(items: readonly T[], step: number, offset: number): T {
  return items[(step * offset) % items.length]!;
}

function getChallengeType(preset: SentenceBuilderPreset | undefined, step: number): SentenceBuilderType {
  if (preset?.type) {
    return preset.type;
  }

  return step % 2 === 0 ? "tense" : "modal";
}

function getChallengeTense(preset: SentenceBuilderPreset | undefined, step: number): SentenceBuilderTense {
  if (preset?.tense && SENTENCE_BUILDER_TENSES.includes(preset.tense as SentenceBuilderTense)) {
    return preset.tense as SentenceBuilderTense;
  }

  return pickItem(SENTENCE_BUILDER_TENSES, step, 1);
}

function getChallengeModal(preset: SentenceBuilderPreset | undefined, step: number): string {
  if (preset?.modal && SENTENCE_BUILDER_MODALS.includes(preset.modal as (typeof SENTENCE_BUILDER_MODALS)[number])) {
    return preset.modal;
  }

  return pickItem(SENTENCE_BUILDER_MODALS, step, 2);
}

function getTenseTime(tense: SentenceBuilderTense, step: number): string {
  switch (tense) {
    case "present-simple":
      return pickItem(["every day", "usually", "on Mondays"] as const, step, 1);
    case "past-simple":
      return pickItem(["yesterday", "last night", "two days ago"] as const, step, 1);
    case "future-simple":
      return pickItem(["tomorrow", "later"] as const, step, 1);
    case "present-continuous":
      return "now";
    case "present-perfect":
      return "today";
    default:
      return "today";
  }
}

function getModalTime(modal: string, step: number): string {
  const perfectCapable = new Set(["should", "could", "might", "may", "must", "would"]);
  const continuousCapable = new Set(["might", "may", "could", "would"]);

  const availablePatterns = ["base"];
  if (perfectCapable.has(modal)) availablePatterns.push("perfect");
  if (continuousCapable.has(modal)) availablePatterns.push("continuous");

  const pattern = pickItem(availablePatterns, step, 1);

  if (pattern === "perfect") {
    return pickItem(["yesterday", "last night", "two days ago"] as const, step, 1);
  }

  if (pattern === "continuous") {
    return "now";
  }

  return pickItem(["today", "tomorrow", "later"] as const, step, 1);
}

function translateSubject(subject: keyof typeof SUBJECT_TRANSLATIONS): string {
  return SUBJECT_TRANSLATIONS[subject];
}

function translatePlace(place: string | undefined): string {
  if (!place) return "";
  return PLACE_TRANSLATIONS[place] ?? place;
}

function translateTime(time: string | undefined): string {
  if (!time) return "";
  return TIME_TRANSLATIONS[time] ?? time;
}

function getVerbForms(verb: string): ChallengePolishVerb {
  const fallbackForms = bySubject(verb, verb, verb, verb, verb, verb, verb);
  const fallback: ChallengePolishVerb = {
    base: verb,
    presentSimple: fallbackForms,
    presentContinuous: fallbackForms,
    past: fallbackForms,
    future: fallbackForms,
    perfect: fallbackForms,
  };
  return POLISH_VERB_FORMS[verb] ?? fallback;
}

function joinSentenceParts(parts: Array<string | undefined>): string {
  const normalized = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1) + ".";
}

function translateTenseSentence(options: BuildSentenceOptions): string {
  const subject = translateSubject(options.subject);
  const place = translatePlace(options.place);
  const time = translateTime(options.time);
  const verb = getVerbForms(options.verb);
  const subj = options.subject;

  switch (options.tense) {
    case "past-simple":
      return joinSentenceParts([subject, verb.past[subj], place, time]);
    case "future-simple":
      return joinSentenceParts([subject, verb.future[subj], place, time]);
    case "present-continuous":
      return joinSentenceParts([subject, "teraz", verb.presentContinuous[subj], place]);
    case "present-perfect":
      return joinSentenceParts([subject, "już", verb.perfect[subj], place, time]);
    case "present-simple":
    default:
      return joinSentenceParts([subject, verb.presentSimple[subj], place, time]);
  }
}

function translateModalSentence(options: BuildSentenceOptions): string {
  const subject = translateSubject(options.subject);
  const place = translatePlace(options.place);
  const time = translateTime(options.time);
  const verb = getVerbForms(options.verb);
  const modal = options.modal ?? "should";

  if (options.time === "now") {
    return joinSentenceParts([subject, MODAL_CONTINUOUS_TRANSLATIONS[modal] ?? "może teraz", verb.base, place]);
  }

  if (options.time && ["yesterday", "last night", "two days ago"].includes(options.time)) {
    const phrase = MODAL_PERFECT_TRANSLATIONS[modal]?.[options.subject] ?? MODAL_PERFECT_TRANSLATIONS.should[options.subject];
    return joinSentenceParts([subject, phrase, verb.base, place, time]);
  }

  return joinSentenceParts([subject, MODAL_BASE_TRANSLATIONS[modal] ?? "powinienem", verb.base, place, time]);
}

function toPolishPrompt(options: BuildSentenceOptions): string {
  if (options.type === "modal") {
    return translateModalSentence(options);
  }

  return translateTenseSentence(options);
}

export function generateChallenge({ verbs, preset, step = 0 }: GenerateChallengeOptions): SentenceChallenge {
  const type = getChallengeType(preset, step);
  const subject = pickItem(SENTENCE_BUILDER_SUBJECTS, step, 3);
  const { verb, place } = pickValidVerbPlace(step);

  const options: BuildSentenceOptions =
    type === "modal"
      ? {
          type,
          modal: getChallengeModal(preset, step),
          form: "affirmative",
          subject,
          verb,
          place,
          time: getModalTime(getChallengeModal(preset, step), step),
        }
      : {
          type,
          tense: getChallengeTense(preset, step),
          form: "affirmative",
          subject,
          verb,
          place,
          time: getTenseTime(getChallengeTense(preset, step), step),
        };

  const result = buildSentence(options);

  return {
    prompt: toPolishPrompt(options),
    expectedSentence: result.sentence,
    result,
    options,
  };
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ");
}

export function validateChallengeAnswer(userInput: string, expectedSentence: string): ChallengeValidationResult {
  return {
    correct: normalizeAnswer(userInput) === normalizeAnswer(expectedSentence),
    expectedSentence,
  };
}
