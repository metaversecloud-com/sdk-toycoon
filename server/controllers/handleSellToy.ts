import { Request, Response } from "express";
import { getCraftedToyItem, getToyRecipeById, ToyTypeId } from "@shared/constants/index.js";
import {
  awardXp,
  AwardXpResultType,
  claimActionLock,
  errorHandler,
  getBoothIndex,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  modifyVisitorInventoryItem,
  requireBoothInWorld,
} from "@utils/index.js";
import { CURRENCY_ITEM_NAME } from "../constants.js";

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

    const [{ ecosystemToys }, { visitor, visitorData, visitorInventory }, { booths }] = await Promise.all([
      getInventoryItems(credentials),
      initializeVisitorData(credentials),
      getBoothIndex(credentials),
    ]);
    const booth = await requireBoothInWorld(credentials, visitorData, "selling toys", booths);

    const toy = getCraftedToyItem(recipe, Object.values(ecosystemToys));
    if (!toy) throw `The ${recipe.displayName} toy item isn't set up in the ecosystem.`;
    const owned = visitorInventory.toys[toy.id]?.quantity ?? 0;
    if (owned < 1) throw `You don't have a ${recipe.displayName} to sell.`;

    const quantity = req.body?.quantity === undefined ? 1 : Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw "Quantity must be a whole number of at least 1.";
    if (quantity > owned) throw `You only have ${owned} ${recipe.displayName}${owned === 1 ? "" : "s"} to sell.`;

    const tokensEarned = (toy.reward || recipe.sellTokens) * quantity;
    const xpEarned = (toy.xpReward || recipe.sellXp) * quantity;

    // One sale at a time: a double-click (or two tabs) can't sell the same toys twice
    if (!(await claimActionLock({ action: "sell", profileId, visitor, visitorData }))) {
      return res.status(409).json({ success: false, message: "Already selling — try again in a moment." });
    }

    // Each completed step records how to undo it, so a failure partway leaves the player exactly where they started
    const undo: (() => Promise<unknown>)[] = [];
    let toyItem, tokensItem, xpResult: AwardXpResultType;
    try {
      toyItem = await modifyVisitorInventoryItem({ credentials, visitor, id: toy.id, quantity: -quantity });
      undo.push(() => modifyVisitorInventoryItem({ credentials, visitor, id: toy.id, quantity }));

      tokensItem = await modifyVisitorInventoryItem({ credentials, visitor, name: CURRENCY_ITEM_NAME, quantity: tokensEarned });
      undo.push(() => modifyVisitorInventoryItem({ credentials, visitor, name: CURRENCY_ITEM_NAME, quantity: -tokensEarned }));

      // Also pays any level-up bonus, updates the booth's level, and refreshes the leaderboard
      xpResult = await awardXp({
        amount: xpEarned,
        boothKeyAssetId: booth.keyAssetId,
        credentials,
        saveLevelUpStats: false,
        visitor,
        visitorData,
      });
    } catch (sellError) {
      for (const step of undo.reverse()) {
        await step().catch((error) =>
          errorHandler({ error, functionName: "handleSellToy", message: "Error undoing part of a failed sale" }),
        );
      }
      throw sellError;
    }

    const { levelsGained, levelUpTokens, xp, level } = xpResult;
    const tokens = xpResult.tokens ?? tokensItem.quantity;

    const totalCoinsEarned = (visitorData.totalCoinsEarned || 0) + tokensEarned + levelUpTokens;
    const totalToysSold = (visitorData.totalToysSold || 0) + quantity;
    const analytics = [{ analyticName: "toycoon_toy_sold", profileId, urlSlug, uniqueKey: profileId }];
    if (levelsGained.length) analytics.push({ analyticName: "toycoon_level_up", profileId, urlSlug, uniqueKey: profileId });
    await visitor
      .updateDataObject({ totalCoinsEarned, totalToysSold }, { analytics })
      .catch((error: any) => errorHandler({ error, functionName: "handleSellToy", message: "Error saving lifetime earnings" }));

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
      totalToysSold,
    });
  } catch (error) {
    return errorHandler({ error, functionName: "handleSellToy", message: "Error selling toy", req, res });
  }
};
