import { Request, Response } from "express";
import { DECOR_SPOT_LABELS, DECOR_SPOTS } from "@shared/constants/index.js";
import {
  claimActionLock,
  errorHandler,
  getEmptySpotImageUrl,
  getBoothData,
  getBoothIndex,
  getBoothSpots,
  getCredentials,
  initializeVisitorData,
  requireBoothInWorld,
  getSpotEmptyState,
  resetSpot,
} from "@utils/index.js";

/**
 * Takes the decoration off a spot of the player's display ({ spot }): the spot goes back to its empty picture and
 * original size, and the item goes back to the player's available items.
 */
export const handleRemoveDecoration = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;
    const { spot } = req.body || {};
    if (!DECOR_SPOTS[spot]) throw "Choose a spot on your display.";

    const [{ visitor, visitorData }, { booths }] = await Promise.all([
      initializeVisitorData(credentials),
      getBoothIndex(credentials),
    ]);
    const booth = await requireBoothInWorld(credentials, visitorData, "decorating", booths);

    const current = visitorData.placedDecorations?.[spot]?.[urlSlug] ?? null;
    if (!current) throw `Nothing is on the ${DECOR_SPOT_LABELS[spot]} spot.`;

    const [spots, { boothData }] = await Promise.all([
      getBoothSpots(credentials, booth.sceneDropId),
      getBoothData(credentials, booth.keyAssetId, booth.sceneDropId),
    ]);

    const placementPath = `placedDecorations.${spot}.${urlSlug}`;
    const claimed = await claimActionLock({
      action: "decor",
      alsoWrite: { [placementPath]: null },
      profileId,
      visitor,
      visitorData,
    });
    if (!claimed)
      return res.status(409).json({ success: false, message: "Already decorating — try again in a moment." });

    // Without a saved empty picture, the app's transparent spot picture goes on instead. Without the spot itself, the
    // record is still cleared so the item is usable again.
    const emptySpotImageUrl = getEmptySpotImageUrl(req.hostname);
    const defaults = getSpotEmptyState(spot, boothData.spotDefaults, emptySpotImageUrl) ?? { bottom: "", top: "" };
    if (spots[spot]) {
      try {
        await resetSpot(spots[spot], defaults, emptySpotImageUrl);
      } catch (swapError) {
        await visitor
          .updateDataObject({ [placementPath]: current }, {})
          .catch((error: any) =>
            errorHandler({ error, functionName: "handleRemoveDecoration", message: "Error undoing removal record" }),
          );
        throw swapError;
      }
    }

    const placedDecorations = {
      ...visitorData.placedDecorations,
      [spot]: { ...visitorData.placedDecorations?.[spot], [urlSlug]: null },
    };
    return res.json({ success: true, spot, removed: current, placedDecorations });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleRemoveDecoration",
      message: "Error removing decoration",
      req,
      res,
    });
  }
};
