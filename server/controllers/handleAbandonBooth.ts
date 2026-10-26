import { Request, Response } from "express";
import {
  clearBooth,
  errorHandler,
  getBoothData,
  getBoothIndex,
  getCredentials,
  getOwnedBoothSceneDropId,
  getVisitor,
} from "@utils/index.js";

/**
 * Lets a player give up their own booth in this world. Uses the same release as the admin clear: the booth goes back
 * to open and this world's placed decor returns to the player's inventory. Materials, toys, Toy Tokens, XP, and
 * badges are untouched, and the player can claim a booth again from Start Here.
 */
export const handleAbandonBooth = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    const [{ visitor, visitorData }, { booths, world }] = await Promise.all([
      getVisitor(credentials),
      getBoothIndex(credentials),
    ]);

    const sceneDropId = getOwnedBoothSceneDropId({ booths, profileId, urlSlug, visitorData });
    if (!sceneDropId) {
      return res.status(404).json({ success: false, message: "You don't have a display in this world." });
    }

    // Re-read the booth itself (the index can be stale) so a player can only ever release a booth they still own
    const { boothAsset, boothData } = await getBoothData(credentials, booths[sceneDropId].keyAssetId, sceneDropId);
    if (boothData.ownerId !== profileId) {
      await world.updateDataObject({ [`booths.${sceneDropId}.ownerId`]: boothData.ownerId ?? null });
      return res.status(404).json({ success: false, message: "You don't have a display in this world." });
    }

    await clearBooth({ boothAsset, boothData, credentials, world });

    // A booth just opened up, so the "all booths taken" alert no longer applies
    world
      .updateDataObject({ boothsFullAlert: null })
      .catch((error: any) => errorHandler({ error, functionName: "handleAbandonBooth", message: "Error clearing alert" }));
    visitor
      .updateDataObject({}, { analytics: [{ analyticName: "boothsAbandoned", profileId, urlSlug, uniqueKey: profileId }] })
      .catch((error: any) =>
        errorHandler({ error, functionName: "handleAbandonBooth", message: "Error tracking analytics" }),
      );

    return res.json({ success: true, abandonedSceneDropId: sceneDropId });
  } catch (error) {
    return errorHandler({ error, functionName: "handleAbandonBooth", message: "Error abandoning booth", req, res });
  }
};
