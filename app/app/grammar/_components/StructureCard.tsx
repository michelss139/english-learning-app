// Shared structure presentation for grammar tenses — used by both the
// /app/grammar/tenses overview and the individual tense "Konstrukcja" section,
// so the formula/example styling and auxiliary highlighting stay identical.

/**
 * Returns a regex with ONE capturing group so that `text.split(pattern)`
 * gives alternating [plain, match, plain, …] — odd indices are the highlights.
 * Multi-word phrases come before sub-phrases so the longer match wins.
 */
export function getAuxiliaryPattern(slug: string): RegExp | null {
  switch (slug) {
    case "present-simple":
      return /\b(don't|doesn't|do|does)\b/gi;
    case "present-continuous":
      return /\b(am not|isn't|aren't|am|is|are)\b/gi;
    case "past-simple":
      return /\b(didn't|did)\b/gi;
    case "past-continuous":
      return /\b(wasn't|weren't|was|were)\b/gi;
    case "past-perfect":
      return /\b(hadn't|had)\b/gi;
    case "past-perfect-continuous":
      return /\b(hadn't been|had been|hadn't|had)\b/gi;
    case "present-perfect":
      return /\b(haven't|hasn't|have|has)\b/gi;
    case "present-perfect-continuous":
      return /\b(haven't been|hasn't been|have been|has been)\b/gi;
    case "future-simple":
      return /\b(won't|will)\b/gi;
    case "future-continuous":
      return /\b(won't be|will be)\b/gi;
    case "future-perfect-simple":
      return /\b(won't have|will have)\b/gi;
    case "future-perfect-continuous":
      return /\b(won't have been|will have been)\b/gi;
    case "zero-conditional":
      return /\b(if|when)\b/gi;
    case "first-conditional":
      return /\b(won't|will|if)\b/gi;
    case "second-conditional":
      return /\b(wouldn't|would|if)\b/gi;
    case "third-conditional":
      return /\b(wouldn't have|would have|if)\b/gi;
    default:
      return null;
  }
}

/** Formula line — medium weight; highlighted auxiliaries are bold. */
export function HighlightedFormula({ text, slug }: { text: string; slug: string }) {
  const pattern = getAuxiliaryPattern(slug);
  if (!text) return null;
  if (!pattern) {
    return <span className="text-base font-medium leading-snug text-slate-800">{text}</span>;
  }
  const parts = text.split(pattern);
  return (
    <span className="text-base font-medium leading-snug text-slate-800">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-slate-900">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

/** Example sentence — readable slate; highlighted auxiliaries are semibold. */
export function HighlightedExample({ text, slug }: { text: string; slug: string }) {
  const pattern = getAuxiliaryPattern(slug);
  if (!text) return null;
  if (!pattern) {
    return <span className="text-[15px] text-slate-500">{text}</span>;
  }
  const parts = text.split(pattern);
  return (
    <span className="text-[15px] text-slate-500">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-semibold text-slate-800">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

/** Soft card: label + formula, with optional example sentences below. */
export function StructureCard({
  label,
  pattern,
  examples,
  slug,
}: {
  label: string;
  pattern: string;
  examples: string[];
  slug: string;
}) {
  if (!pattern?.trim()) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1.5">
        <HighlightedFormula text={pattern} slug={slug} />
      </div>
      {examples.length > 0 ? (
        <div className="mt-2 space-y-1 border-t border-slate-200/70 pt-2">
          {examples.map((ex, i) => (
            <div key={i}>
              <HighlightedExample text={ex} slug={slug} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
