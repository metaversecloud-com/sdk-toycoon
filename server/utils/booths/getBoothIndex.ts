import { Credentials } from "../../types/index.js";
import { BoothDataObjectType, BoothIndexType, WorldDataObjectType } from "@shared/types/BoothTypes.js";
import { BOOTH_KEY_UNIQUE_NAME } from "../../constants.js";
import { standardizeError } from "../standardizeError.js";
import { World } from "../topiaInit.js";

const CONCURRENCY_LIMIT = 20;

/**
 * Returns an index of every booth scene in the world (sceneDropId → key asset id + owner).
 * The index is cached on the World data object and only rebuilt from the world's scenes when it's missing,
 * when forced, or when the visitor clicked a booth asset the index doesn't know about yet (e.g. a newly dropped booth).
 */
export const getBoothIndex = async (
  credentials: Credentials,
  forceRefresh = false,
): Promise<{ booths: BoothIndexType; world: any; worldData: WorldDataObjectType | null }> => {
  try {
    const { sceneDropId, uniqueName, urlSlug } = credentials;

    const world = World.create(urlSlug, { credentials });
    const worldData = (await world.fetchDataObject()) as WorldDataObjectType | null;
    let booths = worldData?.booths || {};

    const isUnknownBooth = uniqueName === BOOTH_KEY_UNIQUE_NAME && !!sceneDropId && !booths[sceneDropId];

    if (forceRefresh || isUnknownBooth || Object.keys(booths).length === 0) {
      const { scenes = {} } = (await world.fetchScenes()) as { scenes?: { [sceneDropId: string]: unknown } };
      const sceneDropIds = Object.keys(scenes);

      const rebuilt: BoothIndexType = {};
      for (let index = 0; index < sceneDropIds.length; index += CONCURRENCY_LIMIT) {
        const batch = sceneDropIds.slice(index, index + CONCURRENCY_LIMIT);
        await Promise.all(
          batch.map(async (id) => {
            try {
              const [keyAsset] = await world.fetchDroppedAssetsBySceneDropId({
                sceneDropId: id,
                uniqueName: BOOTH_KEY_UNIQUE_NAME,
              });
              // Scenes without a booth key asset (e.g. the Main Scene) aren't booths
              if (!keyAsset?.id) return;

              const boothData = (await keyAsset.fetchDataObject()) as Partial<BoothDataObjectType> | null;
              rebuilt[id] = { keyAssetId: keyAsset.id, ownerId: boothData?.ownerId || null };
            } catch {
              // Skip scenes we can't read rather than failing the whole index
            }
          }),
        );
      }

      booths = rebuilt;

      const lockId = `world_booths_${Math.floor(Date.now() / 60000) * 60000}`;
      if (!worldData) await world.setDataObject({ booths }, { lock: { lockId, releaseLock: true } });
      else await world.updateDataObject({ booths }, { lock: { lockId, releaseLock: true } });
    }

    if (Object.keys(booths).length === 0) throw "No booth scenes found in this world.";

    return { booths, world, worldData };
  } catch (error) {
    throw standardizeError(error);
  }
};
