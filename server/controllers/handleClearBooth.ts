import { Request, Response } from "express";
import { clearBooth, errorHandler, getBoothData, getBoothIndex, getCredentials } from "@utils/index.js";

/**
 * Admin: releases a single booth (defaults to the booth whose drawer the admin has open)
 */
export const handleClearBooth = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const sceneDropId: string = req.body?.sceneDropId || credentials.sceneDropId;

    const { booths, world } = await getBoothIndex(credentials);
    const booth = sceneDropId ? booths[sceneDropId] : undefined;
    if (!booth) return res.status(404).json({ success: false, message: "Booth not found in this world." });

    const { boothAsset, boothData } = await getBoothData(credentials, booth.keyAssetId, sceneDropId);
    if (!boothData.ownerId) return res.json({ success: true, clearedSceneDropIds: [], failedSceneDropIds: [] });

    await clearBooth({ boothAsset, boothData, credentials, world });

    // A booth just opened up, so the "all booths taken" alert no longer applies
    await world.updateDataObject({ boothsFullAlert: null });

    return res.json({ success: true, clearedSceneDropIds: [sceneDropId], failedSceneDropIds: [] });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleClearBooth",
      message: "Error clearing booth",
      req,
      res,
    });
  }
};
