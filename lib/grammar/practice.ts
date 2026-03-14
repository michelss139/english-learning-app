import type { GrammarTenseSlug } from "./types";

export type GrammarPracticeQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correct_option: string;
};

export type GrammarPracticeExercise = {
  slug: GrammarTenseSlug;
  title: string;
  questions: GrammarPracticeQuestion[];
};

export const grammarPracticeExercises: Record<GrammarTenseSlug, GrammarPracticeExercise> = {
  "present-simple": {
    slug: "present-simple",
    title: "Present Simple",
    questions: [
      {
        id: "present-simple-q1",
        prompt: "He ____ to work here.",
        options: ["likes", "like", "liked", "liking"],
        correct_option: "likes",
      },
    ],
  },
  "present-continuous": {
    slug: "present-continuous",
    title: "Present Continuous",
    questions: [
      {
        id: "present-continuous-q1",
        prompt: "She ____ now.",
        options: ["works", "is working", "work", "worked"],
        correct_option: "is working",
      },
    ],
  },
  "past-simple": {
    slug: "past-simple",
    title: "Past Simple",
    questions: [
      {
        id: "past-simple-q1",
        prompt: "He ____ to London last year.",
        options: ["goes", "went", "gone", "going"],
        correct_option: "went",
      },
    ],
  },
  "past-continuous": { slug: "past-continuous", title: "Past Continuous", questions: [] },
  "past-perfect": { slug: "past-perfect", title: "Past Perfect", questions: [] },
  "past-perfect-continuous": {
    slug: "past-perfect-continuous",
    title: "Past Perfect Continuous",
    questions: [],
  },
  "present-perfect": { slug: "present-perfect", title: "Present Perfect", questions: [] },
  "present-perfect-continuous": {
    slug: "present-perfect-continuous",
    title: "Present Perfect Continuous",
    questions: [],
  },
  "future-simple": { slug: "future-simple", title: "Future Simple", questions: [] },
  "future-continuous": { slug: "future-continuous", title: "Future Continuous", questions: [] },
  "future-perfect-simple": { slug: "future-perfect-simple", title: "Future Perfect Simple", questions: [] },
  "future-perfect-continuous": {
    slug: "future-perfect-continuous",
    title: "Future Perfect Continuous",
    questions: [],
  },
  "zero-conditional": {
    slug: "zero-conditional",
    title: "Zero Conditional",
    questions: [],
  },
  "first-conditional": {
    slug: "first-conditional",
    title: "First Conditional",
    questions: [
      {
        id: "first-conditional-q1",
        prompt: "If it rains tomorrow, we ____ at home.",
        options: ["will stay", "stay", "stayed", "would stay"],
        correct_option: "will stay",
      },
    ],
  },
  "second-conditional": {
    slug: "second-conditional",
    title: "Second Conditional",
    questions: [],
  },
  "third-conditional": {
    slug: "third-conditional",
    title: "Third Conditional",
    questions: [],
  },
  "mixed-conditional": {
    slug: "mixed-conditional",
    title: "Mixed Conditional",
    questions: [],
  },
  "conditional-connectors": {
    slug: "conditional-connectors",
    title: "Conditional Connectors",
    questions: [],
  },
  "modal-ability": {
    slug: "modal-ability",
    title: "Ability",
    questions: [],
  },
};

const conditionalExercises: Record<string, Omit<GrammarPracticeExercise, "slug"> & { slug: string }> = {
  "first-conditional": {
    slug: "first-conditional",
    title: "First Conditional",
    questions: [
      {
        id: "first-conditional-q1",
        prompt: "If it rains tomorrow, we ____ at home.",
        options: ["will stay", "stay", "stayed", "would stay"],
        correct_option: "will stay",
      },
    ],
  },
};

export function getGrammarPracticeExercise(slug: string): GrammarPracticeExercise | null {
  const fromTenses = grammarPracticeExercises[slug as GrammarTenseSlug];
  if (fromTenses) return fromTenses;
  const fromConditionals = conditionalExercises[slug];
  if (fromConditionals) return fromConditionals as GrammarPracticeExercise;
  return null;
}

export function getGrammarPracticeQuestion(
  exerciseSlug: string,
  questionId: string
): GrammarPracticeQuestion | null {
  const exercise = getGrammarPracticeExercise(exerciseSlug);
  if (!exercise) return null;
  return exercise.questions.find((q) => q.id === questionId) ?? null;
}
