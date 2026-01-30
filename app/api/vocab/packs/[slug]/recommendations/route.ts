import { NextResponse } from "next/server";
import { createSupabaseServerWithToken } from "@/lib/supabase/server";

type RecommendationItem = {
  sense_id: string;
  lemma: string | null;
  translation_pl: string | null;
  example_en: string | null;
  definition_en: string | null;
};

function pickTranslationPl(embed: any): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return embed[0]?.translation_pl || null;
  }
  if (typeof embed === "object" && embed.translation_pl) {
    return embed.translation_pl;
  }
  return null;
}

function pickExampleEn(embed: any): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return embed[0]?.example_en || null;
  }
  if (typeof embed === "object" && embed.example_en) {
    return embed.example_en;
  }
  return null;
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization bearer token", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseServerWithToken(token);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Authentication failed", code: "UNAUTHORIZED" }, { status: 401 });
    }
    const userId = userData.user.id;

    const { data: pack, error: packErr } = await supabase
      .from("vocab_packs")
      .select("id, slug, is_published")
      .eq("slug", slug)
      .maybeSingle();

    if (packErr) {
      return NextResponse.json({ error: packErr.message }, { status: 500 });
    }
    if (!pack || !pack.is_published) {
      return NextResponse.json({ error: "Pack not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const { data: wrongEvents, error: wrongErr } = await supabase
      .from("vocab_answer_events")
      .select("context_id")
      .eq("student_id", userId)
      .eq("pack_id", pack.id)
      .eq("context_type", "vocab_pack")
      .eq("is_correct", false)
      .eq("session_id", sessionId);

    if (wrongErr) {
      return NextResponse.json({ error: wrongErr.message }, { status: 500 });
    }

    const wrongSenseIds = Array.from(new Set((wrongEvents ?? []).map((e) => e.context_id).filter(Boolean)));
    if (wrongSenseIds.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const { data: existing, error: existingErr } = await supabase
      .from("user_vocab_items")
      .select("sense_id")
      .eq("student_id", userId)
      .in("sense_id", wrongSenseIds);

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    const existingSet = new Set((existing ?? []).map((row) => row.sense_id).filter(Boolean));
    const remainingSenseIds = wrongSenseIds.filter((id) => !existingSet.has(id));

    if (remainingSenseIds.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const { data: packItems, error: packItemsErr } = await supabase
      .from("vocab_pack_items")
      .select("sense_id, order_index")
      .eq("pack_id", pack.id)
      .in("sense_id", remainingSenseIds);

    if (packItemsErr) {
      return NextResponse.json({ error: packItemsErr.message }, { status: 500 });
    }

    const orderMap = new Map((packItems ?? []).map((row) => [row.sense_id, row.order_index ?? 0]));

    const { data: senses, error: sensesErr } = await supabase
      .from("lexicon_senses")
      .select(
        `
        id,
        definition_en,
        lexicon_entries(lemma),
        lexicon_translations(translation_pl),
        lexicon_examples(example_en)
      `
      )
      .in("id", remainingSenseIds);

    if (sensesErr) {
      return NextResponse.json({ error: sensesErr.message }, { status: 500 });
    }

    const items: RecommendationItem[] = (senses ?? []).map((sense: any) => {
      const entry = sense?.lexicon_entries;
      const translationEmbed = sense?.lexicon_translations;
      const exampleEmbed = sense?.lexicon_examples;

      return {
        sense_id: sense.id,
        lemma: entry?.lemma ?? null,
        translation_pl: pickTranslationPl(translationEmbed),
        example_en: pickExampleEn(exampleEmbed),
        definition_en: sense?.definition_en ?? null,
      };
    });

    items.sort((a, b) => (orderMap.get(a.sense_id) ?? 0) - (orderMap.get(b.sense_id) ?? 0));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("[packs/recommendations] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
