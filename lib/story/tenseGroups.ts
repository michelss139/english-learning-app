import type { GrammarTenseSlug } from "@/lib/grammar/types";

export type TenseGroupLevel = "A2" | "A2-B1" | "B1" | "B1-B2" | "B2";

export type TenseGroupDef = {
  label: string;
  description: string;
  level: TenseGroupLevel;
  tenses: readonly GrammarTenseSlug[];
};

/**
 * Predefined tense groups for the Story Generator.
 * Each group is pedagogically curated -- the tenses within it are ones
 * students frequently confuse or need to contrast in context.
 */
export const TENSE_GROUPS = {
  // A2
  present_contrast: {
    label: "Stan vs. akcja",
    description: 'Present Simple czy Continuous? Kiedy powiedziec "I work", a kiedy "I\'m working".',
    level: "A2" as const,
    tenses: ["present-simple", "present-continuous"] as const,
  },
  past_narrative: {
    label: "Narracja z tlem",
    description: "Klasyczny duet: to, co sie dzialo (continuous), i to, co nagle nastapilo (simple).",
    level: "A2-B1" as const,
    tenses: ["past-simple", "past-continuous"] as const,
  },
  // A2-B1
  basic_trio: {
    label: "Podstawowy miks",
    description: "Terazniejszosc, czynnosc w toku i prosta przeszlosc -- fundament kazdej narracji.",
    level: "A2-B1" as const,
    tenses: ["present-simple", "present-continuous", "past-simple"] as const,
  },
  future_basics: {
    label: "Plany i przyszlosc",
    description: "Fakty, rutyny i to, co sie dopiero wydarzy.",
    level: "B1" as const,
    tenses: ["present-simple", "past-simple", "future-simple"] as const,
  },
  // B1
  experience_vs_event: {
    label: "Doswiadczenia i zdarzenia",
    description: 'Najwiekszy pulapka B1: "I went" kontra "I have been". Kiedy uzyc ktorego?',
    level: "B1" as const,
    tenses: ["past-simple", "present-perfect"] as const,
  },
  present_and_history: {
    label: "Terazniejszosc i doswiadczenia",
    description: "Trzy perspektywy: co robisz teraz, co zwykle i co juz przezyles.",
    level: "B1" as const,
    tenses: ["present-simple", "past-simple", "present-perfect"] as const,
  },
  full_past: {
    label: "Pelna narracja przeszla",
    description: "Tlo (continuous), zdarzenie (simple) i to, co bylo jeszcze wczesniej (perfect).",
    level: "B1" as const,
    tenses: ["past-simple", "past-continuous", "past-perfect"] as const,
  },
  // B1-B2
  perfect_contrast: {
    label: "Wynik vs. czas trwania",
    description: '"Have finished" vs. "have been working" -- efekt koncowy czy ciagly proces?',
    level: "B1-B2" as const,
    tenses: ["present-perfect", "present-perfect-continuous"] as const,
  },
  past_and_results: {
    label: "Przeszlosc i jej skutki",
    description: "Os czasu: co bylo wczesniej, co sie stalo i co z tego wynika dzis.",
    level: "B1-B2" as const,
    tenses: ["past-simple", "past-perfect", "present-perfect"] as const,
  },
  // B2
  advanced_narrative: {
    label: "Zlozoana narracja",
    description: "Wielowarstwowa os czasu: przeszlosc, jej tlo i skutki ciagnace sie do dzis.",
    level: "B2" as const,
    tenses: ["past-continuous", "past-perfect", "present-perfect-continuous"] as const,
  },
} satisfies Record<string, TenseGroupDef>;

export type TenseGroupKey = keyof typeof TENSE_GROUPS;

export const TENSE_GROUP_ENTRIES = Object.entries(TENSE_GROUPS) as Array<
  [TenseGroupKey, TenseGroupDef]
>;

/** Human-readable name for each tense slug (used in prompts and UI) */
export const TENSE_LABEL: Partial<Record<GrammarTenseSlug, string>> = {
  "present-simple": "Present Simple",
  "present-continuous": "Present Continuous",
  "past-simple": "Past Simple",
  "past-continuous": "Past Continuous",
  "past-perfect": "Past Perfect Simple",
  "past-perfect-continuous": "Past Perfect Continuous",
  "present-perfect": "Present Perfect Simple",
  "present-perfect-continuous": "Present Perfect Continuous",
  "future-simple": "Future Simple (will)",
  "future-continuous": "Future Continuous",
  "future-perfect-simple": "Future Perfect Simple",
  "future-perfect-continuous": "Future Perfect Continuous",
};

/** Example form for each tense slug (used in prompt to guide the model) */
export const TENSE_EXAMPLE: Partial<Record<GrammarTenseSlug, string>> = {
  "present-simple": '"She works", "They go", "He doesn\'t know"',
  "present-continuous": '"She is working", "They are going"',
  "past-simple": '"She worked", "They went", "He saw"',
  "past-continuous": '"She was working", "They were going"',
  "past-perfect": '"She had worked", "They had gone", "He had seen"',
  "past-perfect-continuous": '"She had been working", "They had been waiting"',
  "present-perfect": '"She has worked", "They have gone", "He has seen"',
  "present-perfect-continuous": '"She has been working", "They have been waiting"',
  "future-simple": '"She will work", "They will go", "He won\'t come"',
  "future-continuous": '"She will be working", "They will be going"',
  "future-perfect-simple": '"She will have finished", "They will have gone"',
  "future-perfect-continuous": '"She will have been working"',
};

export const LEVEL_COLOR: Record<TenseGroupLevel, string> = {
  "A2": "bg-emerald-100 text-emerald-700",
  "A2-B1": "bg-teal-100 text-teal-700",
  "B1": "bg-sky-100 text-sky-700",
  "B1-B2": "bg-indigo-100 text-indigo-700",
  "B2": "bg-violet-100 text-violet-700",
};
