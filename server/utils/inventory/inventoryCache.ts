import { InventoryItemInterface } from "@rtsdk/topia";
import { getMaterialCap } from "@shared/constants/index.js";
import { Credentials, InventoryItemType } from "../../types/index.js";
import { standardizeError } from "../standardizeError.js";
import { Ecosystem } from "../topiaInit.js";
import { isActiveInventoryItem, structureEcosystemInventoryItem } from "./structureEcosystemInventoryItem.js";

// Ecosystem item definitions rarely change, so cache them per interactive key for 6 hours.
// Pass forceRefresh (from the forceRefreshInventory query param) to pick up newly uploaded items immediately.
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

export type EcosystemInventoryType = {
  allItems: InventoryItemInterface[];
  ecosystemMaterials: { [itemId: string]: InventoryItemType };
  ecosystemToys: { [itemId: string]: InventoryItemType };
  ecosystemDecorations: { [itemId: string]: InventoryItemType };
};

const cache = new Map<string, { data: EcosystemInventoryType; timestamp: number }>();

const sortByOrder = (items: { [itemId: string]: InventoryItemType }) =>
  Object.fromEntries(Object.entries(items).sort(([, a], [, b]) => a.sortOrder - b.sortOrder));

const fetchEcosystemInventory = async (credentials: Credentials): Promise<EcosystemInventoryType> => {
  const ecosystem = await Ecosystem.create({ credentials });
  await ecosystem.fetchInventoryItems();
  const allItems = ecosystem.inventoryItems || [];

  const ecosystemMaterials: { [itemId: string]: InventoryItemType } = {};
  const ecosystemToys: { [itemId: string]: InventoryItemType } = {};
  const ecosystemDecorations: { [itemId: string]: InventoryItemType } = {};

  const uncategorized: string[] = [];
  for (const item of allItems) {
    if (!isActiveInventoryItem(item)) continue;
    const data = structureEcosystemInventoryItem(item);

    if (data.type === "material") ecosystemMaterials[data.id] = data;
    else if (data.type === "toy") ecosystemToys[data.id] = data;
    else if (data.type === "decoration") ecosystemDecorations[data.id] = data;
    else uncategorized.push(`${data.name} (status: ${item.status ?? "none"}, metadata.type: ${data.type ?? "none"})`);
  }

  // One line per fetch (every few hours, or on forceRefreshInventory) so misconfigured items are easy to spot
  console.log(
    `[inventory] ${allItems.length} ecosystem items: ${Object.keys(ecosystemMaterials).length} materials, ` +
      `${Object.keys(ecosystemToys).length} toys, ${Object.keys(ecosystemDecorations).length} decorations` +
      (uncategorized.length ? `; not a material/toy/decoration: ${uncategorized.join(", ")}` : ""),
  );
  // What each material resolved to — a level/timer/cap of 1/0s/10 usually means its name didn't match a known material
  if (Object.keys(ecosystemMaterials).length) {
    console.log(
      `[inventory] materials: ${Object.values(ecosystemMaterials)
        .map(({ name, unlockLevel, spawnIntervalSeconds }) =>
          `${name} (level ${unlockLevel}, ${spawnIntervalSeconds}s, cap ${getMaterialCap(name)})`,
        )
        .join(", ")}`,
    );
  }

  return {
    allItems,
    ecosystemMaterials: sortByOrder(ecosystemMaterials),
    ecosystemToys: sortByOrder(ecosystemToys),
    ecosystemDecorations: sortByOrder(ecosystemDecorations),
  };
};

export const getInventoryItems = async (credentials: Credentials, forceRefresh = false) => {
  const key = credentials.interactivePublicKey;
  const cached = cache.get(key);

  if (cached && !forceRefresh && Date.now() - cached.timestamp < CACHE_DURATION_MS) return cached.data;

  try {
    const data = await fetchEcosystemInventory(credentials);
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    // Serve stale data rather than failing if the ecosystem fetch has a hiccup
    if (cached) return cached.data;
    throw standardizeError(error);
  }
};

/**
 * Looks up one active ecosystem item definition by id or name (from the cache)
 */
export const getInventoryItem = async (credentials: Credentials, { id, name }: { id?: string; name?: string }) => {
  try {
    if (!id && !name) throw "Either id or name is required to look up an inventory item";

    const { allItems } = await getInventoryItems(credentials);
    const inventoryItem = allItems.find(
      (item) => isActiveInventoryItem(item) && (id ? item.id === id : item.name === name),
    );
    if (!inventoryItem) throw `Inventory item ${id ? `with id ${id}` : `"${name}"`} not found in ecosystem`;

    return inventoryItem;
  } catch (error) {
    throw standardizeError(error);
  }
};
