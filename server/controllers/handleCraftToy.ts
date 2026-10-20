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
} from "@utils/index.js";
import { VisitorInventoryItemType } from "../types/index.js";

/**
 * Step 1 of 2: starts crafting a toy ({ recipeId }). The recipe's materials are used up immediately (so they can't be
 * spent twice) and a server-side timer starts; after the recipe's craftSeconds the toy is ready to collect
 * (POST /collect-toy). One craft at a time per toy, and a toy being crafted counts toward its shelf cap.
 * Each recipe produces exactly one item — Rocking Horse, Brown Teddy Bear, Black Train; other colors are
 * decoration-only and can't be crafted.
 */
export const handleCraftToy = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId } = credentials;

    const recipe = getToyRecipeById(req.body?.recipeId as ToyTypeId);
    if (!recipe) throw "Valid recipeId is required";

    const [{ ecosystemMaterials, ecosystemToys }, { visitor, visitorData, visitorInventory }, { booths }] =
      await Promise.all([getInventoryItems(credentials), initializeVisitorData(credentials), getBoothIndex(credentials)]);
    await requireBoothInWorld(credentials, visitorData, "crafting toys", booths);

    const toy = getCraftedToyItem(recipe, Object.values(ecosystemToys));
    if (!toy) throw `The ${recipe.displayName} toy item isn't set up in the ecosystem.`;

    if (visitorInventory.level < recipe.unlockLevel) {
      throw `${recipe.displayName} unlocks at level ${recipe.unlockLevel}.`;
    }

    const { state } = getMaterialBinState(visitorData.toyCraftStartedAt?.[recipe.id], recipe.craftSeconds);
    if (state === "generating") throw `A ${recipe.displayName} is already being made.`;
    if (state === "ready") throw `Your ${recipe.displayName} is ready — collect it first.`;

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

    // Start the timer under a one-shot lock: a double-click (or two tabs) can't start this craft twice
    const timerPath = `toyCraftStartedAt.${recipe.id}`;
    const craftStartedAt = Date.now();
    const claimed = await claimActionLock({
      action: `craft_${recipe.id}`,
      alsoWrite: { [timerPath]: craftStartedAt },
      profileId,
      visitor,
      visitorData,
    });
    if (!claimed) return res.status(409).json({ success: false, message: "Already crafting — try again in a moment." });

    const taken: { id: string; quantity: number }[] = [];
    const materials: { [itemId: string]: VisitorInventoryItemType } = {};
    try {
      for (const { id, quantity } of materialsToTake) {
        materials[id] = await modifyVisitorInventoryItem({ credentials, visitor, id, quantity: -quantity });
        taken.push({ id, quantity });
      }
    } catch (craftError) {
      // Give back what was taken and clear the timer, so a failed start costs nothing
      for (const { id, quantity } of taken) {
        await modifyVisitorInventoryItem({ credentials, visitor, id, quantity }).catch((error) =>
          errorHandler({ error, functionName: "handleCraftToy", message: `Error refunding material ${id}` }),
        );
      }
      await visitor
        .updateDataObject({ [timerPath]: null }, {})
        .catch((error: any) => errorHandler({ error, functionName: "handleCraftToy", message: "Error clearing craft timer" }));
      throw craftError;
    }

    return res.json({
      success: true,
      recipeId: recipe.id,
      craftStartedAt,
      craftSeconds: recipe.craftSeconds,
      materials,
    });
  } catch (error) {
    return errorHandler({ error, functionName: "handleCraftToy", message: "Error crafting toy", req, res });
  }
};
