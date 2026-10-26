import { getMaterialCap } from "@shared/constants/index.js";
import { getMaterialBinState } from "@shared/utils/getMaterialBinState.js";
import { Credentials } from "../../types/index.js";
import { initializeVisitorData } from "../initializeVisitorData.js";
import { getBoothIndex } from "../booths/getBoothIndex.js";
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

    // Independent Topia calls run in parallel so a Start/Collect tap waits on one round-trip, not three
    const [{ ecosystemMaterials }, { visitor, visitorData, visitorInventory }, { booths }] = await Promise.all([
      getInventoryItems(credentials),
      initializeVisitorData(credentials),
      getBoothIndex(credentials),
    ]);
    const material = ecosystemMaterials[materialId];
    if (!material) throw "Invalid material";

    const booth = await requireBoothInWorld(credentials, visitorData, "collecting materials", booths);
    if (visitorInventory.level < material.unlockLevel) throw "Material not unlocked yet.";

    const owned = visitorInventory.materials[materialId]?.quantity ?? 0;
    const cap = getMaterialCap(material.name);
    if (owned >= cap) throw `Your ${material.displayName} is full (${owned}/${cap}). Use some before collecting more.`;

    const generationStartedAt = visitorData.materialGenerationStartedAt?.[material.name] ?? null;
    const { state } = getMaterialBinState(generationStartedAt, material.spawnIntervalSeconds);

    return { booth, cap, generationStartedAt, material, owned, state, visitor, visitorData };
  } catch (error) {
    throw standardizeError(error);
  }
};
