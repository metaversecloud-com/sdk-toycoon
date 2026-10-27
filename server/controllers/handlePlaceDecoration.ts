import { Request, Response } from "express";
import {
  countPlacements,
  DECOR_SPOT_LABELS,
  DECOR_SPOTS,
  getDecorImageUrl,
  getDecorSlotType,
  getOwnedDecorCount,
} from "@shared/constants/index.js";
import {
  claimActionLock,
  errorHandler,
  getBoothIndex,
  getBoothSpots,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  getFitScale,
  getSpotBox,
  requireBoothInWorld,
} from "@utils/index.js";

/**
 * Puts a decoration ({ itemId, spot }) on a spot of the player's display in this world, replacing whatever was there
 * (which goes back to the player's available items). Rugs, awnings, and lights each have their own spot; toys bought
 * at the Decorations shop can go on any of the three toy spots (crafted toys are for selling, not decorating).
 * A player can place as many copies of an item as they own.
 * The spot's picture is swapped to the item's booth picture (Lina's S3 image, its layerUrl, or its inventory image) —
 * toys fitted to an 80px box, the rest at their own size.
 */
export const handlePlaceDecoration = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;
    const { itemId, spot } = req.body || {};

    const spotType = DECOR_SPOTS[spot];
    if (!spotType) throw "Choose a spot on your display.";

    const [{ ecosystemDecorations, ecosystemToys }, { visitor, visitorData, visitorInventory }, { booths }] =
      await Promise.all([
        getInventoryItems(credentials),
        initializeVisitorData(credentials),
        getBoothIndex(credentials),
      ]);
    const booth = await requireBoothInWorld(credentials, visitorData, "decorating", booths);

    const item = ecosystemDecorations[itemId] ?? ecosystemToys[itemId];
    if (!item) throw "Invalid decoration";
    const spotLabel = DECOR_SPOT_LABELS[spot];
    if (getDecorSlotType(item) !== spotType) throw `${item.displayName} can't go on the ${spotLabel} spot.`;

    const current = visitorData.placedDecorations?.[spot]?.[urlSlug] ?? null;
    if (current === item.name) throw `${item.displayName} is already on the ${spotLabel} spot.`;

    // Toys come from the Decorations shop (decorToys), never the crafted toys that are for selling
    const owned = getOwnedDecorCount(item, visitorInventory, visitorData);
    if (owned < 1) throw `Buy a ${item.displayName} at Decorations first.`;
    if (owned - countPlacements(visitorData.placedDecorations, item.name, { spot, urlSlug }) < 1) {
      throw `All your ${item.displayName}s are already on display. Buy another one to put it here too.`;
    }

    const imageUrl = getDecorImageUrl(item);
    if (!imageUrl) throw `${item.displayName} doesn't have a picture yet.`;

    const spots = await getBoothSpots(credentials, booth.sceneDropId);
    const spotAsset = spots[spot];
    if (!spotAsset) throw `Your display doesn't have a ${spotLabel} spot set up yet.`;

    // Topia shows a new picture at its own pixel size: toys are fitted to the toy spots' box, the rest (Lina's booth
    // pictures) show as they are
    const box = getSpotBox(spot);
    const scale = box ? await getFitScale(imageUrl, box) : 1;

    // One decor change at a time, so a double-tap can't place one copy on two spots
    const placementPath = `placedDecorations.${spot}.${urlSlug}`;
    const claimed = await claimActionLock({
      action: "decor",
      alsoWrite: { [placementPath]: item.name },
      profileId,
      visitor,
      visitorData,
    });
    if (!claimed)
      return res.status(409).json({ success: false, message: "Already decorating — try again in a moment." });

    try {
      await spotAsset.updateWebImageLayers(imageUrl, "");
    } catch (swapError) {
      // The picture didn't change, so the placement didn't happen
      await visitor
        .updateDataObject({ [placementPath]: current }, {})
        .catch((error: any) =>
          errorHandler({ error, functionName: "handlePlaceDecoration", message: "Error undoing placement record" }),
        );
      throw swapError;
    }

    // Best-effort: the decoration is placed either way, just not resized if this fails. Always sent: Topia doesn't
    // report a spot's current size, so there's no telling whether it already matches.
    await spotAsset
      .updateScale(scale)
      .catch((error: any) =>
        errorHandler({ error, functionName: "handlePlaceDecoration", message: `Error resizing ${spot}` }),
      );
    console.log(
      `[decor] Placed ${item.name} on ${spot}: asset ${spotAsset.id} at (${spotAsset.position?.x}, ${spotAsset.position?.y}), ` +
        `picture ${imageUrl}, scale ${scale}`,
    );

    visitor
      .updateDataObject(
        {},
        {
          analytics: [{ analyticName: "toycoon_decor_placed", profileId, urlSlug, uniqueKey: `${profileId}_${spot}` }],
        },
      )
      .catch((error: any) =>
        errorHandler({ error, functionName: "handlePlaceDecoration", message: "Error tracking analytics" }),
      );

    const placedDecorations = {
      ...visitorData.placedDecorations,
      [spot]: { ...visitorData.placedDecorations?.[spot], [urlSlug]: item.name },
    };
    return res.json({ success: true, spot, itemName: item.name, replaced: current, placedDecorations });
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
