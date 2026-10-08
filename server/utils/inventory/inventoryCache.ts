import { InventoryItemInterface } from "@rtsdk/topia";
import { Credentials, InventoryItemType } from "../../types/index.js";
import { standardizeError } from "../standardizeError.js";
import { Ecosystem } from "../topiaInit.js";
import { structureEcosystemInventoryItem } from "./structureEcosystemInventoryItem.js";

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

  for (const item of allItems) {
    if (item.status !== "ACTIVE") continue;
    const data = structureEcosystemInventoryItem(item);

    if (data.type === "material") ecosystemMaterials[data.id] = data;
    else if (data.type === "toy") ecosystemToys[data.id] = data;
    else if (data.type === "decoration") ecosystemDecorations[data.id] = data;
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
      (item) => item.status === "ACTIVE" && (id ? item.id === id : item.name === name),
    );
    if (!inventoryItem) throw `Inventory item ${id ? `with id ${id}` : `"${name}"`} not found in ecosystem`;

    return inventoryItem;
  } catch (error) {
    throw standardizeError(error);
  }
};
