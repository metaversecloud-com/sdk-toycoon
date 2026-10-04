export * from "@shared/types/VisitorData.js";
export * from "./Credentials.js";
export * from "./DroppedAssetTypes.js";

export type WorldDataType = {
  boothAssetId?: string;
  claimedAt?: number;
  lastActiveAt?: number;
};

export type VisitorDataObjectType = {
  totalCoinsEarned: number;
  totalToysCrafted: number;
  rareToysCrafted: number;
  badges: string[];
  // slot -> urlSlug -> decoration variant name, e.g. { rug: { "my-world": "rug-blue" } }
  placedDecorations: Record<string, Record<string, string>>;
  worlds: Record<string, WorldDataType>;
};

export type VisitorInventoryType = {
  coins: number;
  xp: number;
  level: number;
  materials: { [key: string]: VisitorInventoryItemType };
  toys: { [key: string]: VisitorInventoryItemType };
  decorations: { [key: string]: VisitorInventoryItemType };
};

export type VisitorInventoryItemType = {
  id: string;
  name: string;
  displayName?: string;
  quantity: number;
  availableQuantity?: number; // decorations only, filled in by initializeVisitorData
  metadata: Record<string, any>;
};