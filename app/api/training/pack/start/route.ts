import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type CountMode = "5" | "10" | "all";

type StartBody = {
  slug?: string;
  countMode?: CountMode;
  count_mode?: CountMode;
};

type PackItemDto = {
  id: string;
  sense_id: string;
  lemma: string | null;
  translation_pl: string | null;
  example_en: string | null;
  definition_en: string | null;
  order_index: number;
};

type StartResponse = {
  sessionId: string;
  items: PackItemDto[];
};

type ErrorResponse = {
  error: string;
  code?: string;
};

function pickTranslationPl(embed: unknown): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return typeof embed[0]?.translation_pl === "string" ? embed[0].translation_pl : null;
  }
  if (typeof embed === "object" && embed !== null && "translation_pl" in embed) {
    const value = (embed as { translation_pl?: unknown }).translation_pl;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function pickLemma(embed: unknown): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return typeof embed[0]?.lemma === "string" ? embed[0].lemma : null;
  }
  if (typeof embed === "object" && embed !== null && "lemma" in embed) {
    const value = (embed as { lemma?: unknown }).lemma;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function pickExampleEn(embed: unknown): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return typeof embed[0]?.example_en === "string" ? embed[0].example_en : null;
  }
  if (typeof embed === "object" && embed !== null && "example_en" in embed) {
    const value = (embed as { example_en?: unknown }).example_en;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function shuffleArray<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function parseCountMode(value: unknown): CountMode | null {
  return value === "5" || value === "10" || value === "all" ? value : null;
}

function applyCountMode(items: PackItemDto[], countMode: CountMode): PackItemDto[] {
  if (countMode === "all") return items;
  const limit = countMode === "5" ? 5 : 10;
  return items.slice(0, Math.min(limit, items.length));
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function POST(req: Request): Promise<NextResponse<StartResponse | ErrorResponse>> {
  try {
    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
      error: sessionErr,
    } = await supabase.auth.getUser();

    if (sessionErr || !user?.id) {
      return NextResponse.json(
        { error: "Authentication failed", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as StartBody;
    const slug = body.slug?.trim();
    const countMode = parseCountMode(body.countMode ?? body.count_mode);

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    if (!countMode) {
      return NextResponse.json(
        { error: 'countMode must be one of: "5", "10", "all"', code: "INVALID_COUNT_MODE" },
        { status: 400 }
      );
    }

    const { data: pack, error: packErr } = await supabase
      .from("vocab_packs")
      .select("id, is_published")
      .eq("slug", slug)
      .maybeSingle();

    if (packErr) {
      return NextResponse.json({ error: packErr.message }, { status: 500 });
    }

    if (!pack || !pack.is_published) {
      return NextResponse.json(
        { error: "Pack not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const { data: items, error: itemsErr } = await supabase
      .from("vocab_pack_items")
      .select(
        `
        id,
        sense_id,
        order_index,
        lexicon_senses(
          id,
          definition_en,
          lexicon_entries(lemma),
          lexicon_translations(translation_pl),
          lexicon_examples(example_en)
        )
      `
      )
      .eq("pack_id", pack.id)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    type PackItemRow = {
      id: string;
      sense_id: string;
      order_index: number;
      lexicon_senses: Record<string, unknown> | Record<string, unknown>[] | null;
    };

    const mappedItems: PackItemDto[] = (items ?? []).map((item: PackItemRow) => {
      const sense = Array.isArray(item.lexicon_senses) ? item.lexicon_senses[0] : item.lexicon_senses;
      const entry = (sense as Record<string, unknown> | undefined)?.lexicon_entries;
      const translationEmbed = (sense as Record<string, unknown> | undefined)?.lexicon_translations;
      const exampleEmbed = (sense as Record<string, unknown> | undefined)?.lexicon_examples;

      return {
        id: item.id,
        sense_id: item.sense_id,
        lemma: pickLemma(entry),
        translation_pl: pickTranslationPl(translationEmbed),
        example_en: pickExampleEn(exampleEmbed),
        definition_en: (sense as Record<string, unknown> | undefined)?.definition_en as string ?? null,
        order_index: item.order_index ?? 0,
      };
    });

    const selectedItems = applyCountMode(shuffleArray(mappedItems), countMode);
    const sessionId = createSessionId();

    const { error: sessionInsertErr } = await supabase
      .from("training_sessions")
      .insert({
        id: sessionId,
        student_id: user.id,
        exercise_type: "pack",
        status: "started",
        context_slug: slug,
        context_id: pack.id,
        question_count: selectedItems.length,
        metadata: {
          countMode,
          source: "manual",
        },
      });

    if (sessionInsertErr) {
      return NextResponse.json({ error: sessionInsertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      sessionId,
      items: selectedItems,
    });
  } catch (e: unknown) {
    console.error("[training/pack/start] Error:", e);

    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
