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
};

export function getGrammarPracticeExercise(slug: string): GrammarPracticeExercise | null {
  return grammarPracticeExercises[slug as GrammarTenseSlug] ?? null;
}

export function getGrammarPracticeQuestion(
  exerciseSlug: string,
  questionId: string
): GrammarPracticeQuestion | null {
  const exercise = getGrammarPracticeExercise(exerciseSlug);
  if (!exercise) return null;
  return exercise.questions.find((q) => q.id === questionId) ?? null;
}
