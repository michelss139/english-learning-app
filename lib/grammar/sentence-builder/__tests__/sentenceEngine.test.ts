import { beforeEach, describe, expect, it } from "vitest";
import { buildSentence } from "../sentenceEngine";
import { registerSentenceBuilderVerbs } from "../verbEngine";

describe("sentence-builder sentenceEngine", () => {
  beforeEach(() => {
    registerSentenceBuilderVerbs([
      { base: "go", past: "went", pastParticiple: "gone" },
      { base: "come", past: "came", pastParticiple: "come" },
    ]);
  });

  describe("tenses", () => {
    it("builds present simple", () => {
      expect(
        buildSentence({
          type: "tense",
          tense: "present-simple",
          form: "affirmative",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("He goes.");
    });

    it("builds past simple", () => {
      expect(
        buildSentence({
          type: "tense",
          tense: "past-simple",
          form: "affirmative",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("He went.");
    });

    it("builds future simple", () => {
      expect(
        buildSentence({
          type: "tense",
          tense: "future-simple",
          form: "affirmative",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("He will go.");
    });

    it("builds present continuous with correct be forms", () => {
      expect(
        buildSentence({
          type: "tense",
          tense: "present-continuous",
          form: "affirmative",
          subject: "I",
          verb: "go",
        }).sentence
      ).toBe("I am going.");
      expect(
        buildSentence({
          type: "tense",
          tense: "present-continuous",
          form: "affirmative",
          subject: "you",
          verb: "go",
        }).sentence
      ).toBe("You are going.");
      expect(
        buildSentence({
          type: "tense",
          tense: "present-continuous",
          form: "affirmative",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("He is going.");
      expect(
        buildSentence({
          type: "tense",
          tense: "present-continuous",
          form: "affirmative",
          subject: "they",
          verb: "go",
        }).sentence
      ).toBe("They are going.");
    });

    it("never generates invalid present continuous auxiliaries", () => {
      const he = buildSentence({
        type: "tense",
        tense: "present-continuous",
        form: "affirmative",
        subject: "he",
        verb: "go",
      }).sentence;
      const i = buildSentence({
        type: "tense",
        tense: "present-continuous",
        form: "affirmative",
        subject: "I",
        verb: "go",
      }).sentence;

      expect(he).not.toContain("He are");
      expect(i).not.toContain("I is");
    });

    it("builds present perfect with correct have/has forms", () => {
      expect(
        buildSentence({
          type: "tense",
          tense: "present-perfect",
          form: "affirmative",
          subject: "I",
          verb: "go",
        }).sentence
      ).toBe("I have gone.");
      expect(
        buildSentence({
          type: "tense",
          tense: "present-perfect",
          form: "affirmative",
          subject: "you",
          verb: "go",
        }).sentence
      ).toBe("You have gone.");
      expect(
        buildSentence({
          type: "tense",
          tense: "present-perfect",
          form: "affirmative",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("He has gone.");
      expect(
        buildSentence({
          type: "tense",
          tense: "present-perfect",
          form: "affirmative",
          subject: "she",
          verb: "go",
        }).sentence
      ).toBe("She has gone.");
      expect(
        buildSentence({
          type: "tense",
          tense: "present-perfect",
          form: "affirmative",
          subject: "they",
          verb: "go",
        }).sentence
      ).toBe("They have gone.");
    });
  });

  describe("modals", () => {
    it("builds modal base sentences", () => {
      expect(
        buildSentence({
          type: "modal",
          modal: "should",
          form: "affirmative",
          subject: "I",
          verb: "go",
        }).sentence
      ).toBe("I should go.");
    });

    it("builds modal perfect sentences for past markers", () => {
      expect(
        buildSentence({
          type: "modal",
          modal: "should",
          form: "affirmative",
          subject: "I",
          verb: "go",
          time: "yesterday",
        }).sentence
      ).toBe("I should have gone yesterday.");
    });

    it("builds modal continuous sentences for now", () => {
      expect(
        buildSentence({
          type: "modal",
          modal: "might",
          form: "affirmative",
          subject: "I",
          verb: "go",
          time: "now",
        }).sentence
      ).toBe("I might be going now.");
    });
  });

  describe("negation", () => {
    it("builds valid tense negations with contractions", () => {
      expect(
        buildSentence({
          type: "tense",
          tense: "present-simple",
          form: "negative",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("He doesn't go.");
      expect(
        buildSentence({
          type: "tense",
          tense: "past-simple",
          form: "negative",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("He didn't go.");
      expect(
        buildSentence({
          type: "tense",
          tense: "future-simple",
          form: "negative",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("He won't go.");
    });

    it("builds valid modal negations with contractions", () => {
      const sentence = buildSentence({
        type: "modal",
        modal: "should",
        form: "negative",
        subject: "I",
        verb: "go",
      }).sentence;

      expect(sentence).toBe("I shouldn't go.");
      expect(sentence).not.toContain("do not should");
    });
  });

  describe("questions", () => {
    it("builds valid questions across supported structures", () => {
      expect(
        buildSentence({
          type: "tense",
          tense: "present-simple",
          form: "question",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("Does he go?");
      expect(
        buildSentence({
          type: "tense",
          tense: "past-simple",
          form: "question",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("Did he go?");
      expect(
        buildSentence({
          type: "tense",
          tense: "future-simple",
          form: "question",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("Will he go?");
      expect(
        buildSentence({
          type: "tense",
          tense: "present-perfect",
          form: "question",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("Has he gone?");
      expect(
        buildSentence({
          type: "modal",
          modal: "should",
          form: "question",
          subject: "he",
          verb: "go",
        }).sentence
      ).toBe("Should he go?");
    });

    it("does not use do-support for present perfect questions", () => {
      const sentence = buildSentence({
        type: "tense",
        tense: "present-perfect",
        form: "question",
        subject: "he",
        verb: "go",
      }).sentence;

      expect(sentence).toBe("Has he gone?");
      expect(sentence).not.toContain("Does");
      expect(sentence).not.toContain("Do ");
    });
  });

  it("returns structured tokens for downstream analysis", () => {
    expect(
      buildSentence({
        type: "modal",
        modal: "should",
        form: "affirmative",
        subject: "I",
        verb: "go",
        place: "to the cinema",
        time: "yesterday",
      }).tokens
    ).toEqual([
      { type: "subject", value: "I" },
      { type: "modal", value: "should" },
      { type: "perfect", value: "have" },
      { type: "verb", value: "gone" },
      { type: "place", value: "to the cinema" },
      { type: "time", value: "yesterday" },
    ]);
  });
});
