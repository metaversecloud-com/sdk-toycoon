import { EcosystemInterface } from "@rtsdk/topia";
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

/**
 * Fetch every item defined in the ecosystem, grouped by type.
 * Different from getVisitorInventory, which only returns what the visitor owns.
 */
export const getInventoryItems = async (credentials: Credentials) => {
  try {
    const ecosystem = (await Ecosystem.create({ credentials })) as EcosystemInterface;
    await ecosystem.fetchInventoryItems();

    const ecosystemMaterials: ItemMap = {};
    const ecosystemToys: ItemMap = {};
    const ecosystemDecorations: ItemMap = {};

    for (const rawItem of ecosystem.inventoryItems || []) {
      const item = await structureEcosystemInventoryItem(rawItem);
      if (item.type === "material") ecosystemMaterials[item.id] = item;
      else if (item.type === "toy") ecosystemToys[item.id] = item;
      else if (item.type === "decoration") ecosystemDecorations[item.id] = item;
    }

    return {
      ecosystemMaterials: sortItems(ecosystemMaterials),
      ecosystemToys: sortItems(ecosystemToys),
      ecosystemDecorations: sortItems(ecosystemDecorations),
    };
  } catch (error: any) {
    throw standardizeError(error);
  }
};