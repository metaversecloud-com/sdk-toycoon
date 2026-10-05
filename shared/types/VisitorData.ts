/**
 * Shared types between client and server for visitor data
 */

export type InventoryItemCategory = "material" | "toy" | "decoration";

export type VisitorInventoryItemType = {
  id: string;
  ecosystemItemId: string;
  type?: InventoryItemCategory;
  status?: string;
  description: string;
  icon: string;
  name: string;
  displayName: string;
  quantity: number; // owned
  availableQuantity: number; // owned minus placed across all worlds (decorations only)
  sortOrder: number;

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
  coins: number; // "Coins" inventory item
  xp: number; // "Experience Points" inventory item
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
  totalCoinsEarned: number; // lifetime coins earned; only ever increments. Also the "has started playing" sentinel
  totalToysCrafted: number; // all toy types; shown on the leaderboard
  badges: string[];
  placedDecorations: {
    [slot: string]: {
      [urlSlug: string]: string; // decoration name currently shown on that slot's anchor in that world, e.g. "Blue Rug"
    };
  };
  boothIds: {
    [urlSlug: string]: string; // sceneDropId of this visitor's booth in that world (one booth per world)
  };
};
