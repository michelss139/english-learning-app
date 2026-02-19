import type { GrammarTenseSlug } from "@/lib/grammar/types";

export const STORY_PROFILES = {
  past_narration: {
    label: "Narracja przeszla",
    description: "Klasyczna historia z tlem i wydarzeniem.",
    tenses: ["past-simple", "past-continuous", "past-perfect"],
  },
  turning_point: {
    label: "Punkt zwrotny",
    description: "Tlo + nagle wydarzenie + wczesniejszy kontekst.",
    tenses: ["past-continuous", "past-simple", "past-perfect"],
  },
  goal_journey: {
    label: "Droga do celu",
    description: "Proces, doswiadczenie i rozwoj.",
    tenses: ["present-perfect", "past-simple", "present-perfect-continuous"],
  },
  plan_and_result: {
    label: "Plan i rezultat",
    description: "Plany i ich konsekwencje.",
    tenses: ["future-simple", "future-perfect-simple", "present-simple"],
  },
} as const satisfies Record<
  string,
  {
    label: string;
    description: string;
    tenses: readonly GrammarTenseSlug[];
  }
>;

export type StoryProfileKey = keyof typeof STORY_PROFILES;
