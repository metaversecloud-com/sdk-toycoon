import {
  standardizeError,
  structureVisitorInventoryItem,
  Visitor,
} from "../index.js";
import type { EcosystemItemCache } from "./structureVisitorInventoryItem.js";

// ...inside getVisitorInventory, replace the for-loop with:

await visitor.fetchInventoryItems();
const allItems = visitor.inventoryItems || [];

const cache: EcosystemItemCache = new Map();
const structured = await Promise.all(
  allItems.map((visitorItem) => structureVisitorInventoryItem(visitorItem, credentials, cache)),
);

let coins = 0;
let xp = 0;
const materials: ItemMap = {};
const toys: ItemMap = {};
const decorations: ItemMap = {};

for (const itemData of structured) {
  const { ecosystemItemId, name, status, quantity, type } = itemData;
  if (status !== "ACTIVE" || !name) continue;

  if (name === COINS_ITEM_NAME) coins = quantity || 0;
  else if (name === XP_ITEM_NAME) xp = quantity || 0;
  else if (type === "material") materials[ecosystemItemId] = itemData;
  else if (type === "toy") toys[ecosystemItemId] = itemData;
  else if (type === "decoration") decorations[ecosystemItemId] = itemData;
}