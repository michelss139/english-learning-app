import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type KnowledgeState = "mastered" | "improving" | "unstable";

type LearningUnitRow = {
  unit_type: string;
  unit_id: string;
  wrong_count: number | null;
  knowledge_state: KnowledgeState | string | null;
  last_wrong_at: string | null;
};

type Recommendation = {
  type: string;
  unitId: string;
  priority: number;
  href: string;
};

type ApiResponse = {
  recommendations: Recommendation[];
};

function toInt(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stateBonus(state: string | null | undefined): number {
  switch (state) {
    case "unstable":
      return 3;
    case "improving":
      return 1;
    default:
      return 0;
  }
}

function computePriority(row: LearningUnitRow): number {
  return toInt(row.wrong_count) * 2 + stateBonus(row.knowledge_state);
}

function toTimestamp(value: string | null): number {
  if (!value) return -1;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : -1;
}

function mapUnitToHref(unitType: string, unitId: string): string {
  switch (unitType) {
    case "sense":
      return "/app/vocab";
    case "cluster":
      return `/app/vocab/cluster/${unitId}?autostart=1`;
    case "irregular":
      return "/app/irregular-verbs/train?focus=auto";
    default:
      return "/app";
  }
}

export async function GET(): Promise<NextResponse<ApiResponse | { error: string }>> {
  try {
    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_learning_unit_knowledge")
      .select("unit_type, unit_id, wrong_count, knowledge_state, last_wrong_at")
      .eq("student_id", user.id)
      .neq("knowledge_state", "mastered")
      .limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sorted = ((data ?? []) as LearningUnitRow[])
      .filter((row) => row.unit_type && row.unit_id)
      .map((row) => ({
        type: row.unit_type,
        unitId: row.unit_id,
        priority: computePriority(row),
        lastWrongAtMs: toTimestamp(row.last_wrong_at),
        href: mapUnitToHref(row.unit_type, row.unit_id),
      }))
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.lastWrongAtMs - a.lastWrongAtMs;
      });

    const seenHrefs = new Set<string>();
    const recommendations = sorted
      .filter((item) => {
        if (seenHrefs.has(item.href)) return false;
        seenHrefs.add(item.href);
        return true;
      })
      .slice(0, 2)
      .map(({ type, unitId, priority, href }) => ({
        type,
        unitId,
        priority,
        href,
      }));

    return NextResponse.json({ recommendations });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
