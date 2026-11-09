import { Request, Response } from "express";
import {
  awardBonusXp,
  collectFromBin,
  errorHandler,
  getCredentials,
  getMaterialBin,
  saveBadgeProgress,
} from "@utils/index.js";

/**
 * Step 2 of 2: collects one unit from a ready bin (server-validated timer) and resets the bin to idle.
 * Blocked once the visitor is at the material's inventory cap. Each unit collected earns the material's XP (none if it's set to 0).
 */
export const handleCollectMaterial = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { booth, generationStartedAt, material, state, visitor, visitorData, visitorInventory } = await getMaterialBin(
      credentials,
      req.body?.materialId,
    );

    if (state === "idle") throw `Start ${material.displayName} first.`;
    if (state === "generating") throw `${material.displayName} isn't ready yet.`;

    // The XP is granted at the same time as the material (not after), so the collect costs one less round trip
    const result = await collectFromBin({
      alongsideGrant:
        material.xpReward > 0
          ? () =>
              awardBonusXp({ amount: material.xpReward, boothKeyAssetId: booth.keyAssetId, credentials, visitor, visitorData })
          : undefined,
      credentials,
      generationStartedAt: generationStartedAt!,
      material,
      visitor,
      visitorData,
    });
    if (result.status === "locked") {
      return res.status(409).json({ success: false, message: "Already collecting — try again in a moment." });
    }

    // Counts toward Stocked Up / Supply Run (after the reply, so the collect doesn't wait on it)
    saveBadgeProgress({
      credentials,
      level: result.alongside?.level ?? visitorInventory.level,
      update: { materialsCollected: (visitorData.materialsCollected || 0) + 1 },
      visitor,
      visitorData,
    });

    return res.json({ success: true, materialName: material.name, item: result.item, xpResult: result.alongside ?? null });
  } catch (error) {
    return errorHandler({ error, functionName: "handleCollectMaterial", message: "Error collecting material", req, res });
  }
};
