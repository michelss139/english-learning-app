import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { GrammarTenseSlug } from "@/lib/grammar/types";
import {
  TENSE_GROUPS,
  TENSE_LABEL,
  TENSE_EXAMPLE,
  type TenseGroupKey,
} from "@/lib/story/tenseGroups";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoryGap = {
  id: string;
  baseVerb: string;
  correctAnswer: string;
  tense: GrammarTenseSlug;
};

type StoryPayload = {
  group: TenseGroupKey;
  story: string;
  gaps: StoryGap[];
};

type RawGapDef = {
  id: string;
  base_verb: string;
  correct_answer: string;
  tense: string;
};

type Body = {
  group?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 1200;
const GENERATION_ATTEMPTS = 3;

const CACHE_LIMIT = 8;          // max stories per group in pool
const CACHE_REFILL_FLOOR = 2;   // refill when pool drops to this

// In-memory cache — keyed by TenseGroupKey
const storyPool = new Map<TenseGroupKey, StoryPayload[]>();
const refillInFlight = new Set<TenseGroupKey>();

// ─── Cache helpers ────────────────────────────────────────────────────────────

function pushToPool(group: TenseGroupKey, payload: StoryPayload): void {
  const list = storyPool.get(group) ?? [];
  list.push(payload);
  while (list.length > CACHE_LIMIT) list.shift();
  storyPool.set(group, list);
}

function popFromPool(group: TenseGroupKey): StoryPayload | null {
  const list = storyPool.get(group);
  if (!list || list.length === 0) return null;
  const next = list.shift() ?? null;
  storyPool.set(group, list);
  return next;
}

function poolSize(group: TenseGroupKey): number {
  return (storyPool.get(group) ?? []).length;
}

function isGroupKey(value: string): value is TenseGroupKey {
  return value in TENSE_GROUPS;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(tenses: readonly GrammarTenseSlug[]): string {
  const gapsPerTense = tenses.length <= 2 ? 3 : 2;
  const totalGaps = tenses.length * gapsPerTense;

  const tenseList = tenses
    .map((t) => {
      const label = TENSE_LABEL[t] ?? t;
      const example = TENSE_EXAMPLE[t] ? ` — e.g. ${TENSE_EXAMPLE[t]}` : "";
      return `  • ${label}${example}`;
    })
    .join("\n");

  const slugList = tenses.join(", ");

  return `You are an English language teacher creating a B1-level grammar exercise.

Write a short, coherent story (8–10 sentences) that uses these verb tenses as fill-in-the-blank gaps:
${tenseList}

RULES:
1. Include exactly ${gapsPerTense} gaps for each tense listed above (${totalGaps} gaps total).
2. Mark each gap in the story as [BLANK_1], [BLANK_2], ... numbered in order of appearance.
3. Every selected tense instance MUST be a blank — do NOT write them as plain text.
4. You may use other tenses sparingly as "glue" (e.g. "he said"), but never make them blanks.
5. B1 vocabulary only — everyday words. No rare or literary language.
6. Write one continuous story — no bullet points, no headings, no meta-commentary.

OUTPUT FORMAT (follow exactly):
[story text with [BLANK_N] markers]

---GAPS---
[{"id":"g1","base_verb":"INFINITIVE","correct_answer":"EXACT FORM","tense":"TENSE_SLUG"},...]

Where:
- id: "g1", "g2", ... matching [BLANK_1], [BLANK_2], ... in order
- base_verb: infinitive/base form (e.g. "walk", "be", "have", "go")
- correct_answer: the exact verb form that fills the blank (e.g. "was walking", "had finished", "has been waiting")
- tense: one of: ${slugList}

Output only the story and JSON. No other text.`;
}

// ─── Response parser ──────────────────────────────────────────────────────────

type ParsedStory = {
  story: string;
  gaps: StoryGap[];
};

function parseStoryResponse(
  raw: string,
  selectedTenses: readonly GrammarTenseSlug[]
): ParsedStory | null {
  // Find the separator — allow optional whitespace around it
  const sepMatch = raw.match(/\n\s*---GAPS---\s*\n/);
  if (!sepMatch || sepMatch.index == null) return null;

  const storyRaw = raw.slice(0, sepMatch.index).trim();
  let jsonRaw = raw.slice(sepMatch.index + sepMatch[0].length).trim();

  // Strip markdown code fences if model adds them anyway
  jsonRaw = jsonRaw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let gapDefs: RawGapDef[];
  try {
    const parsed = JSON.parse(jsonRaw);
    if (!Array.isArray(parsed)) return null;
    gapDefs = parsed as RawGapDef[];
  } catch {
    return null;
  }

  // Count [BLANK_N] markers in story — must match gap array length
  const blanksInStory = (storyRaw.match(/\[BLANK_\d+\]/g) ?? []).length;
  if (blanksInStory === 0 || blanksInStory !== gapDefs.length) return null;

  // Validate each gap definition
  const selectedSet = new Set(selectedTenses);
  for (const gap of gapDefs) {
    if (typeof gap.id !== "string" || !gap.id.trim()) return null;
    if (typeof gap.base_verb !== "string" || !gap.base_verb.trim()) return null;
    if (typeof gap.correct_answer !== "string" || !gap.correct_answer.trim()) return null;
    if (!selectedSet.has(gap.tense as GrammarTenseSlug)) return null;
  }

  // Each selected tense must appear at least once
  for (const tense of selectedTenses) {
    if (!gapDefs.some((g) => g.tense === tense)) return null;
  }

  // Replace [BLANK_N] → {{gN}} in story text
  const story = storyRaw.replace(/\[BLANK_(\d+)\]/g, (_, n) => `{{g${n}}}`);

  // Build canonical gap objects
  const gaps: StoryGap[] = gapDefs.map((g, i) => ({
    id: `g${i + 1}`,
    baseVerb: g.base_verb.trim().toLowerCase(),
    correctAnswer: g.correct_answer.trim(),
    tense: g.tense as GrammarTenseSlug,
  }));

  return { story, gaps };
}

// ─── Story generation ─────────────────────────────────────────────────────────

async function generateStory(
  group: TenseGroupKey
): Promise<{ ok: true; data: StoryPayload } | { ok: false; reason: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, reason: "missing_api_key" };

  const tenses = TENSE_GROUPS[group].tenses;
  const prompt = buildPrompt(tenses);
  const client = new Anthropic({ apiKey });

  for (let attempt = 0; attempt < GENERATION_ATTEMPTS; attempt++) {
    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });

      const block = message.content[0];
      if (!block || block.type !== "text") continue;

      const parsed = parseStoryResponse(block.text, tenses);
      if (!parsed) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[story-generator] parse failed on attempt", attempt + 1, "\n---\n", block.text.slice(0, 500));
        }
        continue;
      }

      return {
        ok: true,
        data: {
          group,
          story: parsed.story,
          gaps: parsed.gaps,
        },
      };
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[story-generator] generation error on attempt", attempt + 1, e);
      }
    }
  }

  return { ok: false, reason: "generation_failed" };
}

