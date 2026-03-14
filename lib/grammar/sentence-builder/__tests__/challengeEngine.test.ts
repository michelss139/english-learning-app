import { describe, expect, it } from "vitest";
import { generateChallenge, validateChallengeAnswer } from "../challengeEngine";
import type { SentenceBuilderVerb } from "../types";

const verbs: SentenceBuilderVerb[] = [
  { base: "go", past: "went", pastParticiple: "gone" },
  { base: "see", past: "saw", pastParticiple: "seen" },
  { base: "meet", past: "met", pastParticiple: "met" },
];

describe("sentence-builder challengeEngine", () => {
  it("generates deterministic challenges for the same preset and step", () => {
    const first = generateChallenge({
      verbs,
      preset: { type: "modal", modal: "can" },
      step: 0,
    });
    const second = generateChallenge({
      verbs,
      preset: { type: "modal", modal: "can" },
      step: 0,
    });

    expect(first).toEqual(second);
    expect(first.options.type).toBe("modal");
    expect(first.options.modal).toBe("can");
  });

  it("respects preset context when generating a challenge", () => {
    const challenge = generateChallenge({
      verbs,
      preset: { type: "tense", tense: "present-simple" },
      step: 2,
    });

    expect(challenge.options.type).toBe("tense");
    expect(challenge.options.tense).toBe("present-simple");
    expect(challenge.expectedSentence).toMatch(/\.$/);
    expect(challenge.prompt.length).toBeGreaterThan(0);
  });

  it("validates answers after normalization", () => {
    expect(validateChallengeAnswer("i should have gone to the cinema yesterday!", "I should have gone to the cinema yesterday.")).toEqual({
      correct: true,
      expectedSentence: "I should have gone to the cinema yesterday.",
    });
  });
});
