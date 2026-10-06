/**
 * Shared types between client and server for visitor data
 */

export type VisitorWorldDataType = {
  boothAssetId?: string; // unset = no booth claimed in this world
  claimedAt?: number; // ms timestamp, shown as the booth's "start date"
  lastActiveAt?: number; // ms timestamp, used by the 2-week inactive-booth admin clear
};

export type InventoryItemCategory = "material" | "toy" | "decoration";

export type VisitorInventoryItemType = {
  id: string;
  ecosystemItemId: string;
  type?: InventoryItemCategory;
  description: string;
  icon: string;
  name: string;
  displayName: string;
  quantity: number; // owned
  availableQuantity: number; // owned minus placed (decorations only)
  sortOrder: number;
  rarity: string;

  // Economy
  cost: number; // decor price in coins
  reward: number; // coins earned when a toy is sold
  xpReward: number; // XP earned when a toy is sold
  unlockLevel: number;

  // Materials
  spawnIntervalSeconds: number;

  // Decorations
  slot?: string; // anchor asset unique name, e.g. "rug"
  layerUrl?: string; // image swapped onto the anchor
};

export type VisitorInventoryType = {
  coins: number;
  xp: number;
  level: number; // derived from xp, never stored
  materials: {
    [itemId: string]: VisitorInventoryItemType;
  };
  toys: {
    [itemId: string]: VisitorInventoryItemType;
  };
  decorations: {
    [itemId: string]: VisitorInventoryItemType;
  };
};

export type VisitorDataObjectType = {
  totalCoinsEarned: number; // lifetime coins earned (leaderboard + first-time sentinel), only ever increments
  totalToysCrafted: number;
  rareToysCrafted: number; // leaderboard "Rare Bears Crafted"
  badges: string[];
  materialCollectedAt: { [materialName: string]: number };
  placedDecorations: {
    [slot: string]: {
      [urlSlug: string]: string; // decoration variant name currently shown in that world, e.g. "Blue Rug"
    };
  };
  worlds: {
    [urlSlug: string]: VisitorWorldDataType;
  };
};