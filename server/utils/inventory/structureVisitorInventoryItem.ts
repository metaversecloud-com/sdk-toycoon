import { UserInventoryItemInterface } from "@rtsdk/topia";
import { defaultVisitorInventoryItem, getRarity } from "../../../shared/index.js";
import { Credentials, InventoryItemType } from "../../types/index.js";
import { getInventoryItem, structureEcosystemInventoryItem } from "../index.js";

// Optional per-request cache so the same ecosystem item is only fetched once
export type EcosystemItemCache = Map<string, Promise<InventoryItemType | undefined>>;

export const structureVisitorInventoryItem = async (
  visitorItem: UserInventoryItemInterface,
  credentials: Credentials,
  cache?: EcosystemItemCache,
): Promise<any> => {
  const {
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

  // Look up the matching ecosystem item by ecosystemItemId
  let ecosystemItem: InventoryItemType | undefined;
  if (ecosystemItemId) {
    let lookup = cache?.get(ecosystemItemId);
    if (!lookup) {
      const created = getInventoryItem(credentials, { id: ecosystemItemId })
        .then((rawItem: any) => structureEcosystemInventoryItem(rawItem))
        .catch(() => {
          console.warn(`Ecosystem item ${ecosystemItemId} (${itemName || name}) not found; falling back`);
          return undefined;
        });
      cache?.set(ecosystemItemId, created);
      lookup = created;
    }
    ecosystemItem = await lookup;
  }


  return {
    ...defaultVisitorInventoryItem,
    ecosystemItemId,
    type: ecosystemItem?.type, // "material" | "toy" | "decoration"
    status,
    description: ecosystemItem?.description || itemDescription || description,
    icon: ecosystemItem?.icon || itemImageUrl || image_url || image_path,
    name: itemName || name,
    displayName: ecosystemItem?.displayName || itemName || name,
    availableQuantity: quantity, // decorations get overwritten in initializeVisitorData
    quantity,
    sortOrder: ecosystemItem?.sortOrder ?? 0,
    rarity: ecosystemItem?.rarity ?? getRarity(0),

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