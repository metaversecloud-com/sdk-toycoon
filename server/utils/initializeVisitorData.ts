import { Credentials } from "../types/index.js";
import { getVisitor } from "./getVisitor.js";
import { getVisitorInventory } from "./inventory/getVisitorInventory.js";
import { standardizeError } from "./standardizeError.js";

/**
 * getVisitor (data object with defaults) + the visitor's inventory (coins, XP, level, materials, toys, decorations).
 * Decorations get availableQuantity = owned − placed across ALL worlds: decor is bought once into the global
 * inventory and can be placed in any world while any are available.
 */
export const initializeVisitorData = async (
  credentials: Credentials,
  { forceRefreshInventory = false, shouldGetVisitorDetails = false } = {},
) => {
  try {
    const { visitor, visitorData } = await getVisitor(credentials, shouldGetVisitorDetails);
    const visitorInventory = await getVisitorInventory({ credentials, forceRefreshInventory, visitor });

    for (const item of Object.values(visitorInventory.decorations)) {
      let placedCount = 0;
      for (const placementsByWorld of Object.values(visitorData.placedDecorations)) {
        for (const placedName of Object.values(placementsByWorld)) {
          if (placedName === item.name) placedCount++;
        }
      }
      item.availableQuantity = Math.max(0, (item.quantity || 0) - placedCount);
    }

    return { visitor, visitorData, visitorInventory };
  } catch (error) {
    throw standardizeError(error);
  }
};
