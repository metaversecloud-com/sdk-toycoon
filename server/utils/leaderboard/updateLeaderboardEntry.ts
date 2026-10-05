import { Credentials, IDroppedAsset } from "../../types/index.js";
import { standardizeError } from "../standardizeError.js";
import { getLeaderboardAsset } from "./getLeaderboardAsset.js";
import { LeaderboardStatsType, serializeLeaderboardEntry } from "./leaderboardEntries.js";

/**
 * Upserts the visitor's row on this world's leaderboard. Call after anything that changes XP, level, or toys
 * crafted (e.g. Angel's craft and sell flows). Skips the write when nothing changed.
 * Pass keyAsset if the caller already has the leaderboard asset loaded to avoid refetching it.
 * Returns the stored entry string.
 */
export const updateLeaderboardEntry = async ({
  credentials,
  keyAsset,
  stats,
}: {
  credentials: Credentials;
  keyAsset?: IDroppedAsset;
  stats: Omit<LeaderboardStatsType, "displayName">;
}): Promise<string> => {
  try {
    const { displayName, profileId } = credentials;
    const leaderboardAsset = keyAsset || (await getLeaderboardAsset(credentials));

    const entry = serializeLeaderboardEntry({ displayName, ...stats });
    if (leaderboardAsset.dataObject?.leaderboard?.[profileId] === entry) return entry;

    // Dot-path write so concurrent updates from different players don't overwrite each other
    await leaderboardAsset.updateDataObject({ [`leaderboard.${profileId}`]: entry }, {});

    return entry;
  } catch (error) {
    throw standardizeError(error);
  }
};
