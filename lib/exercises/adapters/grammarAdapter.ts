import { ExerciseQuestion } from "@/lib/exercises/types";

type GrammarTask = {
  /** question_id — event-level; interchangeable probe of the topic, not a separate skill / not unit_id. */
  id: string;
  prompt: string;
  instruction?: string;
  correct_answer: string;
  accepted_answers?: string[];
  /**
   * Canonical topic slug (e.g. "present-simple") = knowledge unit_id when unit_type="grammar".
   * Must NOT be a question_id (…-q1) or derived from task.id.
   * Questions are probes of this topic; knowledge aggregates at exercise_slug, not per question.
   */
  exercise_slug: string;
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
    unitId: task.exercise_slug,
  };
}
