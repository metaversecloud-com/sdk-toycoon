import { Request, Response } from "express";
import {
  getCraftedToyItem,
  getCraftXp,
  getTimerSeconds,
  getToyRecipeById,
  RECENT_CRAFT_TIMES_KEPT,
  ToyTypeId,
} from "@shared/constants/index.js";
import { getMaterialBinState } from "@shared/utils/getMaterialBinState.js";
import {
  awardBonusXp,
  claimActionLock,
  errorHandler,
  getBoothIndex,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  modifyVisitorInventoryItem,
  requireBoothInWorld,
  saveBadgeProgress,
} from "@utils/index.js";

/**
 * Step 2 of 2: collects a finished toy ({ recipeId }) once its craft timer is done (server-validated), puts it on the
 * player's shelf, counts the craft, and earns the craft XP (based on the recipe's craft time, see getCraftXp).
 * If granting the toy fails, the craft stays ready so nothing is lost.
 */
export const handleCollectToy = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    // ----- 1. Check the request -----
    const recipe = getToyRecipeById(req.body?.recipeId as ToyTypeId);
    if (!recipe) throw "Valid recipeId is required";

    const [{ ecosystemToys }, { visitor, visitorData, visitorInventory }, { booths, worldData }] = await Promise.all([
      getInventoryItems(credentials),
      initializeVisitorData(credentials),
      getBoothIndex(credentials),
    ]);
    const booth = await requireBoothInWorld(credentials, visitorData, "crafting toys", booths);

    const toy = getCraftedToyItem(recipe, Object.values(ecosystemToys));
    if (!toy) throw `The ${recipe.displayName} toy item isn't set up in the ecosystem.`;

    // ----- 2. Make sure the craft is actually finished (the server decides, not the client) -----
    const craftStartedAt = visitorData.toyCraftStartedAt?.[recipe.id] ?? null;
    const { state } = getMaterialBinState(craftStartedAt, getTimerSeconds(recipe.craftSeconds, worldData?.timerSpeed));
    if (state === "idle") throw `You aren't crafting a ${recipe.displayName}.`;
    if (state === "generating") throw `Your ${recipe.displayName} isn't finished yet.`;

    // ----- 3. Clear the timer and count the craft under a one-shot lock, so a double-click can't collect twice -----
    const timerPath = `toyCraftStartedAt.${recipe.id}`;
    const totalToysCrafted = (visitorData.totalToysCrafted || 0) + 1;
    // Badge progress (per-toy counts, and when the last few toys were made) is counted with the craft itself
    const typePath = `toysCraftedByType.${recipe.id}`;
    const previousTypeCount = visitorData.toysCraftedByType?.[recipe.id] || 0;
    const previousCraftTimes = visitorData.recentCraftTimes || [];
    const recentCraftTimes = [...previousCraftTimes, Date.now()].slice(-RECENT_CRAFT_TIMES_KEPT);
    const claimed = await claimActionLock({
      action: `collect_toy_${recipe.id}`,
      alsoWrite: { [timerPath]: null, totalToysCrafted, [typePath]: previousTypeCount + 1, recentCraftTimes },
      profileId,
      visitor,
      visitorData,
    });
    if (!claimed) return res.status(409).json({ success: false, message: "Already collecting — try again in a moment." });

    // ----- 4. Give the toy and the craft XP at the same time (one round trip). awardBonusXp never throws. -----
    let toyItem, xpResult;
    try {
      [toyItem, xpResult] = await Promise.all([
        modifyVisitorInventoryItem({ credentials, visitor, id: toy.id, quantity: 1 }),
        awardBonusXp({
          amount: getCraftXp(recipe), // time-based XP from shared/constants/economy.ts
          boothKeyAssetId: booth.keyAssetId,
          credentials,
          totalToysCrafted,
          visitor,
          visitorData,
        }),
      ]);
    } catch (grantError) {
      // Put the craft back to ready and undo the count, so the toy isn't lost
      await visitor
        .updateDataObject(
          {
            [timerPath]: craftStartedAt,
            totalToysCrafted: totalToysCrafted - 1,
            [typePath]: previousTypeCount,
            recentCraftTimes: previousCraftTimes,
          },
          {},
        )
        .catch((error: any) => errorHandler({ error, functionName: "handleCollectToy", message: "Error restoring craft" }));
      throw grantError;
    }

    // Analytics are best-effort — the toy is already on the shelf
    const analytics = [
      { analyticName: "toycoon_toy_crafted", profileId, urlSlug, uniqueKey: profileId },
      { analyticName: `toysCrafted-${recipe.id}`, profileId, urlSlug, uniqueKey: profileId },
    ];
    if (recipe.id === "teddy_bear") {
      analytics.push({ analyticName: "toycoon_bear_crafted", profileId, urlSlug, uniqueKey: profileId });
    }
    visitor
      .updateDataObject({}, { analytics })
      .catch((error: any) => errorHandler({ error, functionName: "handleCollectToy", message: "Error tracking analytics" }));

    saveBadgeProgress({
      credentials,
      level: xpResult?.level ?? visitorInventory.level,
      update: {},
      visitor,
      visitorData: {
        ...visitorData,
        totalToysCrafted,
        toysCraftedByType: { ...visitorData.toysCraftedByType, [recipe.id]: previousTypeCount + 1 },
        recentCraftTimes,
      },
    });

    return res.json({ success: true, recipeId: recipe.id, toy: toyItem, totalToysCrafted, xpResult });
  } catch (error) {
    return errorHandler({ error, functionName: "handleCollectToy", message: "Error collecting toy", req, res });
  }
};