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
  totalCoinsEarned: number; // lifetime, only increments, first-time sentinel
  totalToysCrafted: number;
  rareToysCrafted: number;
  badges: string[];
  materialCollectedAt: { [materialName: string]: number };
  placedDecorations: { [slot: string]: { [urlSlug: string]: string } };
  boothIds?: { [urlSlug: string]: string }; // Amanda's: urlSlug -> booth scene drop ID
  xp?: number; // display mirror of the XP inventory item
  level?: number; // display mirror, derived from XP
};