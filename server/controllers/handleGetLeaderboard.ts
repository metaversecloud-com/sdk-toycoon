import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getLeaderboardAsset,
  getVisitor,
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

    const [keyAsset, { visitorData }] = await Promise.all([getLeaderboardAsset(credentials), getVisitor(credentials)]);
    const leaderboardData = { ...(keyAsset.dataObject?.leaderboard || {}) };

    // Refresh the viewer's own row (catches display-name and level changes). totalCoinsEarned is the sentinel
    // initializeVisitorData sets for players who've started playing, so brand-new visitors aren't added as empty rows.
    if (visitorData.totalCoinsEarned !== undefined) {
      try {
        leaderboardData[profileId] = await updateLeaderboardEntry({
          credentials,
          keyAsset,
          // TODO (Angel): if XP ends up as an "Experience Points" inventory item (per .ai/rules.md) rather than
          // visitorData.xp, read it from inventory here
          stats: {
            totalXp: visitorData.xp || 0,
            level: visitorData.level || 1,
            totalToysCrafted: visitorData.totalToysCrafted || 0,
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
