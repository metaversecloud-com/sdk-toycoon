import { Request, Response } from "express";
import { errorHandler, getBaseUrl, getCredentials, getVisitor, teleportVisitorToAsset, World } from "@utils/index.js";
import { MAIN_SCENE_UNIQUE_NAME } from "../constants.js";

/**
 * Return teleport — sends the visitor back to the Main Scene's "Start Here" asset
 */
export const handleTeleportToMainScene = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    const world = World.create(urlSlug, { credentials });
    const [{ visitor }, [startAsset]] = await Promise.all([
      getVisitor(credentials),
      world.fetchDroppedAssetsWithUniqueName({ uniqueName: MAIN_SCENE_UNIQUE_NAME }),
    ]);

    if (!startAsset) throw `No "${MAIN_SCENE_UNIQUE_NAME}" asset found in this world.`;

    await teleportVisitorToAsset({
      baseUrl: getBaseUrl(req.hostname),
      credentials,
      droppedAsset: startAsset,
      title: "Toycoon",
      visitor,
    });

    visitor
      .updateDataObject(
        {},
        { analytics: [{ analyticName: "teleport-mainScene", profileId, urlSlug, uniqueKey: profileId }] },
      )
      .catch((error: any) =>
        errorHandler({ error, functionName: "handleTeleportToMainScene", message: "Error tracking teleport analytics" }),
      );

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTeleportToMainScene",
      message: "Error teleporting to Main Scene",
      req,
      res,
    });
  }
};
