import { getMaterialCap } from "@shared/constants/index.js";
import { getMaterialBinState } from "@shared/utils/getMaterialBinState.js";
import { Credentials } from "../../types/index.js";
import { initializeVisitorData } from "../initializeVisitorData.js";
import { getInventoryItems } from "../inventory/inventoryCache.js";
import { standardizeError } from "../standardizeError.js";
import { requireBoothInWorld } from "./requireBoothInWorld.js";

/**
 * Loads everything a material bin action needs and runs the checks shared by start and collect:
 * the visitor owns a booth in this world, the material exists, is unlocked at the visitor's level, and the visitor
 * isn't already at its inventory cap.
 */
export const getMaterialBin = async (credentials: Credentials, materialId: string) => {
  try {
    if (!materialId) throw "Valid materialId is required";

    const { ecosystemMaterials } = await getInventoryItems(credentials);
    const material = ecosystemMaterials[materialId];
    if (!material) throw "Invalid material";

    const { visitor, visitorData, visitorInventory } = await initializeVisitorData(credentials);
    await requireBoothInWorld(credentials, visitorData);
    if (visitorInventory.level < material.unlockLevel) throw "Material not unlocked yet.";

    const owned = visitorInventory.materials[materialId]?.quantity ?? 0;
    const cap = getMaterialCap(material.name);
    if (owned >= cap) throw `Your ${material.displayName} is full (${owned}/${cap}). Use some before collecting more.`;

    const generationStartedAt = visitorData.materialGenerationStartedAt?.[material.name] ?? null;
    const { state } = getMaterialBinState(generationStartedAt, material.spawnIntervalSeconds);

    return { cap, generationStartedAt, material, owned, state, visitor };
  } catch (error) {
    throw standardizeError(error);
  }
};
