import { ExerciseQuestion } from "@/lib/exercises/types";

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function validateInputAnswer(
  question: ExerciseQuestion,
  submitted: string[]
): {
  isCorrect: boolean;
  details: {
    correctParts: boolean[];
  };
} {
  if (question.type !== "input") {
    return { isCorrect: false, details: { correctParts: [] } };
  }

  const metadata = question.metadata as {
    past_simple?: string;
    past_participle?: string;
  };

  const expected = [
    metadata?.past_simple ?? "",
    metadata?.past_participle ?? "",
  ];

  const normalizedSubmitted = submitted.map(normalize);
  const normalizedExpected = expected.map(normalize);

  const correctParts = normalizedSubmitted.map((val, i) => val === normalizedExpected[i]);

  return {
    isCorrect: correctParts.every(Boolean),
    details: {
      correctParts,
    },
  };
}
