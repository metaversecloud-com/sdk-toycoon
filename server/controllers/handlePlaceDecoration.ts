import { Request, Response } from "express";
import {
  countPlacements,
  DECOR_SPOT_LABELS,
  DECOR_SPOTS,
  getDecorImageUrl,
  getDecorSlotType,
} from "@shared/constants/index.js";
import {
  claimActionLock,
  errorHandler,
  getEmptySpotImageUrl,
  getBoothData,
  getBoothIndex,
  getBoothSpots,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  getFitScale,
  getSpotBox,
  getSpotEmptyState,
  recordSpotDefaults,
  requireBoothInWorld,
} from "@utils/index.js";

/**
 * Puts a decoration ({ itemId, spot }) on a spot of the player's display in this world, replacing whatever was there
 * (which goes back to the player's available items). Rugs, awnings, and lights each have their own spot; toys (crafted
 * or bought) can go on any of the three toy spots. A player can place as many copies of an item as they own.
 * The spot's picture is swapped to the item's layerUrl (or its inventory image until one is set) and resized to fit
 * inside the spot's empty picture.
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

    const owned = (visitorInventory.decorations[itemId] ?? visitorInventory.toys[itemId])?.quantity ?? 0;
    if (owned < 1) throw `Buy a ${item.displayName} at Decorations first.`;
    if (owned - countPlacements(visitorData.placedDecorations, item.name, { spot, urlSlug }) < 1) {
      throw `All your ${item.displayName}s are already on display. Buy another one to put it here too.`;
    }

    const imageUrl = getDecorImageUrl(item);
    if (!imageUrl) throw `${item.displayName} doesn't have a picture yet.`;

    const [spots, { boothAsset, boothData }] = await Promise.all([
      getBoothSpots(credentials, booth.sceneDropId),
      getBoothData(credentials, booth.keyAssetId, booth.sceneDropId),
    ]);
    const spotAsset = spots[spot];
    if (!spotAsset) throw `Your display doesn't have a ${spotLabel} spot set up yet.`;

    // Save what the player's empty rug/awning/lights spots show (their empty pictures and sizes) before changing one, so
    // removing or clearing can put them back. Then work out the size that fits this decoration in the spot (Topia shows
    // a new picture at its own pixel size): toys fit an 80px box, the others fit inside their empty picture.
    const emptySpots = Object.keys(DECOR_SPOTS).filter((name) => !visitorData.placedDecorations?.[name]?.[urlSlug]);
    const fallbackImageUrl = getEmptySpotImageUrl(req.hostname);
    const spotDefaults = await recordSpotDefaults({ boothAsset, boothData, emptySpots, fallbackImageUrl, spots });
    const emptyState = getSpotEmptyState(spot, spotDefaults, fallbackImageUrl);
    const scale = emptyState ? await getFitScale(imageUrl, emptyState, getSpotBox(spot)) : null;

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
    if (scale !== null) {
      await spotAsset
        .updateScale(scale)
        .catch((error: any) =>
          errorHandler({ error, functionName: "handlePlaceDecoration", message: `Error resizing ${spot}` }),
        );
    }
    console.log(
      `[decor] Placed ${item.name} on ${spot}: asset ${spotAsset.id} at (${spotAsset.position?.x}, ${spotAsset.position?.y}), ` +
        `picture ${imageUrl}, scale ${scale ?? "unchanged"}`,
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
