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
  cost: number; // decor price in Toy Tokens
  reward: number; // Toy Tokens earned when a toy is sold (metadata: rewardTokens)
  xpReward: number; // XP earned when a toy is sold (metadata: rewardXP)
  unlockLevel: number;

  // Materials
  spawnIntervalSeconds: number;
  stationImageUrl?: string; // workstation art shown on the Materials page

  // Decorations
  slot?: string; // anchor asset unique name, e.g. "rug"
  layerUrl?: string; // image swapped onto the anchor
};

export type VisitorInventoryType = {
  coins: number; // "Toy Tokens" currency balance
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
  totalCoinsEarned: number; // lifetime Toy Tokens earned; only ever increments. Also the "has started playing" sentinel
  totalToysCrafted: number; // all toy types; shown on the leaderboard
  totalToysSold: number; // only ever increments
  badges: string[];
  materialGenerationStartedAt: {
    [materialName: string]: number | null; // server ms timestamp the bin was started; null/missing = idle (see getMaterialBinState)
  };
  toyCraftStartedAt: {
    [recipeId: string]: number | null; // server ms timestamp a craft started; null/missing = no craft in progress
  };
  // Versions for one-shot action locks (see claimActionLock). Only ever increase — even when an action fails — so a
  // lock held by an earlier attempt can never block the next one.
  lockVersions: {
    [action: string]: number;
  };
  placedDecorations: {
    [slot: string]: {
      [urlSlug: string]: string; // decoration name currently shown on that slot's anchor in that world, e.g. "Blue Rug"
    };
  };
  boothIds: {
    [urlSlug: string]: string; // sceneDropId of this visitor's booth in that world (one booth per world)
  };
};
