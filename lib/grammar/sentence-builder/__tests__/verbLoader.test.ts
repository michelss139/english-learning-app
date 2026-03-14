import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { SENTENCE_BUILDER_VERB_WHITELIST } from "../verbWhitelist";
import { clearSentenceBuilderVerbCache, loadSentenceBuilderVerbs } from "../verbLoader";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdmin: vi.fn(),
}));

describe("sentence-builder verbLoader", () => {
  const inMock = vi.fn();
  const selectMock = vi.fn(() => ({ in: inMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));

  beforeEach(() => {
    clearSentenceBuilderVerbCache();
    vi.clearAllMocks();
    vi.mocked(createSupabaseAdmin).mockReturnValue({
      from: fromMock,
    } as never);
  });

  it("filters rows to the sentence builder whitelist", async () => {
    inMock.mockResolvedValueOnce({
      data: [
        { base: "go", past_simple: "went", past_participle: "gone" },
        { base: "see", past_simple: "saw", past_participle: "seen" },
        { base: "run", past_simple: "ran", past_participle: "run" },
      ],
      error: null,
    });

    const verbs = await loadSentenceBuilderVerbs();

    expect(verbs).toEqual([
      { base: "go", past: "went", pastParticiple: "gone" },
      { base: "see", past: "saw", pastParticiple: "seen" },
    ]);
    expect(inMock).toHaveBeenCalledWith("base", [...SENTENCE_BUILDER_VERB_WHITELIST]);
  });

  it("uses in-memory cache after the first fetch", async () => {
    inMock.mockResolvedValueOnce({
      data: [{ base: "go", past_simple: "went", past_participle: "gone" }],
      error: null,
    });

    const first = await loadSentenceBuilderVerbs();
    const second = await loadSentenceBuilderVerbs();

    expect(first).toEqual([{ base: "go", past: "went", pastParticiple: "gone" }]);
    expect(second).toEqual(first);
    expect(createSupabaseAdmin).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(inMock).toHaveBeenCalledTimes(1);
  });
});
