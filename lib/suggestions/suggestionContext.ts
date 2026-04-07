export const TRAINING_CONTEXT_SUGGESTION = "suggestion" as const;
export type TrainingEntryContext = typeof TRAINING_CONTEXT_SUGGESTION;

/** True when `training_sessions.metadata` was set from a Knowledge Engine / suggestions entry link. */
export function isSuggestionTrainingMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>).context === TRAINING_CONTEXT_SUGGESTION;
}

/** Appends `context=suggestion` to an internal training href (idempotent). */
export function appendSuggestionContext(href: string): string {
  if (!href || href.includes("context=suggestion")) return href;
  return href.includes("?") ? `${href}&context=suggestion` : `${href}?context=suggestion`;
}
