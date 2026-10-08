import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getLeaderboardAsset,
  initializeVisitorData,
  rankLeaderboard,
  updateLeaderboardEntry,
} from "@utils/index.js";
import { LeaderboardResponseType } from "@shared/types/LeaderboardTypes.js";
import { LEADERBOARD_SIZE } from "../constants.js";

/**
 * Returns this world's top players plus the viewer's own rank
 */
export const handleGetLeaderboard = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId } = credentials;

    const [keyAsset, { visitorData, visitorInventory }] = await Promise.all([
      getLeaderboardAsset(credentials),
      initializeVisitorData(credentials),
    ]);
    const leaderboardData = { ...(keyAsset.dataObject?.leaderboard || {}) };

    // Refresh the viewer's own row (catches display-name and level changes). Players who haven't done anything yet
    // (no XP, no toys) aren't added, so the board doesn't fill with empty rows.
    if (visitorInventory.xp > 0 || visitorData.totalToysCrafted > 0) {
      try {
        leaderboardData[profileId] = await updateLeaderboardEntry({
          credentials,
          keyAsset,
          stats: {
            totalXp: visitorInventory.xp,
            level: visitorInventory.level,
            totalToysCrafted: visitorData.totalToysCrafted,
          },
        });
      } catch (error) {
        errorHandler({ error, functionName: "handleGetLeaderboard", message: "Error refreshing visitor's leaderboard entry" });
      }
    }

    const ranked = rankLeaderboard(leaderboardData);
    const response: LeaderboardResponseType = {
      leaderboard: ranked.slice(0, LEADERBOARD_SIZE),
      myEntry: ranked.find((entry) => entry.profileId === profileId) || null,
    };

    return res.json({ ...response, success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetLeaderboard",
      message: "Error getting leaderboard",
      req,
      res,
    });
  }
};
