import { LeaderboardDataType, LeaderboardEntryType } from "@shared/types/LeaderboardTypes.js";

export interface LeaderboardStatsType {
  displayName: string;
  totalXp: number;
  level: number;
  totalToysCrafted: number;
}

// "|" is the field separator, so it can't appear inside a display name
export const serializeLeaderboardEntry = ({ displayName, totalXp, level, totalToysCrafted }: LeaderboardStatsType): string =>
  `${(displayName || "Player").replace(/\|/g, "/")}|${totalXp}|${level}|${totalToysCrafted}`;

/**
 * Parses the stored map into ranked rows.
 * Ranked by total XP (level follows from XP), then total toys crafted.
 */
export const rankLeaderboard = (leaderboard: LeaderboardDataType = {}): LeaderboardEntryType[] =>
  Object.entries(leaderboard)
    .map(([profileId, value]) => {
      const [displayName, totalXp, level, totalToysCrafted] = value.split("|");
      return {
        profileId,
        displayName,
        level: parseInt(level) || 1,
        totalXp: parseInt(totalXp) || 0,
        totalToysCrafted: parseInt(totalToysCrafted) || 0,
      };
    })
    .sort((a, b) => b.totalXp - a.totalXp || b.totalToysCrafted - a.totalToysCrafted)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
