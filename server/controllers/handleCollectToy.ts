import { Request, Response } from "express";
import { getCraftedToyItem, getToyRecipeById, ToyTypeId } from "@shared/constants/index.js";
import { getMaterialBinState } from "@shared/utils/getMaterialBinState.js";
import {
  claimActionLock,
  errorHandler,
  getBoothIndex,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  modifyVisitorInventoryItem,
  requireBoothInWorld,
  updateLeaderboardEntry,
} from "@utils/index.js";

/**
 * Step 2 of 2: collects a finished toy ({ recipeId }) once its craft timer is done (server-validated), puts it on the
 * player's shelf, and counts the craft. If granting the toy fails, the craft stays ready so nothing is lost.
 */
export const handleCollectToy = async (req: Request, res: Response) => {
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
    await requireBoothInWorld(credentials, visitorData, "crafting toys", booths);

    const toy = getCraftedToyItem(recipe, Object.values(ecosystemToys));
    if (!toy) throw `The ${recipe.displayName} toy item isn't set up in the ecosystem.`;

    const craftStartedAt = visitorData.toyCraftStartedAt?.[recipe.id] ?? null;
    const { state } = getMaterialBinState(craftStartedAt, recipe.craftSeconds);
    if (state === "idle") throw `You aren't crafting a ${recipe.displayName}.`;
    if (state === "generating") throw `Your ${recipe.displayName} isn't finished yet.`;

    // Clear the timer and count the craft under a one-shot lock, so a double-click can't collect the toy twice
    const timerPath = `toyCraftStartedAt.${recipe.id}`;
    const totalToysCrafted = (visitorData.totalToysCrafted || 0) + 1;
    const claimed = await claimActionLock({
      action: `collect_toy_${recipe.id}`,
      alsoWrite: { [timerPath]: null, totalToysCrafted },
      profileId,
      visitor,
      visitorData,
    });
    if (!claimed) return res.status(409).json({ success: false, message: "Already collecting — try again in a moment." });

    let toyItem;
    try {
      toyItem = await modifyVisitorInventoryItem({ credentials, visitor, id: toy.id, quantity: 1 });
    } catch (grantError) {
      // Put the craft back to ready and undo the count, so the toy isn't lost
      await visitor
        .updateDataObject({ [timerPath]: craftStartedAt, totalToysCrafted: totalToysCrafted - 1 }, {})
        .catch((error: any) => errorHandler({ error, functionName: "handleCollectToy", message: "Error restoring craft" }));
      throw grantError;
    }

    // Analytics and leaderboard are best-effort — the toy is already on the shelf
    const analytics = [{ analyticName: "toycoon_toy_crafted", profileId, urlSlug, uniqueKey: profileId }];
    if (recipe.id === "teddy_bear") {
      analytics.push({ analyticName: "toycoon_bear_crafted", profileId, urlSlug, uniqueKey: profileId });
    }
    visitor
      .updateDataObject({}, { analytics })
      .catch((error: any) => errorHandler({ error, functionName: "handleCollectToy", message: "Error tracking analytics" }));
    updateLeaderboardEntry({
      credentials,
      stats: { totalXp: visitorInventory.xp, level: visitorInventory.level, totalToysCrafted },
    }).catch((error) => errorHandler({ error, functionName: "handleCollectToy", message: "Error updating leaderboard" }));

    return res.json({ success: true, recipeId: recipe.id, toy: toyItem, totalToysCrafted });
  } catch (error) {
    return errorHandler({ error, functionName: "handleCollectToy", message: "Error collecting toy", req, res });
  }
};
