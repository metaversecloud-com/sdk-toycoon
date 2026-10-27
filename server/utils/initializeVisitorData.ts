import { countPlacements } from "@shared/constants/index.js";
import { Credentials } from "../types/index.js";
import { ensureVisitorData, getVisitorInstance } from "./getVisitor.js";
import { getVisitorInventory } from "./inventory/getVisitorInventory.js";
import { standardizeError } from "./standardizeError.js";

/**
 * The visitor's data object (with defaults, as in getVisitor) + their inventory (Toy Tokens, XP, level, materials, toys, decorations).
 * Decorations get availableQuantity = owned − placed on a display in ANY world: decor is bought once into the global
 * inventory and can be placed in any world while any are available. (Decor toys aren't inventory items; see decorToys.)
 */
export const initializeVisitorData = async (
  credentials: Credentials,
  { forceRefreshInventory = false, shouldGetVisitorDetails = false } = {},
) => {
  try {
    const visitor = await getVisitorInstance(credentials, shouldGetVisitorDetails);
    // The data object and inventory are separate Topia calls, so fetch them at the same time
    const [visitorData, visitorInventory] = await Promise.all([
      ensureVisitorData(visitor, credentials),
      getVisitorInventory({ credentials, forceRefreshInventory, visitor }),
    ]);

    for (const item of Object.values(visitorInventory.decorations)) {
      item.availableQuantity = Math.max(0, (item.quantity || 0) - countPlacements(visitorData.placedDecorations, item.name));
    }

    return { visitor, visitorData, visitorInventory };
  } catch (error) {
    throw standardizeError(error);
  }
};
