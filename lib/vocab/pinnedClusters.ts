const MARKER_PREFIX = "__vocab_pinned_clusters__=";

export function parsePinnedClusterSlugs(notes: string | null | undefined): string[] {
  if (!notes) return [];

  const lines = notes.split("\n");
  const markerLine = lines.find((l) => l.startsWith(MARKER_PREFIX));
  if (!markerLine) return [];

  const raw = markerLine.slice(MARKER_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {
    return [];
  }
}

export function writePinnedClusterSlugs(notes: string | null | undefined, pinnedSlugs: string[]): string {
  const cleaned = Array.from(new Set(pinnedSlugs.filter((s) => typeof s === "string" && s.trim().length > 0)));
  const payload = `${MARKER_PREFIX}${JSON.stringify(cleaned)}`;

  const base = (notes ?? "")
    .split("\n")
    .filter((l) => !l.startsWith(MARKER_PREFIX))
    .join("\n")
    .trim();

  if (!base) return payload;
  return `${base}\n${payload}`;
}