// ─── Background pool refill ───────────────────────────────────────────────────

function maybeRefillPool(group: TenseGroupKey): void {
  if (poolSize(group) >= CACHE_REFILL_FLOOR) return;
  if (refillInFlight.has(group)) return;
  refillInFlight.add(group);

  void (async () => {
    try {
      while (poolSize(group) < CACHE_REFILL_FLOOR) {
        const built = await generateStory(group);
        if (!built.ok) break;
        pushToPool(group, built.data);
      }
    } finally {
      refillInFlight.delete(group);
    }
  })();
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const groupRaw = String(body?.group ?? "").trim();

    if (!groupRaw) {
      return NextResponse.json({ error: "group is required", reason: "group_required" }, { status: 400 });
    }
    if (!isGroupKey(groupRaw)) {
      return NextResponse.json({ error: "Invalid group", reason: "invalid_group" }, { status: 400 });
    }

    const group = groupRaw as TenseGroupKey;

    // Try from cache first
    const fromPool = popFromPool(group);
    if (fromPool) {
      maybeRefillPool(group);
      return NextResponse.json({ ok: true, data: fromPool, source: "cache" });
    }

    // Generate fresh
    const built = await generateStory(group);
    if (!built.ok) {
      return NextResponse.json(
        { error: "Story generation failed", reason: built.reason },
        { status: 500 }
      );
    }

    maybeRefillPool(group);
    return NextResponse.json({ ok: true, data: built.data, source: "generated" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[story-generator] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
