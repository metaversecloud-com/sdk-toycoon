import { Request, Response } from "express";
import { clearBoothsWhere, errorHandler, getBoothIndex, getCredentials } from "@utils/index.js";

/**
 * Admin: releases every booth in the world and clears world-level alerts.
 * Players keep everything they own (coins, xp, level, unlocked decor) — only their booths in this world are released.
 * Leaderboard reset is a separate admin action.
 */
export const handleResetWorld = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    // Rebuild the index from the world's scenes so booths added or removed since it was cached are accounted for
    const { booths, world } = await getBoothIndex(credentials, true);

    const { clearedSceneDropIds, failedSceneDropIds } = await clearBoothsWhere({
      booths,
      credentials,
      shouldClear: () => true,
      world,
    });

    await world.updateDataObject({ boothsFullAlert: null });

    return res.json({ success: true, clearedSceneDropIds, failedSceneDropIds });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleResetWorld",
      message: "Error resetting world",
      req,
      res,
    });
  }
};
