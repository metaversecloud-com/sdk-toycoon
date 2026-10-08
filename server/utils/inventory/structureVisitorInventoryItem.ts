import { UserInventoryItemInterface } from "@rtsdk/topia";
import { Credentials, InventoryItemType, VisitorInventoryItemType } from "../../types/index.js";
import { getInventoryItem } from "./inventoryCache.js";
import { structureEcosystemInventoryItem } from "./structureEcosystemInventoryItem.js";

/**
 * Combines a visitor-owned item (quantity) with its ecosystem definition (game config from metadata)
 */
export const structureVisitorInventoryItem = async (
  visitorItem: UserInventoryItemInterface,
  credentials: Credentials,
): Promise<VisitorInventoryItemType> => {
  const {
    id,
    name,
    description = "",
    image_url = "",
    image_path = "",
    status,
    quantity = 0,
    item,
    item_id: ecosystemItemId,
  } = visitorItem;

  const { name: itemName, description: itemDescription = "", image_url: itemImageUrl = "" } = item || {};

  // Ecosystem definitions are cached, so this lookup doesn't hit the API per item
  let ecosystemItem: InventoryItemType | undefined;
  if (ecosystemItemId) {
    try {
      ecosystemItem = structureEcosystemInventoryItem(await getInventoryItem(credentials, { id: ecosystemItemId }));
    } catch {
      console.warn(`Ecosystem item ${ecosystemItemId} (${itemName || name}) not found; falling back to visitor item data`);
    }
  }

  return {
    id,
    ecosystemItemId,
    type: ecosystemItem?.type, // "material" | "toy" | "decoration"
    status,
    description: ecosystemItem?.description || itemDescription || description,
    icon: ecosystemItem?.icon || itemImageUrl || image_url || image_path,
    name: itemName || name || "",
    displayName: ecosystemItem?.displayName || itemName || name || "",
    quantity,
    availableQuantity: quantity, // decorations get overwritten in initializeVisitorData
    sortOrder: ecosystemItem?.sortOrder ?? 0,

    // Economy
    cost: ecosystemItem?.cost ?? 0, // decor price in coins
    reward: ecosystemItem?.reward ?? 0, // coins earned when a toy is sold
    xpReward: ecosystemItem?.xpReward ?? 0, // XP earned when a toy is sold
    unlockLevel: ecosystemItem?.unlockLevel ?? 1,

    // Materials
    spawnIntervalSeconds: ecosystemItem?.spawnIntervalSeconds ?? 0,

    // Decorations
    slot: ecosystemItem?.slot, // anchor asset unique name, e.g. "rug"
    layerUrl: ecosystemItem?.layerUrl, // image swapped onto the anchor
  };
};
