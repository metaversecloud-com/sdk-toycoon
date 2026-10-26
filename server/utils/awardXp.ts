import { VisitorInterface } from "@rtsdk/topia";
import { LEVEL_UP_TOKEN_REWARDS } from "@shared/constants/index.js";
import { getLevelFromXp } from "@shared/levels.js";
import { Credentials, VisitorDataObjectType } from "../types/index.js";
import { CURRENCY_ITEM_NAME, XP_ITEM_NAME } from "../constants.js";
import { errorHandler } from "./errorHandler.js";
import { modifyVisitorInventoryItem } from "./inventory/modifyVisitorInventoryItem.js";
import { updateLeaderboardEntry } from "./leaderboard/updateLeaderboardEntry.js";
import { standardizeError } from "./standardizeError.js";
import { DroppedAsset } from "./topiaInit.js";

export type AwardXpResultType = {
  xp: number; // new XP total
  xpEarned: number;
  level: number;
  levelsGained: number[];
  levelUpTokens: number; // level-up bonus Toy Tokens paid
  tokens: number | null; // new Toy Token balance if a bonus was paid, otherwise null (unchanged)
};

/**
 * Grants XP (collecting materials, finishing a toy, selling) and handles any level-up it causes: each level gained pays
 * its Toy Token bonus, the owner's booth shows the new level, and a toast celebrates it. Also refreshes the leaderboard.
 * The level before is worked out from the XP total *after* the grant, so two grants landing at once can't both pay the
 * same level's bonus. Everything after the XP grant is best-effort.
 * Pass saveLevelUpStats: false when the caller writes totalCoinsEarned and the level-up analytic itself (selling does).
 */
export const awardXp = async ({
  amount,
  boothKeyAssetId,
  credentials,
  saveLevelUpStats = true,
  totalToysCrafted,
  visitor,
  visitorData,
}: {
  amount: number;
  boothKeyAssetId?: string;
  credentials: Credentials;
  saveLevelUpStats?: boolean;
  totalToysCrafted?: number;
  visitor: VisitorInterface;
  visitorData: VisitorDataObjectType;
}): Promise<AwardXpResultType> => {
  try {
    const { profileId, urlSlug } = credentials;

    const xpItem = await modifyVisitorInventoryItem({ credentials, visitor, name: XP_ITEM_NAME, quantity: amount });
    const xp = xpItem.quantity;
    const level = getLevelFromXp(xp);
    const levelBefore = getLevelFromXp(xp - amount);
    const levelsGained = Array.from({ length: Math.max(0, level - levelBefore) }, (_, i) => levelBefore + i + 1);

    let levelUpTokens = 0;
    let tokens: number | null = null;
    for (const newLevel of levelsGained) {
      const bonus = LEVEL_UP_TOKEN_REWARDS[newLevel] ?? 0;
      if (!bonus) continue;
      try {
        tokens = (await modifyVisitorInventoryItem({ credentials, visitor, name: CURRENCY_ITEM_NAME, quantity: bonus }))
          .quantity;
        levelUpTokens += bonus;
      } catch (error) {
        errorHandler({ error, functionName: "awardXp", message: `Error paying level ${newLevel} bonus` });
      }
    }

    if (levelsGained.length) {
      if (saveLevelUpStats) {
        await visitor
          .updateDataObject(
            { totalCoinsEarned: (visitorData.totalCoinsEarned || 0) + levelUpTokens },
            { analytics: [{ analyticName: "toycoon_level_up", profileId, urlSlug, uniqueKey: profileId }] },
          )
          .catch((error: any) => errorHandler({ error, functionName: "awardXp", message: "Error saving level-up stats" }));
      }

      // The booth shows its owner's level to visitors
      if (boothKeyAssetId) {
        DroppedAsset.create(boothKeyAssetId, urlSlug, { credentials: { ...credentials, assetId: boothKeyAssetId } })
          .updateDataObject({ level }, {})
          .catch((error: any) => errorHandler({ error, functionName: "awardXp", message: "Error updating booth level" }));
      }

      visitor
        .fireToast({
          groupId: "toycoon-level-up",
          title: `Level ${level}!`,
          text: levelUpTokens ? `You earned ${levelUpTokens} bonus Toy Tokens and unlocked new toys.` : "You unlocked new toys.",
        })
        .catch((error: any) => errorHandler({ error, functionName: "awardXp", message: "Error firing level-up toast" }));
    }

    updateLeaderboardEntry({
      credentials,
      stats: { totalXp: xp, level, totalToysCrafted: totalToysCrafted ?? (visitorData.totalToysCrafted || 0) },
    }).catch((error) => errorHandler({ error, functionName: "awardXp", message: "Error updating leaderboard" }));

    return { xp, xpEarned: amount, level, levelsGained, levelUpTokens, tokens };
  } catch (error) {
    throw standardizeError(error);
  }
};

/**
 * awardXp for rewards that come on top of something already done (a material or toy collected): a failed XP grant is
 * logged instead of failing the request, and the result is null.
 */
export const awardBonusXp = async (options: Parameters<typeof awardXp>[0]) =>
  awardXp(options).catch((error) => {
    errorHandler({ error, functionName: "awardBonusXp", message: `Error awarding ${options.amount} XP` });
    return null;
  });
