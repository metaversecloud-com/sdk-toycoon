// XP needed to reach each level: index 0 = Level 1. V1 stops at Level 3 (Train).
export const LEVEL_XP_THRESHOLDS = [0, 100, 1000];

export const getLevelFromXp = (xp: number): number =>
  Math.max(1, LEVEL_XP_THRESHOLDS.filter((threshold) => xp >= threshold).length);
