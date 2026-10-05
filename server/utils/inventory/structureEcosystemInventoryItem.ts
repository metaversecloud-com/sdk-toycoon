import { InventoryItemInterface } from "@rtsdk/topia";
import { InventoryItemType, MetadataType } from "../../types/index.js";

// Ecosystem metadata may arrive as strings, so coerce numeric fields defensively
const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return value === undefined || value === null || value === "" || Number.isNaN(n) ? fallback : n;
};

/**
 * Turns a raw ecosystem inventory item into the app's item shape, reading game config from its metadata
 */
export const structureEcosystemInventoryItem = (item: InventoryItemInterface): InventoryItemType => {
  const { id, name, description, image_path, metadata } = item;

  const {
    displayName,
    type,
    sortOrder,
    cost,
    reward,
    xpReward,
    unlockLevel,
    spawnIntervalSeconds,
    slot,
    layerUrl,
  } = (metadata as MetadataType) || {};

  return {
    id,
    name: name || "Unknown",
    displayName: displayName || name || "Unknown",
    icon: image_path || "",
    description: description || "",
    type, // "material" | "toy" | "decoration"
    sortOrder: num(sortOrder),

    // Economy
    cost: num(cost),
    reward: num(reward),
    xpReward: num(xpReward),
    unlockLevel: num(unlockLevel, 1),

    // Materials
    spawnIntervalSeconds: num(spawnIntervalSeconds),

    // Decorations
    slot,
    layerUrl,
  };
};
