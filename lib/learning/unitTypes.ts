export const LEARNING_UNIT_TYPES = {
  VOCAB_SENSE: "sense",
  CLUSTER: "cluster",
  IRREGULAR_VERB: "irregular",
} as const;

export type LearningUnitType =
  (typeof LEARNING_UNIT_TYPES)[keyof typeof LEARNING_UNIT_TYPES];
