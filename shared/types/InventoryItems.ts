import { InventoryItemCategory } from "./index.js";

export type InventoryItemType = {
  id: string;
  name: string;
  displayName: string;
  type: InventoryItemCategory | undefined;
  rarity: string;
  icon: string;
  description: string;
  sortOrder?: number;
  quantity?: number;
  cost: number;
  reward: number;
  xpReward: number;
  unlockLevel: number;
  spawnIntervalSeconds: number;
  slot?: string;
  layerUrl?: string;
};