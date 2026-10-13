import { InventoryItemCategory } from "./VisitorData.js";

// An ecosystem inventory item definition (what can be owned), structured from its metadata
export type InventoryItemType = {
  id: string;
  name: string;
  displayName: string;
  type: InventoryItemCategory | undefined;
  icon: string;
  description: string;
  sortOrder: number;
  cost: number;
  reward: number;
  xpReward: number;
  unlockLevel: number;
  spawnIntervalSeconds: number;
  stationImageUrl?: string; // materials: the workstation art shown on the Materials page
  slot?: string;
  layerUrl?: string;
};
