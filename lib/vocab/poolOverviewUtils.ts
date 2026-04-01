import type { KnowledgeState } from "@/lib/knowledge/updateLearningUnitKnowledge";

export type PoolOverviewKnowledgeState = KnowledgeState | "new";

export type PoolOverviewItem = {
  sense_id: string | null;
  lemma: string;
  pos: string | null;
  translation: string | null;
  definition: string | null;
  example: string | null;
  knowledge_state: PoolOverviewKnowledgeState;
  last_wrong_at: string | null;
  wrong_count: number;
};

const MS_72H = 72 * 60 * 60 * 1000;

export function isWithinLast72h(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= MS_72H;
}

export function pickLemma(embed: unknown): string | null {
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

export function pickTranslationPl(embed: unknown): string | null {
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

export function pickExampleEn(embed: unknown): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    const first = embed[0];
    if (first && typeof first === "object" && "example_en" in first) {
      const v = (first as { example_en?: unknown }).example_en;
      return typeof v === "string" ? v : null;
    }
    return null;
  }
  if (typeof embed === "object" && embed !== null && "example_en" in embed) {
    const value = (embed as { example_en?: unknown }).example_en;
    return typeof value === "string" ? value : null;
  }
  return null;
}

type KnowledgeRow = {
  unit_id: string;
  knowledge_state: KnowledgeState | null;
  last_wrong_at: string | null;
  wrong_count: number | null;
  updated_at: string | null;
};

type Segment = "review" | "learning" | "new" | "mastered";

export function resolveSegment(k: KnowledgeRow | undefined): Segment {
  const state = k?.knowledge_state ?? null;
  const lastWrong = k?.last_wrong_at ?? null;
  const recentWrong = isWithinLast72h(lastWrong);

  if (state === "unstable" || recentWrong) return "review";
  if (state === "improving") return "learning";
  if (state === "mastered") return "mastered";
  return "new";
}

export function compareIsoDesc(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a > b ? -1 : a < b ? 1 : 0;
}

export function sortSegmentItems(segment: Segment, items: PoolOverviewItem[], knowledgeBySense: Map<string, KnowledgeRow>, createdAtBySense: Map<string, string>): PoolOverviewItem[] {
  const copy = [...items];
  if (segment === "review") {
    copy.sort((a, b) => {
      const sa = a.sense_id ? knowledgeBySense.get(a.sense_id) : undefined;
      const sb = b.sense_id ? knowledgeBySense.get(b.sense_id) : undefined;
      const c = compareIsoDesc(sa?.last_wrong_at, sb?.last_wrong_at);
      if (c !== 0) return c;
      const wa = sa?.wrong_count ?? a.wrong_count ?? 0;
      const wb = sb?.wrong_count ?? b.wrong_count ?? 0;
      return wb - wa;
    });
  } else if (segment === "learning" || segment === "mastered") {
    copy.sort((a, b) => {
      const sa = a.sense_id ? knowledgeBySense.get(a.sense_id) : undefined;
      const sb = b.sense_id ? knowledgeBySense.get(b.sense_id) : undefined;
      return compareIsoDesc(sa?.updated_at, sb?.updated_at);
    });
  } else {
    copy.sort((a, b) => {
      const ca = a.sense_id ? createdAtBySense.get(a.sense_id) ?? "" : "";
      const cb = b.sense_id ? createdAtBySense.get(b.sense_id) ?? "" : "";
      return compareIsoDesc(ca || null, cb || null);
    });
  }
  return copy;
}
