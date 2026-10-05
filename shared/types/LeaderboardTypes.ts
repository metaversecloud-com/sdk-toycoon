/**
 * Shared types between client and server for the per-world leaderboard
 */

// Stored on the Main Scene key asset (MAIN_SCENE_UNIQUE_NAME): profileId → "displayName|totalXp|level|totalToysCrafted"
export type LeaderboardDataType = Record<string, string>;

export interface LeaderboardEntryType {
  rank: number;
  profileId: string;
  displayName: string;
  level: number;
  totalXp: number;
  totalToysCrafted: number;
}

export interface LeaderboardResponseType {
  leaderboard: LeaderboardEntryType[]; // top LEADERBOARD_SIZE
  myEntry: LeaderboardEntryType | null; // the viewer's own row, even if they're outside the top 25
}
