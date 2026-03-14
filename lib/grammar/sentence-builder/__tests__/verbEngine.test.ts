import { beforeEach, describe, expect, it } from "vitest";
import {
  getIngForm,
  getPastParticiple,
  getPastSimple,
  getThirdPersonForm,
  registerSentenceBuilderVerbs,
} from "../verbEngine";

describe("sentence-builder verbEngine", () => {
  beforeEach(() => {
    registerSentenceBuilderVerbs([
      { base: "go", past: "went", pastParticiple: "gone" },
      { base: "see", past: "saw", pastParticiple: "seen" },
    ]);
  });

  it("returns irregular past and past participle forms", () => {
    expect(getPastSimple("go")).toBe("went");
    expect(getPastParticiple("go")).toBe("gone");
  });

  it("builds third person forms for common endings", () => {
    expect(getThirdPersonForm("go")).toBe("goes");
    expect(getThirdPersonForm("watch")).toBe("watches");
    expect(getThirdPersonForm("study")).toBe("studies");
  });

  it("builds -ing forms for common cases", () => {
    expect(getIngForm("go")).toBe("going");
    expect(getIngForm("run")).toBe("running");
    expect(getIngForm("write")).toBe("writing");
  });

  it("avoids over-doubling multi-syllable regular verbs", () => {
    expect(getIngForm("visit")).toBe("visiting");
  });
});
