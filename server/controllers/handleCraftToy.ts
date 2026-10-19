import { Request, Response } from "express";
import {
  countOwnedToys,
  describeMissingMaterials,
  getCraftedToyItem,
  getMaterialCountsByName,
  getMissingMaterials,
  getToyRecipeById,
  toCanonicalMaterialName,
  ToyTypeId,
} from "@shared/constants/index.js";
import {
  errorHandler,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  modifyVisitorInventoryItem,
  requireBoothInWorld,
  updateLeaderboardEntry,
} from "@utils/index.js";
import { VisitorInventoryItemType } from "../types/index.js";

/**
 * Crafts one toy from a recipe ({ recipeId: "rocking_horse" | "teddy_bear" | "train" }). Each recipe produces exactly one
 * item — Rocking Horse, Brown Teddy Bear, Black Train; other colors are decoration-only and can't be crafted.
 * Checks: owns a booth here, recipe unlocked at the visitor's level, has the materials, under the toy type's cap.
 * Materials are taken first, then the toy is granted; if anything fails, whatever was taken is given back.
 */
export const handleCraftToy = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;
    const recipe = getToyRecipeById(req.body?.recipeId as ToyTypeId);
    if (!recipe) throw "Valid recipeId is required";

    const [{ ecosystemMaterials, ecosystemToys }, { visitor, visitorData, visitorInventory }] = await Promise.all([
      getInventoryItems(credentials),
      initializeVisitorData(credentials),
    ]);
    await requireBoothInWorld(credentials, visitorData, "crafting toys");

    const toy = getCraftedToyItem(recipe, Object.values(ecosystemToys));
    if (!toy) throw `The ${recipe.displayName} toy item isn't set up in the ecosystem.`;
    const toyItemId = toy.id;

    if (visitorInventory.level < recipe.unlockLevel) {
      throw `${recipe.displayName} unlocks at level ${recipe.unlockLevel}.`;
    }

    const missing = getMissingMaterials(recipe, getMaterialCountsByName(visitorInventory.materials));
    if (Object.keys(missing).length > 0) {
      throw `You need ${describeMissingMaterials(missing)} to craft a ${recipe.displayName}.`;
    }

    const toyCount = countOwnedToys(recipe, visitorInventory.toys);
    if (toyCount >= recipe.cap) {
      throw `Your ${recipe.displayName} shelf is full (${toyCount}/${recipe.cap}). Sell some first.`;
    }

    // Resolve every material's ecosystem item up front so a misconfigured ecosystem fails before anything is taken
    const materialsToTake = Object.entries(recipe.materials).map(([name, quantity]) => {
      const material = Object.values(ecosystemMaterials).find((item) => toCanonicalMaterialName(item.name) === name);
      if (!material) throw `Material "${name}" isn't set up in the ecosystem.`;
      return { id: material.id, quantity };
    });

    // Claim this craft under a lock versioned by the craft count and never released: a double-click (or two tabs)
    // reads the same count, so the second request can't craft from the same materials.
    const craftedBefore = visitorData.totalToysCrafted || 0;
    try {
      await visitor.updateDataObject(
        { totalToysCrafted: craftedBefore + 1 },
        { lock: { lockId: `craft_${profileId}_${craftedBefore}`, releaseLock: false } },
      );
    } catch {
      return res.status(409).json({ success: false, message: "Already crafting — try again in a moment." });
    }

    const taken: { id: string; quantity: number }[] = [];
    const materials: { [itemId: string]: VisitorInventoryItemType } = {};
    let toyItem: VisitorInventoryItemType;
    try {
      for (const { id, quantity } of materialsToTake) {
        materials[id] = await modifyVisitorInventoryItem({ credentials, visitor, id, quantity: -quantity });
        taken.push({ id, quantity });
      }
      toyItem = await modifyVisitorInventoryItem({ credentials, visitor, id: toyItemId, quantity: 1 });
    } catch (craftError) {
      // Give back what was taken and undo the craft count, so a failed craft costs nothing
      for (const { id, quantity } of taken) {
        await modifyVisitorInventoryItem({ credentials, visitor, id, quantity }).catch((error) =>
          errorHandler({ error, functionName: "handleCraftToy", message: `Error refunding material ${id}` }),
        );
      }
      await visitor
        .updateDataObject({ totalToysCrafted: craftedBefore }, {})
        .catch((error: any) => errorHandler({ error, functionName: "handleCraftToy", message: "Error restoring craft count" }));
      throw craftError;
    }

    const totalToysCrafted = craftedBefore + 1;

    // Analytics and leaderboard are best-effort — the craft already succeeded
    const analytics = [{ analyticName: "toycoon_toy_crafted", profileId, urlSlug, uniqueKey: profileId }];
    if (recipe.id === "teddy_bear") {
      analytics.push({ analyticName: "toycoon_bear_crafted", profileId, urlSlug, uniqueKey: profileId });
    }
    visitor
      .updateDataObject({}, { analytics })
      .catch((error: any) => errorHandler({ error, functionName: "handleCraftToy", message: "Error tracking analytics" }));
    updateLeaderboardEntry({
      credentials,
      stats: { totalXp: visitorInventory.xp, level: visitorInventory.level, totalToysCrafted },
    }).catch((error) => errorHandler({ error, functionName: "handleCraftToy", message: "Error updating leaderboard" }));

    return res.json({ success: true, toy: toyItem, materials, totalToysCrafted });
  } catch (error) {
    return errorHandler({ error, functionName: "handleCraftToy", message: "Error crafting toy", req, res });
  }
};
