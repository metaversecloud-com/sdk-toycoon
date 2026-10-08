import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  modifyVisitorInventoryItem,
} from "@utils/index.js";
import { MATERIAL_BIN_CAP } from "@shared/constants/index.js";
import { getAvailableMaterial } from "@shared/utils/getAvailableMaterial.js";

/**
 * Collects everything currently waiting in a material's bin. Bins refill passively: one unit every
 * spawnIntervalSeconds since materialCollectedAt[material], up to MATERIAL_BIN_CAP. The server is the only source of
 * truth for the timer — the client just mirrors it for display.
 */
export const handleCollectMaterial = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId } = credentials;
    const { materialId } = req.body;
    if (!materialId) throw "Valid materialId is required";

    const { ecosystemMaterials } = await getInventoryItems(credentials);
    const material = ecosystemMaterials[materialId];
    if (!material) throw "Invalid material";

    const { visitor, visitorData, visitorInventory } = await initializeVisitorData(credentials);
    if (visitorInventory.level < material.unlockLevel) throw "Material not unlocked yet.";

    const now = Date.now();
    const last = visitorData.materialCollectedAt[material.name];
    const available = getAvailableMaterial(last, material.spawnIntervalSeconds, MATERIAL_BIN_CAP, now);
    if (available < 1) throw "Nothing to collect yet.";

    // Keep partial progress toward the next unit unless the bin was full (then the timer restarts)
    const intervalMs = material.spawnIntervalSeconds * 1000;
    const newTimestamp = last === undefined || available >= MATERIAL_BIN_CAP ? now : last + available * intervalMs;

    // Save the timestamp before granting, under a lock versioned by the previous timestamp and never released:
    // a double-click (or two tabs) reads the same `last`, so the second request can't acquire the lock and can't
    // collect the same units twice. Dot-path so other materials' timers are untouched.
    try {
      await visitor.updateDataObject(
        { [`materialCollectedAt.${material.name}`]: newTimestamp },
        { lock: { lockId: `collect_${profileId}_${material.name}_${last ?? "never"}`, releaseLock: false } },
      );
    } catch {
      return res.status(409).json({ success: false, message: "Already collecting — try again in a moment." });
    }

    let item;
    try {
      item = await modifyVisitorInventoryItem({ credentials, visitor, id: materialId, quantity: available });
    } catch (grantError) {
      // Put the timer back so the units aren't lost. 0 behaves like "never collected" (bin full).
      await visitor
        .updateDataObject({ [`materialCollectedAt.${material.name}`]: last ?? 0 }, {})
        .catch((error: any) =>
          errorHandler({ error, functionName: "handleCollectMaterial", message: "Error restoring material timer" }),
        );
      throw grantError;
    }

    return res.json({ success: true, collected: available, collectedAt: newTimestamp, item });
  } catch (error) {
    return errorHandler({ error, functionName: "handleCollectMaterial", message: "Error collecting material", req, res });
  }
};
