import { Credentials, InventoryItemType } from "../../types/index.js";
import { Ecosystem, standardizeError, structureEcosystemInventoryItem } from "../index.js";

type ItemMap = { [id: string]: InventoryItemType };

const sortItems = (items: ItemMap): ItemMap => {
  const sorted: ItemMap = {};
  Object.values(items)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .forEach((item) => {
      sorted[item.id] = item;
    });
  return sorted;
};

export const getInventoryItems = async (credentials: Credentials) => {
  try {
    const ecosystem = await Ecosystem.create({ credentials });
    await ecosystem.fetchInventoryItems();
    const allItems = ecosystem.inventoryItems || [];

    const ecosystemMaterials: ItemMap = {};
    const ecosystemToys: ItemMap = {};
    const ecosystemDecorations: ItemMap = {};

    for (const rawItem of allItems) {
      if (rawItem.status !== "ACTIVE") continue;
      const item = await structureEcosystemInventoryItem(rawItem);
      if (item.type === "material") ecosystemMaterials[item.id] = item;
      else if (item.type === "toy") ecosystemToys[item.id] = item;
      else if (item.type === "decoration") ecosystemDecorations[item.id] = item;
    }

    return {
      allItems,
      ecosystemMaterials: sortItems(ecosystemMaterials),
      ecosystemToys: sortItems(ecosystemToys),
      ecosystemDecorations: sortItems(ecosystemDecorations),
    };
  } catch (error: any) {
    throw standardizeError(error);
  }
};