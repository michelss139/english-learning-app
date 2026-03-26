export type GrammarUnitType =
  | "tense"
  | "conditional"
  | "modal"
  | "other";

export type ExerciseUnitType =
  | "sense"
  | "cluster"
  | "irregular"
  | "grammar";

export type ExerciseQuestionType = "choice" | "translation" | "input";

export type ExerciseQuestion = {
  id: string;

  type: ExerciseQuestionType;

  prompt: string;
  instruction?: string | null;

  // for choice tasks
  choices?: string[];

  // canonical answer (string form)
  correctAnswer?: string | null;

  // accepted answers (for translation/input)
  acceptedAnswers?: string[];

  explanation?: string | null;

  // learning engine binding
  unitType: ExerciseUnitType;
  /** For grammar: exercise_slug (topic). For other types: sense UUID, cluster slug, or verb UUID. Never a grammar question_id. */
  unitId: string;

  // optional metadata
  metadata?: Record<string, unknown>;
};
