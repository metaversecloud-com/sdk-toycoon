import { Request, Response } from "express";
import { getCraftedToyItem, getToyRecipeById, LEVEL_UP_TOKEN_REWARDS, ToyTypeId } from "@shared/constants/index.js";
import { getLevelFromXp } from "@shared/levels.js";
import {
  DroppedAsset,
  errorHandler,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  modifyVisitorInventoryItem,
  requireBoothInWorld,
  updateLeaderboardEntry,
} from "@utils/index.js";
import { CURRENCY_ITEM_NAME, XP_ITEM_NAME } from "../constants.js";

/**
 * Sells crafted toys ({ recipeId, quantity = 1 }) at a fixed price each in Toy Tokens + XP (item metadata
 * rewardTokens / rewardXP, falling back to the recipe). quantity can be anything from 1 up to how many the player has. Crossing an XP threshold levels the player up: each level gained pays its Toy Token
 * bonus and updates their booth's level, which unlocks that level's materials and toys everywhere.
 * Steps run in order (take toy → pay tokens → pay XP); if one fails, the earlier ones are undone.
 */
export const handleSellToy = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    const recipe = getToyRecipeById(req.body?.recipeId as ToyTypeId);
    if (!recipe) throw "Valid recipeId is required";

    const [{ ecosystemToys }, { visitor, visitorData, visitorInventory }] = await Promise.all([
      getInventoryItems(credentials),
      initializeVisitorData(credentials),
    ]);
    const booth = await requireBoothInWorld(credentials, visitorData, "selling toys");

    const toy = getCraftedToyItem(recipe, Object.values(ecosystemToys));
    if (!toy) throw `The ${recipe.displayName} toy item isn't set up in the ecosystem.`;
    const owned = visitorInventory.toys[toy.id]?.quantity ?? 0;
    if (owned < 1) throw `You don't have a ${recipe.displayName} to sell.`;

    const quantity = req.body?.quantity === undefined ? 1 : Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw "Quantity must be a whole number of at least 1.";
    if (quantity > owned) throw `You only have ${owned} ${recipe.displayName}${owned === 1 ? "" : "s"} to sell.`;

    const tokensEarned = (toy.reward || recipe.sellTokens) * quantity;
    const xpEarned = (toy.xpReward || recipe.sellXp) * quantity;

    // Claim this sale under a lock versioned by the sale count and never released: a double-click (or two tabs)
    // reads the same count, so the same toy can't be sold twice.
    const soldBefore = visitorData.totalToysSold || 0;
    try {
      await visitor.updateDataObject(
        { totalToysSold: soldBefore + quantity },
        { lock: { lockId: `sell_${profileId}_${soldBefore}`, releaseLock: false } },
      );
    } catch {
      return res.status(409).json({ success: false, message: "Already selling — try again in a moment." });
    }

    // Each completed step records how to undo it, so a failure partway leaves the player exactly where they started
    const undo: (() => Promise<unknown>)[] = [
      () => visitor.updateDataObject({ totalToysSold: soldBefore }, {}),
    ];
    let toyItem, tokensItem, xpItem;
    try {
      toyItem = await modifyVisitorInventoryItem({ credentials, visitor, id: toy.id, quantity: -quantity });
      undo.push(() => modifyVisitorInventoryItem({ credentials, visitor, id: toy.id, quantity }));

      tokensItem = await modifyVisitorInventoryItem({ credentials, visitor, name: CURRENCY_ITEM_NAME, quantity: tokensEarned });
      undo.push(() => modifyVisitorInventoryItem({ credentials, visitor, name: CURRENCY_ITEM_NAME, quantity: -tokensEarned }));

      xpItem = await modifyVisitorInventoryItem({ credentials, visitor, name: XP_ITEM_NAME, quantity: xpEarned });
    } catch (sellError) {
      for (const step of undo.reverse()) {
        await step().catch((error) =>
          errorHandler({ error, functionName: "handleSellToy", message: "Error undoing part of a failed sale" }),
        );
      }
      throw sellError;
    }

    // Level-ups: pay each new level's Toy Token bonus. The sale already succeeded, so these are best-effort.
    const levelBefore = visitorInventory.level;
    const xp = xpItem.quantity;
    const level = getLevelFromXp(xp);
    const levelsGained = Array.from({ length: Math.max(0, level - levelBefore) }, (_, i) => levelBefore + i + 1);
    let levelUpTokens = 0;
    let tokens = tokensItem.quantity;
    for (const newLevel of levelsGained) {
      const bonus = LEVEL_UP_TOKEN_REWARDS[newLevel] ?? 0;
      if (!bonus) continue;
      try {
        tokens = (await modifyVisitorInventoryItem({ credentials, visitor, name: CURRENCY_ITEM_NAME, quantity: bonus }))
          .quantity;
        levelUpTokens += bonus;
      } catch (error) {
        errorHandler({ error, functionName: "handleSellToy", message: `Error paying level ${newLevel} bonus` });
      }
    }

    const totalCoinsEarned = (visitorData.totalCoinsEarned || 0) + tokensEarned + levelUpTokens;
    const analytics = [{ analyticName: "toycoon_toy_sold", profileId, urlSlug, uniqueKey: profileId }];
    if (levelsGained.length) analytics.push({ analyticName: "toycoon_level_up", profileId, urlSlug, uniqueKey: profileId });
    await visitor
      .updateDataObject({ totalCoinsEarned }, { analytics })
      .catch((error: any) => errorHandler({ error, functionName: "handleSellToy", message: "Error saving lifetime earnings" }));

    if (levelsGained.length) {
      // The booth shows its owner's level to visitors
      DroppedAsset.create(booth.keyAssetId, urlSlug, { credentials: { ...credentials, assetId: booth.keyAssetId } })
        .updateDataObject({ level }, {})
        .catch((error: any) => errorHandler({ error, functionName: "handleSellToy", message: "Error updating booth level" }));
      visitor
        .fireToast({
          groupId: "toycoon-level-up",
          title: `Level ${level}!`,
          text: levelUpTokens ? `You earned ${levelUpTokens} bonus Toy Tokens and unlocked new toys.` : "You unlocked new toys.",
        })
        .catch((error: any) => errorHandler({ error, functionName: "handleSellToy", message: "Error firing level-up toast" }));
    }

    updateLeaderboardEntry({
      credentials,
      stats: { totalXp: xp, level, totalToysCrafted: visitorData.totalToysCrafted || 0 },
    }).catch((error) => errorHandler({ error, functionName: "handleSellToy", message: "Error updating leaderboard" }));

    return res.json({
      success: true,
      toy: toyItem,
      quantity,
      tokensEarned,
      xpEarned,
      levelUpTokens,
      levelsGained,
      tokens,
      xp,
      level,
      totalCoinsEarned,
      totalToysSold: soldBefore + quantity,
    });
  } catch (error) {
    return errorHandler({ error, functionName: "handleSellToy", message: "Error selling toy", req, res });
  }
};
