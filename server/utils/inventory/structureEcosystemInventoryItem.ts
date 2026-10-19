import { InventoryItemInterface } from "@rtsdk/topia";
import { getMaterialSpawnSeconds, getMaterialUnlockLevel } from "@shared/constants/index.js";
import { InventoryItemType, MetadataType } from "../../types/index.js";

// Ecosystem metadata may arrive as strings, so coerce numeric fields defensively
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

// Items without a status are treated as active; only an explicit non-ACTIVE status hides an item
export const isActiveInventoryItem = (item: { status?: string | null }) =>
  !item.status || item.status.toUpperCase() === "ACTIVE";

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

  return {
    id,
    name: name || "Unknown",
    displayName: displayName || name || "Unknown",
    icon: image_path || "",
    description: description || "",
    type: itemType, // "material" | "toy" | "decoration"
    sortOrder: num(sortOrder),

    // Economy
    cost: num(cost),
    reward: num(rewardTokens ?? reward), // Lina's metadata uses rewardTokens / rewardXP
    xpReward: num(rewardXP ?? xpReward),
    // Materials fall back to the brief's per-material unlock level / generation time when metadata doesn't set them
    unlockLevel: num(unlockLevel, isMaterial ? getMaterialUnlockLevel(materialName) : 1),

    // Materials
    spawnIntervalSeconds: num(spawnIntervalSeconds, isMaterial ? getMaterialSpawnSeconds(materialName) : 0),
    stationImageUrl,

    // Decorations
    slot,
    layerUrl,
  };
};
