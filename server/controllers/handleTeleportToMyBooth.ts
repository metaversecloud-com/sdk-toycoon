import { Request, Response } from "express";
import {
  DroppedAsset,
  errorHandler,
  getBaseUrl,
  getBoothIndex,
  getCredentials,
  getOwnedBoothSceneDropId,
  getVisitor,
  teleportVisitorToAsset,
} from "@utils/index.js";

/**
 * 1:1 teleport — sends the visitor straight to the booth they own in this world
 */
export const handleTeleportToMyBooth = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    const [{ visitor, visitorData }, { booths }] = await Promise.all([
      getVisitor(credentials),
      getBoothIndex(credentials),
    ]);

    const ownedBoothSceneDropId = getOwnedBoothSceneDropId({ booths, profileId, urlSlug, visitorData });
    if (!ownedBoothSceneDropId) {
      return res.status(404).json({ success: false, message: "You don't have a booth in this world yet." });
    }

    const { keyAssetId } = booths[ownedBoothSceneDropId];
    const boothAsset = await DroppedAsset.get(keyAssetId, urlSlug, {
      credentials: { ...credentials, assetId: keyAssetId },
    });

    await teleportVisitorToAsset({
      baseUrl: getBaseUrl(req.hostname),
      credentials,
      droppedAsset: boothAsset,
      sceneDropId: ownedBoothSceneDropId,
      title: "My Booth",
      visitor,
    });

    visitor
      .updateDataObject({}, { analytics: [{ analyticName: "teleport-myBooth", profileId, urlSlug, uniqueKey: profileId }] })
      .catch((error: any) =>
        errorHandler({ error, functionName: "handleTeleportToMyBooth", message: "Error tracking teleport analytics" }),
      );

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTeleportToMyBooth",
      message: "Error teleporting to booth",
      req,
      res,
    });
  }
};
