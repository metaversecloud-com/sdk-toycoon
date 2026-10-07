import { InventoryItemInterface } from "@rtsdk/topia";
import { getRarity } from "../../../shared/index.js";
import { MetadataType } from "../../types/Type.js";

// Ecosystem metadata may arrive as strings, so coerce numeric fields defensively
const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return value === undefined || value === null || value === "" || Number.isNaN(n) ? fallback : n;
};

export const structureEcosystemInventoryItem = async (item: InventoryItemInterface): Promise<any> => {
  const { id, name, description, image_path, metadata } = item;

  const {
    displayName,
    type,
    sortOrder,
    rarity,
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
    rarity: getRarity(num(rarity)),

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