import type { KnowledgeState } from "@/lib/knowledge/updateLearningUnitKnowledge";

export type PoolBadgeState = KnowledgeState | "new";

export function poolKnowledgeBadge(state: PoolBadgeState | null | undefined): { label: string; className: string } {
  const s = state ?? "new";
  switch (s) {
    case "unstable":
      return { label: "Do powtórki", className: "bg-rose-100 text-rose-700" };
    case "improving":
      return { label: "W trakcie", className: "bg-amber-100 text-amber-700" };
    case "mastered":
      return { label: "Opanowane", className: "bg-emerald-100 text-emerald-700" };
    case "new":
    default:
      return { label: "Nowe", className: "bg-slate-100 text-slate-500" };
  }
}
