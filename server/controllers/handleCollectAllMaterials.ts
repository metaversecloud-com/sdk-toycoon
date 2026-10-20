import { Request, Response } from "express";
import { getMaterialCap } from "@shared/constants/index.js";
import { getMaterialBinState } from "@shared/utils/getMaterialBinState.js";
import {
  collectFromBin,
  errorHandler,
  getBoothIndex,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  requireBoothInWorld,
} from "@utils/index.js";
import { VisitorInventoryItemType } from "../types/index.js";

/**
 * Collects one unit from every ready bin the visitor has unlocked and isn't capped on, in one request.
 * Same per-bin rules and protections as a single collect; bins that aren't ready, are full, or are mid-collect are
 * skipped rather than failing the whole request.
 */
export const handleCollectAllMaterials = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    const [{ ecosystemMaterials }, { visitor, visitorData, visitorInventory }, { booths }] = await Promise.all([
      getInventoryItems(credentials),
      initializeVisitorData(credentials),
      getBoothIndex(credentials),
    ]);
    await requireBoothInWorld(credentials, visitorData, "collecting materials", booths);

    const now = Date.now();
    const readyBins = Object.values(ecosystemMaterials).filter((material) => {
      const owned = visitorInventory.materials[material.id]?.quantity ?? 0;
      const generationStartedAt = visitorData.materialGenerationStartedAt?.[material.name];
      return (
        visitorInventory.level >= material.unlockLevel &&
        owned < getMaterialCap(material.name) &&
        getMaterialBinState(generationStartedAt, material.spawnIntervalSeconds, now).state === "ready"
      );
    });

    if (readyBins.length === 0) throw "Nothing is ready to collect yet.";

    // One at a time: each collect writes the same visitor record
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

    return res.json({ success: true, collected });
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
