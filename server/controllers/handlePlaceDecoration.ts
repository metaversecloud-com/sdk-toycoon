// server/controllers/handlePlaceDecoration.ts
import { Request, Response } from "express";
import { countPlaced, getDecorSlot } from "@shared/constants/index.js";
import {
  errorHandler,
  getBoothIndex,
  getCredentials,
  getInventoryItems,
  getOwnedBoothSceneDropId,
  initializeVisitorData,
  World,
} from "@utils/index.js";

/**
 * Shows an owned decoration in the visitor's booth by swapping the image on that slot's anchor asset.
 * Idempotent, so no lock is needed: a double-click writes the same value twice.
 */
export const handlePlaceDecoration = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;
    const { decorationId } = req.body;
    if (!decorationId) throw "Valid decorationId is required";

    const [{ ecosystemDecorations }, { visitor, visitorData, visitorInventory }, { booths }] = await Promise.all([
      getInventoryItems(credentials),
      initializeVisitorData(credentials),
      getBoothIndex(credentials),
    ]);

    const decoration = ecosystemDecorations[decorationId];
    if (!decoration) throw "Invalid decoration";

    const slot = getDecorSlot(decoration.name);
    if (!slot) throw `${decoration.displayName} isn't set up for placement yet.`;
    if (visitorInventory.level < slot.unlockLevel) throw "You haven't unlocked this decoration yet.";

    const boothSceneDropId = getOwnedBoothSceneDropId({ booths, profileId, urlSlug, visitorData });
    if (!boothSceneDropId) throw "Claim a booth in this world first.";

    const previous = visitorData.placedDecorations?.[slot.id]?.[urlSlug] ?? null;
    if (previous === decoration.name) throw "That decoration is already in your booth.";

    const owned = visitorInventory.decorations[decorationId]?.quantity ?? 0;
    if (owned - countPlaced(visitorData.placedDecorations, decoration.name) < 1) {
      throw "You don't have a copy available for this world. Buy it first.";
    }

    const imageUrl = decoration.layerUrl || decoration.icon;
    if (!imageUrl) throw `${decoration.displayName} has no image configured.`;

    const world = World.create(urlSlug, { credentials });
    const anchors = await world.fetchDroppedAssetsBySceneDropId({
      sceneDropId: boothSceneDropId,
      uniqueName: slot.anchorUniqueName,
    });
    const anchor = anchors?.[0];
    if (!anchor) throw "Couldn't find that spot in your booth. Ask an admin to reset your booth.";

    // Record first (this is what frees the previous variant), then swap the image; undo the record if the swap fails
    const placedPath = `placedDecorations.${slot.id}.${urlSlug}`;
    await visitor.updateDataObject({ [placedPath]: decoration.name }, {});
    try {
      await anchor.updateWebImageLayers("", imageUrl);
    } catch (swapError) {
      await visitor.updateDataObject({ [placedPath]: previous }, {}).catch((error: any) =>
        errorHandler({ error, functionName: "handlePlaceDecoration", message: "Error undoing placement" }),
      );
      throw swapError;
    }

    return res.json({ success: true, slot: slot.id, placedDecoration: decoration.name });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handlePlaceDecoration",
      message: "Error placing decoration",
      req,
      res,
    });
  }
};