import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { KnowledgeState } from "@/lib/knowledge/updateLearningUnitKnowledge";
import {
  compareIsoDesc,
  pickExampleEn,
  pickLemma,
  pickTranslationPl,
  resolveSegment,
  sortSegmentItems,
  type PoolOverviewItem,
} from "@/lib/vocab/poolOverviewUtils";

const PER_SEGMENT_LIMIT = 50;

type KnowledgeRow = {
  unit_id: string;
  knowledge_state: KnowledgeState | null;
  last_wrong_at: string | null;
  wrong_count: number | null;
  updated_at: string | null;
};

type OverviewResponse = {
  segments: {
    review: PoolOverviewItem[];
    learning: PoolOverviewItem[];
    new: PoolOverviewItem[];
    mastered: PoolOverviewItem[];
  };
  counts: {
    review: number;
    learning: number;
    new: number;
    mastered: number;
  };
  /** Sense IDs in review → learning → new order (deduped). Client uses first 8 for quick training. */
  cta_sense_ids: string[];
  /** Mastered-only review (deduped, sorted by knowledge updated_at). */
  mastered_sense_ids: string[];
};

export async function GET(req: Request): Promise<NextResponse<OverviewResponse | { error: string }>> {
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

    const userId = userData.user.id;

    const { data: userItems, error: itemsErr } = await supabase
      .from("user_vocab_items")
      .select(
        `
        id,
        sense_id,
        custom_lemma,
        custom_translation_pl,
        created_at,
        lexicon_senses(
          id,
          definition_en,
          lexicon_entries(lemma, pos),
          lexicon_translations(translation_pl),
          lexicon_examples(example_en)
        )
      `
      )
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const rows = userItems ?? [];
    const senseIds = Array.from(
      new Set(rows.map((r: { sense_id: string | null }) => r.sense_id).filter((id): id is string => Boolean(id)))
    );

    let knowledgeRows: KnowledgeRow[] = [];
    if (senseIds.length > 0) {
      const { data: kData, error: kErr } = await supabase
        .from("user_learning_unit_knowledge")
        .select("unit_id, knowledge_state, last_wrong_at, wrong_count, updated_at")
        .eq("student_id", userId)
        .eq("unit_type", "sense")
        .in("unit_id", senseIds);

      if (kErr) {
        return NextResponse.json({ error: kErr.message }, { status: 500 });
      }
      knowledgeRows = (kData ?? []) as KnowledgeRow[];
    }

    const knowledgeBySense = new Map(knowledgeRows.map((k) => [k.unit_id, k]));

    const createdAtBySense = new Map<string, string>();
    for (const r of rows as any[]) {
      const sid = r.sense_id as string | null;
      if (sid && r.created_at) {
        const prev = createdAtBySense.get(sid);
        const cur = String(r.created_at);
        if (!prev || cur > prev) createdAtBySense.set(sid, cur);
      }
    }

    type BucketTagged = { item: PoolOverviewItem; createdAt: string };
    const buckets: Record<"review" | "learning" | "new" | "mastered", BucketTagged[]> = {
      review: [],
      learning: [],
      new: [],
      mastered: [],
    };

    for (const item of rows as any[]) {
      const sense = item.lexicon_senses;
      const entry = sense?.lexicon_entries;
      const translationEmbed = sense?.lexicon_translations;
      const exampleEmbed = sense?.lexicon_examples;

      const senseId: string | null = item.sense_id;
      const k = senseId ? knowledgeBySense.get(senseId) : undefined;
      const seg = resolveSegment(k);

      const knowledgeStateDisplay: PoolOverviewItem["knowledge_state"] =
        k?.knowledge_state ?? "new";

      const wrongCount = k?.wrong_count != null ? Number(k.wrong_count) : 0;

      const overviewItem: PoolOverviewItem = {
        sense_id: senseId,
        lemma: pickLemma(entry) ?? item.custom_lemma ?? "—",
        pos: (entry?.pos as string | null) ?? null,
        translation: pickTranslationPl(translationEmbed) ?? item.custom_translation_pl ?? null,
        definition: (sense?.definition_en as string | null) ?? null,
        example: pickExampleEn(exampleEmbed),
        knowledge_state: knowledgeStateDisplay,
        last_wrong_at: k?.last_wrong_at ?? null,
        wrong_count: wrongCount,
      };

      const createdAt = typeof item.created_at === "string" ? item.created_at : "";
      buckets[seg].push({ item: overviewItem, createdAt });
    }

    const counts = {
      review: buckets.review.length,
      learning: buckets.learning.length,
      new: buckets.new.length,
      mastered: buckets.mastered.length,
    };

    const newOrderedFull = [...buckets.new].sort((a, b) => compareIsoDesc(a.createdAt, b.createdAt));

    const ctaSenseIdsRaw = [
      ...sortSegmentItems(
        "review",
        buckets.review.map((x) => x.item),
        knowledgeBySense,
        createdAtBySense
      ),
      ...sortSegmentItems(
        "learning",
        buckets.learning.map((x) => x.item),
        knowledgeBySense,
        createdAtBySense
      ),
      ...newOrderedFull.map((x) => x.item),
    ]
      .map((it) => it.sense_id)
      .filter((id): id is string => Boolean(id));

    const seenCta = new Set<string>();
    const cta_sense_ids: string[] = [];
    for (const id of ctaSenseIdsRaw) {
      if (seenCta.has(id)) continue;
      seenCta.add(id);
      cta_sense_ids.push(id);
      if (cta_sense_ids.length >= 500) break;
    }

    const masteredSortedFull = sortSegmentItems(
      "mastered",
      buckets.mastered.map((x) => x.item),
      knowledgeBySense,
      createdAtBySense
    );
    const seenM = new Set<string>();
    const mastered_sense_ids: string[] = [];
    for (const it of masteredSortedFull) {
      const id = it.sense_id;
      if (!id || seenM.has(id)) continue;
      seenM.add(id);
      mastered_sense_ids.push(id);
      if (mastered_sense_ids.length >= 500) break;
    }

    const segments: OverviewResponse["segments"] = {
      review: sortSegmentItems(
        "review",
        buckets.review.map((x) => x.item),
        knowledgeBySense,
        createdAtBySense
      ).slice(0, PER_SEGMENT_LIMIT),
      learning: sortSegmentItems(
        "learning",
        buckets.learning.map((x) => x.item),
        knowledgeBySense,
        createdAtBySense
      ).slice(0, PER_SEGMENT_LIMIT),
      new: newOrderedFull.map((x) => x.item).slice(0, PER_SEGMENT_LIMIT),
      mastered: masteredSortedFull.slice(0, PER_SEGMENT_LIMIT),
    };

    return NextResponse.json({ segments, counts, cta_sense_ids, mastered_sense_ids });
  } catch (e: unknown) {
    console.error("[vocab/pool/overview]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
