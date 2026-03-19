import { ExerciseQuestion } from "@/lib/exercises/types";

type IrregularVerb = {
  id: string;
  base: string;
  past_simple: string;
  past_simple_variants?: string[] | null;
  past_participle: string;
  past_participle_variants?: string[] | null;
};

export function mapIrregularToExerciseQuestion(verb: IrregularVerb): ExerciseQuestion {
  return {
    id: verb.id,

    type: "input",

    prompt: verb.base,

    instruction: "Podaj Past Simple i Past Participle",

    correctAnswer: `${verb.past_simple} | ${verb.past_participle}`,

    acceptedAnswers: [
      verb.past_simple,
      ...(verb.past_simple_variants ?? []),
      verb.past_participle,
      ...(verb.past_participle_variants ?? []),
    ],

    unitType: "irregular",
    unitId: verb.id,

    metadata: {
      base: verb.base,
      past_simple: verb.past_simple,
      past_participle: verb.past_participle,
    },
  };
}
