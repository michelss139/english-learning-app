import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateGapAnswer, type IrregularForms } from "@/lib/grammar/formEngine";
import { STORY_PROFILES, type StoryProfileKey } from "@/lib/story/profiles";

const IRREGULAR: Record<string, IrregularForms> = {
  go: { base: "go", past: "went", pastParticiple: "gone" },
  run: { base: "run", past: "ran", pastParticiple: "run" },
  see: { base: "see", past: "saw", pastParticiple: "seen" },
  write: { base: "write", past: "wrote", pastParticiple: "written" },
  make: { base: "make", past: "made", pastParticiple: "made" },
  build: { base: "build", past: "built", pastParticiple: "built" },
  begin: { base: "begin", past: "began", pastParticiple: "begun" },
};

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdmin: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      }),
    },
  }),
}));

vi.mock("@/lib/grammar/irregularLoader", () => ({
  getIrregularMap: vi.fn().mockResolvedValue(IRREGULAR),
}));

const STORIES: Record<StoryProfileKey, string> = {
  past_narration:
    "Last autumn I walked to the old station every evening because I wanted silence after work. A cold wind moved through the empty street, and the lamps were shining on wet stone. I was carrying a paper notebook and I was watching people rush home with tired faces. One night I heard a metal sound behind the ticket window and I stopped. I had left my wallet there the day before, but I had not expected anyone to find it. A cleaner opened the door, smiled, and handed it back to me. I thanked her, sat on a wooden bench, and wrote three pages before the rain started. When I walked home, I felt lighter than before. The next morning I called my brother and told him what had happened. He laughed and said that luck follows calm people. Since that evening, I kept a quieter rhythm, and the city seemed friendlier whenever the sky turned gray. I also visited the station again on Friday, and I stayed there until the last train left the platform. Later I had shared this story with my neighbors, and they were listening carefully while I was describing every small detail.",
  turning_point:
    "At the beginning of spring, we were preparing a small exhibition in our local library. I was checking labels, my friend was arranging photographs, and visitors were waiting outside for the opening. We had planned every detail for two months, and we had tested the lights twice before the event. Ten minutes before the first guests entered, one cable failed and the main wall went dark. I called the technician, but he was helping another building and could not come quickly. We moved three lamps from the reading room, fixed the angle, and continued without panic. People noticed the warm light and said the photos looked more intimate than expected. After the event ended, we counted comments and found that most visitors preferred the final setup. I walked home at midnight, tired but grateful, because a sudden problem had changed our plan into something better. The next week, we reused that arrangement for a second show, and the room felt warmer from the very first minute. Before the second opening, we had prepared backup cables, and we were feeling much calmer than during the first chaotic evening.",
  goal_journey:
    "For three years I have worked toward a language certificate that once felt impossible. I have changed my routine many times, and I have learned that small habits matter more than dramatic promises. In the beginning I studied in short bursts, then forgot everything after busy weeks. Last year I joined a quiet study group and met people with the same goal. We shared notes, compared mistakes, and celebrated small progress after each session. Since January I have been waking up earlier, and I have been practicing speaking before breakfast. I have been recording my voice, listening carefully, and correcting weak sounds line by line. Two months ago I took a mock exam and scored much lower than I expected. I reviewed every section, rebuilt my plan, and started again with clearer priorities. Now I feel calmer and stronger. I have not reached the final result yet, but the journey has already changed how I work, learn, and trust myself. Last weekend I met my teacher, and we designed one final month of focused practice. I have also helped two new learners, and that mentoring has made my own progress even more consistent.",
  plan_and_result:
    "Our team plans a product launch for late summer, and everyone works with a clear weekly rhythm. I check the roadmap every morning, review blockers with design, and update the timeline before lunch. Marta leads communication, Piotr tests edge cases, and Lena calls partners when new constraints appear. Next month we will publish the preview page, and we will open a waiting list for early users. We will run two internal demos, then we will collect feedback and adjust priorities. By the end of July we will have finished the onboarding flow, and we will have built the first analytics dashboard. We will have written support guides, and we will have prepared training notes for the sales team. If all milestones stay stable, we will release the final version on schedule. The routine stays simple: we plan, we check, and we deliver one strong increment at a time. That discipline keeps the project calm and the results predictable. In every weekly review, the team tracks progress carefully and closes issues before they grow. By release day we will have solved the final blockers, and each manager reviews outcomes with a stable checklist.",
};

const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body ?? "{}")) as {
    messages?: Array<{ role: string; content: string }>;
  };
  const prompt = body.messages?.[1]?.content ?? "";

  let selected: StoryProfileKey = "past_narration";
  if (prompt.includes("Label: Plan i rezultat")) {
    selected = "plan_and_result";
  } else if (prompt.includes("Label: Droga do celu")) {
    selected = "goal_journey";
  } else if (prompt.includes("Label: Punkt zwrotny")) {
    selected = "turning_point";
  } else if (prompt.includes("Label: Narracja przeszla")) {
    selected = "past_narration";
  }

  return new Response(
    JSON.stringify({
      choices: [{ message: { content: STORIES[selected] } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});

describe("story-generator profile mode", () => {
  beforeEach(() => {
    fetchMock.mockClear();
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", fetchMock);
  });

  it("returns valid payloads for each profile in 10 runs", async () => {
    const { POST } = await import("./route");

    for (const profile of Object.keys(STORY_PROFILES) as StoryProfileKey[]) {
      const expectedTenses = new Set(STORY_PROFILES[profile].tenses);

      for (let i = 0; i < 10; i += 1) {
        const req = new Request("http://localhost/api/story-generator", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          },
          body: JSON.stringify({ profile }),
        });

        const res = await POST(req);
        const json = (await res.json()) as {
          ok: boolean;
          data: { story: string; gaps: Array<{ id: string; tense: string; baseVerb: string; correctAnswer: string }> };
          reason?: string;
          error?: string;
        };
        if (res.status !== 200) {
          throw new Error(`Profile ${profile} run ${i + 1} failed: ${res.status} ${json.reason ?? json.error ?? "unknown"}`);
        }
        expect(res.status).toBe(200);
        expect(json.ok).toBe(true);
        expect(json.data.gaps.length).toBeGreaterThanOrEqual(10);
        expect(json.data.gaps.length).toBeLessThanOrEqual(12);

        const placeholders = Array.from(json.data.story.matchAll(/\{\{(g\d+)\}\}/g)).map((m) => m[1]);
        expect(placeholders.length).toBe(json.data.gaps.length);
        expect(new Set(placeholders).size).toBe(placeholders.length);

        const tenseSet = new Set(json.data.gaps.map((g) => g.tense));
        for (const tense of expectedTenses) {
          expect(tenseSet.has(tense)).toBe(true);
        }

        for (const gap of json.data.gaps) {
          const validation = validateGapAnswer({
            tense: gap.tense as import("@/lib/grammar/formEngine").TenseSlug,
            baseVerb: gap.baseVerb,
            correctAnswer: gap.correctAnswer,
            irregular: IRREGULAR,
          });
          expect(validation.ok).toBe(true);
          if (gap.tense === "past-simple") {
            expect(gap.correctAnswer).not.toBe("was");
            expect(gap.correctAnswer).not.toBe("were");
          }
        }
      }
    }
  });
});
