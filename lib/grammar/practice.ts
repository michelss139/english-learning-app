import type { GrammarTenseSlug } from "./types";

export type GrammarPracticeQuestion = {
  id: string;
  prompt: string;
  base?: string;
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
        base: "like",
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
        base: "work",
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
        base: "go",
        options: ["goes", "went", "gone", "going"],
        correct_option: "went",
      },
    ],
  },
  "past-continuous": {
    slug: "past-continuous",
    title: "Past Continuous",
    questions: [
      {
        id: "past-continuous-q1",
        prompt: "She ____ when I called.",
        base: "work",
        options: ["worked", "was working", "has worked", "works"],
        correct_option: "was working",
      },
    ],
  },
  "past-perfect": {
    slug: "past-perfect",
    title: "Past Perfect",
    questions: [
      {
        id: "past-perfect-q1",
        prompt: "She ____ before I arrived.",
        base: "finish",
        options: ["finished", "had finished", "has finished", "was finishing"],
        correct_option: "had finished",
      },
    ],
  },
  "past-perfect-continuous": {
    slug: "past-perfect-continuous",
    title: "Past Perfect Continuous",
    questions: [
      {
        id: "past-perfect-continuous-q1",
        prompt: "She ____ for hours before she took a break.",
        base: "work",
        options: ["worked", "had worked", "had been working", "was working"],
        correct_option: "had been working",
      },
    ],
  },
  "present-perfect": {
    slug: "present-perfect",
    title: "Present Perfect",
    questions: [
      {
        id: "present-perfect-q1",
        prompt: "She ____ here for 5 years.",
        base: "live",
        options: ["lives", "lived", "has lived", "has been living"],
        correct_option: "has lived",
      },
    ],
  },
  "present-perfect-continuous": {
    slug: "present-perfect-continuous",
    title: "Present Perfect Continuous",
    questions: [
      {
        id: "present-perfect-continuous-q1",
        prompt: "She ____ all morning.",
        base: "work",
        options: ["works", "worked", "has worked", "has been working"],
        correct_option: "has been working",
      },
    ],
  },
  "future-simple": {
    slug: "future-simple",
    title: "Future Simple",
    questions: [
      {
        id: "future-simple-q1",
        prompt: "She ____ you tomorrow.",
        base: "call",
        options: ["calls", "will call", "is calling", "called"],
        correct_option: "will call",
      },
    ],
  },
  "future-continuous": {
    slug: "future-continuous",
    title: "Future Continuous",
    questions: [
      {
        id: "future-continuous-q1",
        prompt: "This time tomorrow, she ____ in the office.",
        base: "work",
        options: ["works", "will work", "will be working", "is working"],
        correct_option: "will be working",
      },
    ],
  },
  "future-perfect-simple": {
    slug: "future-perfect-simple",
    title: "Future Perfect Simple",
    questions: [
      {
        id: "future-perfect-simple-q1",
        prompt: "By next week, she ____ the project.",
        base: "finish",
        options: ["finishes", "will finish", "will have finished", "will have been finishing"],
        correct_option: "will have finished",
      },
    ],
  },
  "future-perfect-continuous": {
    slug: "future-perfect-continuous",
    title: "Future Perfect Continuous",
    questions: [
      {
        id: "future-perfect-continuous-q1",
        prompt: "By next month, she ____ here for two years.",
        base: "work",
        options: ["works", "will work", "will have worked", "will have been working"],
        correct_option: "will have been working",
      },
    ],
  },
  "zero-conditional": {
    slug: "zero-conditional",
    title: "Zero Conditional",
    questions: [
      {
        id: "zero-conditional-q1",
        prompt: "If you heat water, it ____.",
        base: "boil",
        options: ["boil", "boils", "will boil", "would boil"],
        correct_option: "boils",
      },
    ],
  },
  "first-conditional": {
    slug: "first-conditional",
    title: "First Conditional",
    questions: [
      {
        id: "first-conditional-q1",
        prompt: "If it rains tomorrow, we ____ at home.",
        base: "stay",
        options: ["will stay", "stay", "stayed", "would stay"],
        correct_option: "will stay",
      },
    ],
  },
  "second-conditional": {
    slug: "second-conditional",
    title: "Second Conditional",
    questions: [
      {
        id: "second-conditional-q1",
        prompt: "If I were you, I ____ more.",
        base: "study",
        options: ["study", "studied", "would study", "will study"],
        correct_option: "would study",
      },
    ],
  },
  "third-conditional": {
    slug: "third-conditional",
    title: "Third Conditional",
    questions: [
      {
        id: "third-conditional-q1",
        prompt: "If I had studied, I ____ the exam.",
        base: "pass",
        options: ["passed", "would pass", "would have passed", "will pass"],
        correct_option: "would have passed",
      },
    ],
  },
  "mixed-conditional": {
    slug: "mixed-conditional",
    title: "Mixed Conditional",
    questions: [
      {
        id: "mixed-conditional-q1",
        prompt: "If I had taken that job, I ____ in London now.",
        base: "live",
        options: ["lived", "would live", "would be living", "will be living"],
        correct_option: "would be living",
      },
    ],
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
        base: "stay",
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
