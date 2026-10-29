import { Request, Response } from "express";
import { clearBoothsWhere, errorHandler, getBoothIndex, getCredentials } from "@utils/index.js";
import { INACTIVE_BOOTH_THRESHOLD_MS } from "../constants.js";

/**
 * Admin: releases every booth whose owner hasn't interacted with it in 14+ days
 */
export const handleClearInactiveBooths = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const cutoff = Date.now() - INACTIVE_BOOTH_THRESHOLD_MS;

    const { booths, world } = await getBoothIndex(credentials);

    const { clearedSceneDropIds, failedSceneDropIds } = await clearBoothsWhere({
      booths,
      credentials,
      shouldClear: ({ lastInteractionTimestamp }) => (lastInteractionTimestamp || 0) < cutoff,
      world,
    });

    if (clearedSceneDropIds.length > 0) await world.updateDataObject({ boothsFullAlert: null });

    return res.json({ success: true, clearedSceneDropIds, failedSceneDropIds });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleClearInactiveBooths",
      message: "Error clearing inactive booths",
      req,
      res,
    });
  }
};
