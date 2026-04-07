export type PatternType = "phrase" | "structure";

export function getPatternType(pattern: string): PatternType {
  return pattern.includes("+") ? "structure" : "phrase";
}

export type PatternWithType = { pattern: string; type: PatternType };

/** Pure mapping for API payloads — no DB. */
export function patternsWithTypes(patternRows: string[]): PatternWithType[] {
  return patternRows.map((pattern) => ({
    pattern,
    type: getPatternType(pattern),
  }));
}
