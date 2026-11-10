import { InventoryItemInterface } from "@rtsdk/topia";
import {
  getCollectXpForSeconds,
  getDecorUnlockLevel,
  getMaterialSpawnSeconds,
  getMaterialUnlockLevel,
  MATERIALS,
  toCanonicalMaterialName,
} from "@shared/constants/index.js";
import { InventoryItemType, MetadataType } from "../../types/index.js";

// Ecosystem metadata may arrive as strings, so turn numeric fields into numbers safely
const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return value === undefined || value === null || value === "" || Number.isNaN(n) ? fallback : n;
};

// Metadata is normally an object, but tolerate a JSON string (as typed into the ecosystem editor)
const parseMetadata = (metadata: unknown): MetadataType => {
  if (!metadata) return {};
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) as MetadataType;
    } catch {
      return {};
    }
  }
  return metadata as MetadataType;
};

// Items without a status count as active; only an explicit non-ACTIVE status hides an item
export const isActiveInventoryItem = (item: { status?: string | null }) =>
  !item.status || item.status.toUpperCase() === "ACTIVE";

/**
 * Turns a raw ecosystem inventory item into the app's item shape.
 * Every number is read from the item's metadata first, then falls back to the constants in shared/constants.
 */
export const structureEcosystemInventoryItem = (item: InventoryItemInterface): InventoryItemType => {
  const { id, name, description, image_path, metadata } = item;

  const {
    displayName,
    type,
    sortOrder,
    cost,
    rewardTokens,
    rewardXP,
    reward,
    xpReward,
    unlockLevel,
    spawnIntervalSeconds,
    stationImageUrl,
    slot,
    layerUrl,
  } = parseMetadata(metadata);

  const itemType = typeof type === "string" ? (type.toLowerCase() as MetadataType["type"]) : undefined;
  const isMaterial = itemType === "material";
  const materialName = name || displayName || "";
  // Decorations and toys unlock by name (Teddy Bears at level 2, Trains at level 3, ...)
  const isShopItem = itemType === "decoration" || itemType === "toy";

  // The station timer first, so the XP below always matches the time the player really waits
  const resolvedSpawnSeconds = num(spawnIntervalSeconds, isMaterial ? getMaterialSpawnSeconds(materialName) : 0);
  // A fixed XP for this material in constants (optional). If there isn't one, XP comes from the timer.
  const configuredCollectXp = isMaterial ? MATERIALS[toCanonicalMaterialName(materialName)]?.collectXp : undefined;

  return {
    id,
    name: name || "Unknown",
    displayName: displayName || name || "Unknown",
    icon: image_path || "",
    description: description || "",
    type: itemType, // "material" | "toy" | "decoration"
    sortOrder: num(sortOrder),

    // ----- Economy -----
    cost: num(cost),
    reward: num(rewardTokens ?? reward), // Lina's metadata uses rewardTokens / rewardXP
    // XP priority: 1) metadata rewardXP  2) fixed collectXp in constants  3) formula from the timer (materials only)
    xpReward: num(
      rewardXP ?? xpReward,
      isMaterial ? (configuredCollectXp ?? getCollectXpForSeconds(resolvedSpawnSeconds)) : 0,
    ),
    unlockLevel: num(
      unlockLevel,
      isMaterial ? getMaterialUnlockLevel(materialName) : isShopItem ? getDecorUnlockLevel(materialName) : 1,
    ),

    // ----- Materials -----
    spawnIntervalSeconds: resolvedSpawnSeconds,
    stationImageUrl,

    // ----- Decorations -----
    slot,
    layerUrl,
  };
};