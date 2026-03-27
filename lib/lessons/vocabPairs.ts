/**
 * Lesson "vocab pairs" field: newline-separated `angielski - polski`, stored in `lessons.vocab_pairs`.
 * Used only for isolated micro-training (not linked to vocab pool or knowledge).
 */

export type LessonVocabPair = {
  source: string;
  target: string;
};

export type ParseLessonVocabPairsResult =
  | { ok: true; stored: string | null }
  | { ok: false };

/** One pair per line: `word - słowo` (spacja, myślnik, spacja). Linie puste ignorowane. */
export function parseLessonVocabPairsInput(raw: string): ParseLessonVocabPairsResult {
  const lines = raw.split(/\r?\n/);
  let hasNonEmptyLine = false;
  const pairs: LessonVocabPair[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    hasNonEmptyLine = true;
    const m = t.match(/^(.+?)\s+-\s+(.+)$/);
    if (!m) return { ok: false };
    const source = m[1]!.trim();
    const target = m[2]!.trim();
    if (!source || !target) return { ok: false };
    pairs.push({ source, target });
  }

  if (!hasNonEmptyLine) return { ok: true, stored: null };
  const stored = pairs.map((p) => `${p.source} - ${p.target}`).join("\n");
  return { ok: true, stored };
}

function parseStoredLine(t: string): LessonVocabPair | null {
  const dash = t.match(/^(.+?)\s+-\s+(.+)$/);
  if (dash) {
    const source = dash[1]!.trim();
    const target = dash[2]!.trim();
    if (source && target) return { source, target };
  }
  const pipe = t.indexOf("|");
  if (pipe >= 0) {
    const source = t.slice(0, pipe).trim();
    const target = t.slice(pipe + 1).trim();
    if (source && target) return { source, target };
  }
  return null;
}

/** Parse DB string into ordered pairs. Obsługa zapisu ` - ` oraz starszego `|`. */
export function parseLessonVocabPairsStored(raw: string | null | undefined): LessonVocabPair[] {
  if (!raw || !String(raw).trim()) return [];
  const out: LessonVocabPair[] = [];
  for (const line of String(raw).split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const p = parseStoredLine(t);
    if (p) out.push(p);
  }
  return out;
}

/** Encode pairs for URL query (?pairs=). */
export function encodeLessonVocabPairsForQuery(pairs: LessonVocabPair[]): string {
  return encodeURIComponent(JSON.stringify(pairs));
}

/** Decode ?pairs= query value; returns null if invalid. */
export function decodeLessonVocabPairsFromQuery(encoded: string | null | undefined): LessonVocabPair[] | null {
  if (encoded == null || !String(encoded).trim()) return null;
  try {
    const decoded = decodeURIComponent(String(encoded));
    const data = JSON.parse(decoded) as unknown;
    if (!Array.isArray(data)) return null;
    const out: LessonVocabPair[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const source = typeof o.source === "string" ? o.source.trim() : "";
      const target = typeof o.target === "string" ? o.target.trim() : "";
      if (!source || !target) return null;
      out.push({ source, target });
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

export function normalizeLessonAnswer(s: string): string {
  return s.trim().toLowerCase();
}
