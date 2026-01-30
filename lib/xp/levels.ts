export type LevelInfo = {
  level: number;
  xp_in_current_level: number;
  xp_to_next_level: number;
};

export function levelRequirement(level: number): number {
  return (level + 1) * 50;
}

export function calculateLevelInfo(xpTotal: number): LevelInfo {
  let level = 0;
  let remaining = Math.max(0, xpTotal);

  while (remaining >= levelRequirement(level)) {
    remaining -= levelRequirement(level);
    level += 1;
  }

  return {
    level,
    xp_in_current_level: remaining,
    xp_to_next_level: levelRequirement(level),
  };
}
