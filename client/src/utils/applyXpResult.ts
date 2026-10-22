import { Dispatch } from "react";
import { ActionType } from "@/context/types";
import { patchGame } from "./patchGame";

export type XpResultType = {
  xp: number;
  xpEarned: number;
  level: number;
  levelsGained: number[];
  levelUpTokens: number;
  tokens: number | null;
} | null;

/**
 * Applies the XP (and any level-up bonus Toy Tokens) the server granted for collecting or crafting. null means the
 * XP grant failed server-side; the action itself still succeeded, so nothing changes here.
 */
export const applyXpResult = (dispatch: Dispatch<ActionType> | null, xpResult: XpResultType | undefined) => {
  if (!xpResult) return;
  const { level, tokens, xp } = xpResult;
  patchGame(dispatch, { inventory: { xp, level, ...(tokens !== null ? { coins: tokens } : {}) } });
};
