import { Credentials } from "../../types/index.js";
import { BoothDataObjectType, BoothIndexType } from "@shared/types/BoothTypes.js";
import { CLEAR_BOOTHS_CONCURRENCY } from "../../constants.js";
import { standardizeError } from "../standardizeError.js";
import { clearBooth } from "./clearBooth.js";
import { getBoothData } from "./getBoothData.js";

/**
 * Clears every owned booth matching shouldClear. Each booth's own data object is checked (not the index, which can be
 * stale), and one booth failing doesn't stop the rest.
 */
export const clearBoothsWhere = async ({
  booths,
  credentials,
  shouldClear,
  world,
}: {
  booths: BoothIndexType;
  credentials: Credentials;
  shouldClear: (boothData: BoothDataObjectType) => boolean;
  world: any;
}): Promise<{ clearedSceneDropIds: string[]; failedSceneDropIds: string[] }> => {
  try {
    const clearedSceneDropIds: string[] = [];
    const failedSceneDropIds: string[] = [];
    const sceneDropIds = Object.keys(booths);

    for (let index = 0; index < sceneDropIds.length; index += CLEAR_BOOTHS_CONCURRENCY) {
      const batch = sceneDropIds.slice(index, index + CLEAR_BOOTHS_CONCURRENCY);
      await Promise.all(
        batch.map(async (sceneDropId) => {
          try {
            const { boothAsset, boothData } = await getBoothData(credentials, booths[sceneDropId].keyAssetId, sceneDropId);
            if (!boothData.ownerId || !shouldClear(boothData)) return;

            await clearBooth({ boothAsset, boothData, credentials, world });
            clearedSceneDropIds.push(sceneDropId);
          } catch (error) {
            console.error(`Failed to clear booth ${sceneDropId}`, error);
            failedSceneDropIds.push(sceneDropId);
          }
        }),
      );
    }

    return { clearedSceneDropIds, failedSceneDropIds };
  } catch (error) {
    throw standardizeError(error);
  }
};
