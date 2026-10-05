import { Request, Response } from "express";
import { errorHandler, getCredentials, getLeaderboardAsset } from "@utils/index.js";

/**
 * Admin: empties this world's leaderboard. Only the leaderboard map on the key asset is touched — players keep their
 * XP, level, toys crafted, coins, badges, and decor, and reappear as their stats next update.
 */
export const handleResetLeaderboard = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    const keyAsset = await getLeaderboardAsset(credentials);
    await keyAsset.updateDataObject(
      { leaderboard: {} },
      { analytics: [{ analyticName: "leaderboardResets", profileId, urlSlug, uniqueKey: profileId }] },
    );

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleResetLeaderboard",
      message: "Error resetting leaderboard",
      req,
      res,
    });
  }
};
