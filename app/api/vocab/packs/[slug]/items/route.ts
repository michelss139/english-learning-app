import { NextResponse } from "next/server";
import { createSupabaseServerWithToken } from "@/lib/supabase/server";

type PackItemDto = {
  id: string;
  sense_id: string;
  lemma: string | null;
  translation_pl: string | null;
  example_en: string | null;
  definition_en: string | null;
  order_index: number;
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

    const { data: pack, error: packErr } = await supabase
      .from("vocab_packs")
      .select("id, slug, title, description, is_published")
      .eq("slug", slug)
      .maybeSingle();

    if (packErr) {
      return NextResponse.json({ error: packErr.message }, { status: 500 });
    }
    if (!pack || !pack.is_published) {
      return NextResponse.json({ error: "Pack not found", code: "NOT_FOUND" }, { status: 404 });
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

    const payload: PackItemDto[] = (items ?? []).map((item: any) => {
      const sense = Array.isArray(item.lexicon_senses) ? item.lexicon_senses[0] : item.lexicon_senses;
      const entry = sense?.lexicon_entries;
      const translationEmbed = sense?.lexicon_translations;
      const exampleEmbed = sense?.lexicon_examples;

      return {
        id: item.id,
        sense_id: item.sense_id,
        lemma: entry?.lemma ?? null,
        translation_pl: pickTranslationPl(translationEmbed),
        example_en: pickExampleEn(exampleEmbed),
        definition_en: sense?.definition_en ?? null,
        order_index: item.order_index ?? 0,
      };
    });

    return NextResponse.json({
      ok: true,
      pack: {
        id: pack.id,
        slug: pack.slug,
        title: pack.title,
        description: pack.description ?? null,
      },
      items: payload,
    });
  } catch (e: any) {
    console.error("[packs/items] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
