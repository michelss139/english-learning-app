import type { KnowledgeState } from "@/lib/knowledge/updateLearningUnitKnowledge";

export type PoolBadgeState = KnowledgeState | "new";

export function poolKnowledgeBadge(state: PoolBadgeState | null | undefined): { label: string; className: string } {
  const s = state ?? "new";
  switch (s) {
    case "unstable":
      return { label: "Błąd ostatnio", className: "bg-red-100 text-red-700" };
    case "improving":
      return { label: "W trakcie", className: "bg-yellow-100 text-yellow-700" };
    case "mastered":
      return { label: "Opanowane", className: "bg-green-100 text-green-700" };
    case "new":
    default:
      return { label: "Nowe", className: "bg-neutral-100 text-neutral-600" };
  }
}
