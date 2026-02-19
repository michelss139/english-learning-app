import { describe, it, expect } from "vitest";
import {
  validateGapAnswer,
  makeIngForms,
  make3rdPersonForms,
  makePastEdForms,
  tokenize,
  type IrregularForms,
} from "./formEngine";

const irregular: Record<string, IrregularForms> = {
  go: { base: "go", past: "went", pastParticiple: "gone" },
  be: { base: "be", past: "was", pastParticiple: "been", pastVariants: ["were"] },
  have: { base: "have", past: "had", pastParticiple: "had" },
  work: { base: "work", past: "worked", pastParticiple: "worked" },
};

describe("tokenize", () => {
  it("splits by spaces and normalizes", () => {
    expect(tokenize("will have been working")).toEqual(["will", "have", "been", "working"]);
    expect(tokenize("  have   gone  ")).toEqual(["have", "gone"]);
  });
});

describe("makeIngForms", () => {
  it("standard: work -> working", () => {
    expect(makeIngForms("work")).toContain("working");
  });
  it("drop-e: make -> making", () => {
    expect(makeIngForms("make")).toContain("making");
  });
  it("ie -> ying: lie -> lying, die -> dying", () => {
    expect(makeIngForms("lie")).toContain("lying");
    expect(makeIngForms("die")).toContain("dying");
  });
  it("doubling: stop -> stopping, run -> running", () => {
    expect(makeIngForms("stop")).toContain("stopping");
    expect(makeIngForms("run")).toContain("running");
  });
});

describe("make3rdPersonForms", () => {
  it("standard: work -> works", () => {
    expect(make3rdPersonForms("work")).toContain("works");
  });
  it("study -> studies", () => {
    expect(make3rdPersonForms("study")).toContain("studies");
  });
  it("go -> goes", () => {
    expect(make3rdPersonForms("go")).toContain("goes");
  });
  it("have -> has", () => {
    expect(make3rdPersonForms("have")).toContain("has");
  });
  it("be -> is, are, am", () => {
    const forms = make3rdPersonForms("be");
    expect(forms).toContain("is");
    expect(forms).toContain("are");
    expect(forms).toContain("am");
  });
});

describe("makePastEdForms", () => {
  it("standard: work -> worked", () => {
    expect(makePastEdForms("work")).toContain("worked");
  });
  it("drop-e: like -> liked", () => {
    expect(makePastEdForms("like")).toContain("liked");
  });
  it("consonant+y: study -> studied", () => {
    expect(makePastEdForms("study")).toContain("studied");
  });
  it("doubling: stop -> stopped, plan -> planned", () => {
    expect(makePastEdForms("stop")).toContain("stopped");
    expect(makePastEdForms("plan")).toContain("planned");
  });
});

describe("validateGapAnswer", () => {
  describe("present-simple", () => {
    it("accepts work, works", () => {
      expect(validateGapAnswer({ tense: "present-simple", baseVerb: "work", correctAnswer: "work", irregular })).toMatchObject({ ok: true });
      expect(validateGapAnswer({ tense: "present-simple", baseVerb: "work", correctAnswer: "works", irregular })).toMatchObject({ ok: true });
    });
    it("accepts study, studies", () => {
      expect(validateGapAnswer({ tense: "present-simple", baseVerb: "study", correctAnswer: "studies", irregular })).toMatchObject({ ok: true });
    });
    it("accepts go, goes", () => {
      expect(validateGapAnswer({ tense: "present-simple", baseVerb: "go", correctAnswer: "goes", irregular })).toMatchObject({ ok: true });
    });
    it("accepts have, has", () => {
      expect(validateGapAnswer({ tense: "present-simple", baseVerb: "have", correctAnswer: "has", irregular })).toMatchObject({ ok: true });
    });
    it("accepts be: am, is, are", () => {
      expect(validateGapAnswer({ tense: "present-simple", baseVerb: "be", correctAnswer: "am", irregular })).toMatchObject({ ok: true });
      expect(validateGapAnswer({ tense: "present-simple", baseVerb: "be", correctAnswer: "is", irregular })).toMatchObject({ ok: true });
      expect(validateGapAnswer({ tense: "present-simple", baseVerb: "be", correctAnswer: "are", irregular })).toMatchObject({ ok: true });
    });
  });

  describe("past-simple", () => {
    it("accepts work -> worked", () => {
      expect(validateGapAnswer({ tense: "past-simple", baseVerb: "work", correctAnswer: "worked", irregular })).toMatchObject({ ok: true });
    });
    it("accepts go -> went (irregular)", () => {
      expect(validateGapAnswer({ tense: "past-simple", baseVerb: "go", correctAnswer: "went", irregular })).toMatchObject({ ok: true });
    });
    it("rejects go -> goed", () => {
      expect(validateGapAnswer({ tense: "past-simple", baseVerb: "go", correctAnswer: "goed", irregular })).toMatchObject({ ok: false });
    });
  });

  describe("present-perfect", () => {
    it("accepts have gone, has gone", () => {
      expect(validateGapAnswer({ tense: "present-perfect", baseVerb: "go", correctAnswer: "have gone", irregular })).toMatchObject({ ok: true });
      expect(validateGapAnswer({ tense: "present-perfect", baseVerb: "go", correctAnswer: "has gone", irregular })).toMatchObject({ ok: true });
    });
    it("accepts have worked, has worked", () => {
      expect(validateGapAnswer({ tense: "present-perfect", baseVerb: "work", correctAnswer: "have worked", irregular })).toMatchObject({ ok: true });
    });
  });

  describe("continuous forms", () => {
    it("accepts stop -> stopping", () => {
      expect(validateGapAnswer({ tense: "present-continuous", baseVerb: "stop", correctAnswer: "is stopping", irregular })).toMatchObject({ ok: true });
    });
    it("accepts make -> making", () => {
      expect(validateGapAnswer({ tense: "present-continuous", baseVerb: "make", correctAnswer: "am making", irregular })).toMatchObject({ ok: true });
    });
    it("accepts lie -> lying", () => {
      expect(validateGapAnswer({ tense: "past-continuous", baseVerb: "lie", correctAnswer: "was lying", irregular })).toMatchObject({ ok: true });
    });
  });

  describe("future-perfect vs future-perfect-continuous", () => {
    it("will have gone passes for future-perfect", () => {
      expect(validateGapAnswer({ tense: "future-perfect", baseVerb: "go", correctAnswer: "will have gone", irregular })).toMatchObject({ ok: true });
    });
    it("will have gone does NOT pass for future-perfect-continuous", () => {
      expect(validateGapAnswer({ tense: "future-perfect-continuous", baseVerb: "go", correctAnswer: "will have gone", irregular })).toMatchObject({ ok: false });
    });
    it("will have been going passes for future-perfect-continuous", () => {
      expect(validateGapAnswer({ tense: "future-perfect-continuous", baseVerb: "go", correctAnswer: "will have been going", irregular })).toMatchObject({ ok: true });
    });
  });
});
