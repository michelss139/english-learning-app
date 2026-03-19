import { ExerciseQuestion } from "@/lib/exercises/types";

type GrammarTask = {
  id: string;
  prompt: string;
  instruction?: string;
  correct_answer: string;
  accepted_answers?: string[];
  unit_id: string;
};

export function mapGrammarToExerciseQuestion(
  task: GrammarTask
): ExerciseQuestion {
  return {
    id: task.id,
    type: "input",
    prompt: task.prompt,
    instruction: task.instruction ?? null,
    correctAnswer: task.correct_answer,
    acceptedAnswers: task.accepted_answers ?? [task.correct_answer],
    unitType: "grammar",
    unitId: task.unit_id,
  };
}
