import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type IrregularVerb = {
  id: string;
  base: string;
};

type PackSuggestion = {
  slug: string;
  accuracy: number;
  href: string;
};

type ClusterSuggestion = {
  slug: string;
  accuracy: number;
  href: string;
};

type ApiResponse = {
  irregular:
    | {
        verbs: IrregularVerb[];
        total_problematic: number;
        href: "/app/irregular-verbs/train?focus=auto";
      }
    | null;
  packs: PackSuggestion[];
  clusters: ClusterSuggestion[];
};

type KnowledgeState = "unstable" | "improving";

type IrregularKnowledgeRow = {
  unit_id: string;
  knowledge_state: KnowledgeState;
  wrong_count: number | null;
};

function toAccuracy(value: number | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function stateRank(state: KnowledgeState): number {
  return state === "unstable" ? 0 : 1;
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

    const studentId = user.id;

    const [{ data: irregularKnowledgeRows, error: irregularErr }, { data: packRows, error: packErr }, { data: clusterRows, error: clusterErr }] =
      await Promise.all([
        supabase
          .from("user_learning_unit_knowledge")
          .select("unit_id, knowledge_state, wrong_count")
          .eq("student_id", studentId)
          .eq("unit_type", "irregular")
          .in("knowledge_state", ["unstable", "improving"])
          .limit(500),
        supabase
          .from("mv_user_pack_accuracy")
          .select("pack_slug, accuracy")
          .eq("student_id", studentId)
          .lt("accuracy", 0.9)
          .order("accuracy", { ascending: true })
          .limit(10),
        supabase
          .from("mv_user_cluster_accuracy")
          .select("cluster_slug, accuracy")
          .eq("student_id", studentId)
          .lt("accuracy", 0.9)
          .order("accuracy", { ascending: true })
          .limit(10),
      ]);

    if (irregularErr) {
      return NextResponse.json({ error: irregularErr.message }, { status: 500 });
    }
    if (packErr) {
      return NextResponse.json({ error: packErr.message }, { status: 500 });
    }
    if (clusterErr) {
      return NextResponse.json({ error: clusterErr.message }, { status: 500 });
    }

    const rankedIrregular = ((irregularKnowledgeRows ?? []) as IrregularKnowledgeRow[])
      .filter((row) => row.unit_id && (row.knowledge_state === "unstable" || row.knowledge_state === "improving"))
      .sort((a, b) => {
        const stateCmp = stateRank(a.knowledge_state) - stateRank(b.knowledge_state);
        if (stateCmp !== 0) return stateCmp;
        const wrongA = a.wrong_count ?? 0;
        const wrongB = b.wrong_count ?? 0;
        if (wrongA !== wrongB) return wrongB - wrongA;
        return a.unit_id.localeCompare(b.unit_id);
      })
      .slice(0, 10);

    const irregularIds = rankedIrregular.map((row) => row.unit_id);
    let irregularVerbs: IrregularVerb[] = [];

    if (irregularIds.length > 0) {
      const { data: irregularVerbRows, error: irregularVerbErr } = await supabase
        .from("irregular_verbs")
        .select("id, base")
        .in("id", irregularIds);

      if (irregularVerbErr) {
        return NextResponse.json({ error: irregularVerbErr.message }, { status: 500 });
      }

      const baseById = new Map<string, string>(
        (irregularVerbRows ?? [])
          .filter((row: any) => typeof row?.id === "string" && typeof row?.base === "string")
          .map((row: any) => [row.id as string, row.base as string])
      );

      irregularVerbs = irregularIds
        .filter((id) => baseById.has(id))
        .map((id) => ({ id, base: baseById.get(id)! }));
    }

    const packs: PackSuggestion[] = (packRows ?? [])
      .filter((row: any) => typeof row?.pack_slug === "string" && row.pack_slug.length > 0)
      .map((row: any) => ({
        slug: row.pack_slug as string,
        accuracy: toAccuracy(row.accuracy as number | null),
        href: `/app/vocab/pack/${row.pack_slug}?autostart=1`,
      }));

    const clusters: ClusterSuggestion[] = (clusterRows ?? [])
      .filter((row: any) => typeof row?.cluster_slug === "string" && row.cluster_slug.length > 0)
      .map((row: any) => ({
        slug: row.cluster_slug as string,
        accuracy: toAccuracy(row.accuracy as number | null),
        href: `/app/vocab/cluster/${row.cluster_slug}?autostart=1`,
      }));

    const response: ApiResponse = {
      irregular:
        irregularVerbs.length > 0
          ? {
              verbs: irregularVerbs,
              total_problematic: irregularVerbs.length,
              href: "/app/irregular-verbs/train?focus=auto",
            }
          : null,
      packs,
      clusters,
    };

    return NextResponse.json(response);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
