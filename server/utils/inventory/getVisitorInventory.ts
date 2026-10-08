import { VisitorInterface } from "@rtsdk/topia";
import { getLevelFromXp } from "@shared/levels.js";
import { Credentials, VisitorInventoryItemType, VisitorInventoryType } from "../../types/index.js";
import { COINS_ITEM_NAME, XP_ITEM_NAME } from "../../constants.js";
import { standardizeError } from "../standardizeError.js";
import { getInventoryItems } from "./inventoryCache.js";
import { structureVisitorInventoryItem } from "./structureVisitorInventoryItem.js";

type ItemMap = { [itemId: string]: VisitorInventoryItemType };

const sortByOrder = (items: ItemMap): ItemMap =>
  Object.fromEntries(Object.entries(items).sort(([, a], [, b]) => a.sortOrder - b.sortOrder));

/**
 * Aggregates the visitor's coins, XP, level, materials, toys, and decorations into one client-ready object
 */
export const getVisitorInventory = async ({
  credentials,
  forceRefreshInventory = false,
  visitor,
}: {
  credentials: Credentials;
  forceRefreshInventory?: boolean;
  visitor: VisitorInterface;
}): Promise<VisitorInventoryType> => {
  try {
    // Warm (or force-refresh) the ecosystem cache so per-item lookups below are in-memory
    await getInventoryItems(credentials, forceRefreshInventory);

    await visitor.fetchInventoryItems();
    const structured = await Promise.all(
      (visitor.inventoryItems || []).map((visitorItem) => structureVisitorInventoryItem(visitorItem, credentials)),
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

    return {
      coins,
      xp,
      level: getLevelFromXp(xp),
      materials: sortByOrder(materials),
      toys: sortByOrder(toys),
      decorations: sortByOrder(decorations),
    };
  } catch (error) {
    throw standardizeError(error);
  }
};
