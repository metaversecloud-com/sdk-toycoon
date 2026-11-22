import { Request, Response } from "express";
import { getActiveBooster, getMaterialCap, getTimerSeconds } from "@shared/constants/index.js"; // AUTO-COLLECTOR: getActiveBooster added
import { getMaterialBinState } from "@shared/utils/getMaterialBinState.js";
import {
  awardBonusXp,
  collectFromBin,
  errorHandler,
  getBoothIndex,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  requireBoothInWorld,
  saveBadgeProgress,
  trackAnalytics,
} from "@utils/index.js";
import { VisitorInventoryItemType } from "../types/index.js";

/**
 * Collects one unit from every ready bin the visitor has unlocked and isn't capped on, in one request.
 * Same per-bin rules and protections as a single collect; bins that aren't ready, are full, or are mid-collect are
 * skipped rather than failing the whole request. Earns the same XP per unit as collecting one at a time.
 * Not available while an Auto-Collector is running (it collects every station itself).
 */
export const handleCollectAllMaterials = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    // ----- 1. Load everything at the same time -----
    const [{ ecosystemMaterials }, { visitor, visitorData, visitorInventory }, { booths, worldData }] = await Promise.all([
      getInventoryItems(credentials),
      initializeVisitorData(credentials),
      getBoothIndex(credentials),
    ]);
    const booth = await requireBoothInWorld(credentials, visitorData, "collecting materials", booths);

    // AUTO-COLLECTOR: manual Collect All is off while it runs, since it collects every station itself
    if (getActiveBooster(visitorData.activeBoosters, "auto_collect")) {
      throw "Your Auto-Collector is handling your stations right now.";
    }

    // ----- 2. Find the bins that are ready, unlocked and under their cap -----
    const now = Date.now();
    const readyBins = Object.values(ecosystemMaterials).filter((material) => {
      const owned = visitorInventory.materials[material.id]?.quantity ?? 0;
      const generationStartedAt = visitorData.materialGenerationStartedAt?.[material.name];
      return (
        visitorInventory.level >= material.unlockLevel &&
        owned < getMaterialCap(material.name) &&
        getMaterialBinState(generationStartedAt, getTimerSeconds(material.spawnIntervalSeconds, worldData?.timerSpeed), now)
          .state === "ready"
      );
    });

    if (readyBins.length === 0) throw "Nothing is ready to collect yet.";

    // ----- 3. Collect one unit from each, one at a time: each collect writes the same visitor record -----
    const collected: { [materialId: string]: VisitorInventoryItemType } = {};
    for (const material of readyBins) {
      try {
        const result = await collectFromBin({
          credentials,
          generationStartedAt: visitorData.materialGenerationStartedAt[material.name]!,
          material,
          visitor,
          visitorData,
        });
        if (result.status === "collected") collected[material.id] = result.item;
      } catch (error) {
        errorHandler({ error, functionName: "handleCollectAllMaterials", message: `Error collecting ${material.name}` });
      }
    }

    if (Object.keys(collected).length === 0) throw "Couldn't collect anything — try again in a moment.";

    // ----- 4. One XP grant for the whole batch (each material pays its own XP) -----
    const xpEarned = readyBins.reduce((total, { id, xpReward }) => total + (collected[id] ? xpReward : 0), 0);
    const xpResult =
      xpEarned > 0
        ? await awardBonusXp({ amount: xpEarned, boothKeyAssetId: booth.keyAssetId, credentials, visitor, visitorData })
        : null;

    // ----- 5. Analytics and badge progress (best effort) -----
    trackAnalytics({
      credentials,
      events: [{ name: "materialCollects", incrementBy: Object.keys(collected).length }, { name: "collectAllUses" }],
      visitor,
    });
    saveBadgeProgress({
      credentials,
      level: xpResult?.level ?? visitorInventory.level,
      update: { materialsCollected: (visitorData.materialsCollected || 0) + Object.keys(collected).length },
      visitor,
      visitorData,
    });

    return res.json({ success: true, collected, xpResult });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCollectAllMaterials",
      message: "Error collecting materials",
      req,
      res,
    });
  }
};