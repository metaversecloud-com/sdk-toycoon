import { InventoryItemType } from "@shared/types/InventoryItems";
import { toCanonicalMaterialName } from "@shared/constants";

// What the Main Scene's objects are called in the world, so instructions name exactly what players should walk to.
// The gameplay pages use the same names as their titles.
// TODO: confirm these match the in-world objects' names/signs with Lina
export const WORLD_OBJECTS = {
  start: "Start Here sign",
  materials: "Materials Box",
  assembly: "Toy Assembly",
  cashier: "Cashier",
  shop: "Shop",
};

/**
 * Each material's in-game icon (the ecosystem item's image) by material name, e.g. { Fabric: "https://…" }, so every
 * page shows the same art the Materials Box does
 */
export const getMaterialIcons = (ecosystemMaterials: { [itemId: string]: InventoryItemType } = {}) =>
  Object.fromEntries(
    Object.values(ecosystemMaterials)
      .filter(({ icon }) => !!icon)
      .map(({ name, icon }) => [toCanonicalMaterialName(name), icon]),
  ) as { [materialName: string]: string };
