import { Credentials } from "../../types/index.js";
import { BoothDataObjectType, BoothIndexType, WorldDataObjectType } from "@shared/types/BoothTypes.js";
import { BOOTH_KEY_UNIQUE_NAME } from "../../constants.js";
import { standardizeError } from "../standardizeError.js";
import { DroppedAsset, World } from "../topiaInit.js";

const CONCURRENCY_LIMIT = 20;

type ScenesResponseType = {
  scenes?: {
    [sceneDropId: string]: { droppedAssets?: { [droppedAssetId: string]: { metaName?: string | null } } };
  };
};

// Dropping a scene can suffix its assets' unique names, so accept "toycoon_booth" and "toycoon_booth<suffix>"
const isBoothKeyName = (name?: string | null) => !!name && name.startsWith(BOOTH_KEY_UNIQUE_NAME);

/**
 * Returns an index of every booth scene in the world (sceneDropId → key asset id + owner).
 * The index is cached on the World data object and only rebuilt from the world's scenes when it's missing,
 * when forced, or when the visitor clicked a booth asset the index doesn't know about yet (e.g. a newly dropped booth).
 * A world with no booth scenes yet returns an empty index rather than failing, so non-booth pages (Materials, the
 * Main Scene) still load.
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

    const isUnknownBooth = isBoothKeyName(uniqueName) && !!sceneDropId && !booths[sceneDropId];

    if (forceRefresh || isUnknownBooth || Object.keys(booths).length === 0) {
      const scenesResponse = (await world.fetchScenes()) as ScenesResponseType;
      const scenes = scenesResponse?.scenes || {};
      const sceneDropIds = Object.keys(scenes);

      const rebuilt: BoothIndexType = {};
      const failedSceneDropIds: string[] = [];
      for (let index = 0; index < sceneDropIds.length; index += CONCURRENCY_LIMIT) {
        const batch = sceneDropIds.slice(index, index + CONCURRENCY_LIMIT);
        await Promise.all(
          batch.map(async (id) => {
            try {
              // fetchScenes already lists each dropped asset's unique name (metaName), so look there first
              const keyAssetIdFromScene = Object.entries(scenes[id]?.droppedAssets || {}).find(([, asset]) =>
                isBoothKeyName(asset?.metaName),
              )?.[0];

              let keyAssetId = keyAssetIdFromScene;
              if (!keyAssetId) {
                const [keyAsset] = await world.fetchDroppedAssetsBySceneDropId({
                  sceneDropId: id,
                  uniqueName: BOOTH_KEY_UNIQUE_NAME,
                });
                keyAssetId = keyAsset?.id;
              }
              // Scenes without a booth key asset (e.g. the Main Scene) aren't booths
              if (!keyAssetId) return;

              const keyAsset = DroppedAsset.create(keyAssetId, urlSlug, { credentials: { ...credentials, assetId: keyAssetId } });
              const boothData = (await keyAsset.fetchDataObject()) as Partial<BoothDataObjectType> | null;
              rebuilt[id] = { keyAssetId, ownerId: boothData?.ownerId || null };
            } catch (error: any) {
              // Skip scenes we can't read rather than failing the whole index, but report them below
              failedSceneDropIds.push(`${id} (${error?.message || error})`);
            }
          }),
        );
      }

      // One line per rebuild so a world with missing/misnamed booths is easy to diagnose: lists each scene's
      // asset unique names (first few) so you can see what the booth asset is actually called once dropped
      const sceneSummaries = sceneDropIds.map((id) => {
        const names = Object.values(scenes[id]?.droppedAssets || {}).map((asset) => asset?.metaName || "(no unique name)");
        const shown = names.slice(0, 8).join(", ") + (names.length > 8 ? `, +${names.length - 8} more` : "");
        return `${id} [${names.length} assets: ${shown}]`;
      });
      console.log(
        `[booths] world "${urlSlug}": ${sceneDropIds.length} scenes, ${Object.keys(rebuilt).length} with a ` +
          `"${BOOTH_KEY_UNIQUE_NAME}" asset` +
          (Object.keys(rebuilt).length ? ` (${Object.keys(rebuilt).join(", ")})` : "") +
          (failedSceneDropIds.length ? `; couldn't read: ${failedSceneDropIds.join("; ")}` : "") +
          (scenesResponse?.scenes ? "" : `; unexpected fetchScenes response keys: ${Object.keys(scenesResponse || {}).join(", ")}`) +
          (sceneSummaries.length ? `\n  scenes: ${sceneSummaries.join("\n          ")}` : ""),
      );

      // Don't cache an empty index (no booths built yet) — rebuild until booths exist. Do overwrite a previously
      // cached index, though, so removed booths drop out.
      const hadCachedBooths = Object.keys(worldData?.booths || {}).length > 0;
      if (Object.keys(rebuilt).length > 0 || hadCachedBooths) {
        const lockId = `world_booths_${Math.floor(Date.now() / 60000) * 60000}`;
        if (!worldData) await world.setDataObject({ booths: rebuilt }, { lock: { lockId, releaseLock: true } });
        else await world.updateDataObject({ booths: rebuilt }, { lock: { lockId, releaseLock: true } });
      }

      booths = rebuilt;
    }

    return { booths, world, worldData };
  } catch (error) {
    throw standardizeError(error);
  }
};
