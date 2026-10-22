
export type MetadataType = {
  displayName?: string;
  type?: "material" | "toy" | "decoration";
  sortOrder?: number | string;
  cost?: number | string;
  rewardTokens?: number | string; // Toy Tokens earned when a toy is sold
  rewardXP?: number | string; // XP earned when a toy is sold
  reward?: number | string; // older name for rewardTokens
  xpReward?: number | string; // older name for rewardXP
  unlockLevel?: number | string;
  spawnIntervalSeconds?: number | string;
  stationImageUrl?: string;
  slot?: string;
  layerUrl?: string;
};