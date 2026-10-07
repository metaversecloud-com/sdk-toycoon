import { LEVEL_XP_THRESHOLDS } from "../constants.js";

export const getLevel = (xp: number) => {
  let level = 1;
  LEVEL_XP_THRESHOLDS.forEach((threshold, i) => {
    if (xp >= threshold) level = i + 1;
  });
  return level;
};