export type MetadataType = {
  displayName?: string;
  type?: "material" | "toy" | "decoration";
  sortOrder?: number | string;
  cost?: number | string;
  reward?: number | string;
  xpReward?: number | string;
  unlockLevel?: number | string;
  spawnIntervalSeconds?: number | string;
  slot?: string;
  layerUrl?: string;
};