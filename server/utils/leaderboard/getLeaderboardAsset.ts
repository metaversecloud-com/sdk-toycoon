import { Credentials, IDroppedAsset } from "../../types/index.js";
import { MAIN_SCENE_UNIQUE_NAME } from "../../constants.js";
import { initializeDroppedAssetDataObject } from "../droppedAssets/initializeDroppedAssetDataObject.js";
import { standardizeError } from "../standardizeError.js";
import { World } from "../topiaInit.js";

/**
 * The world's leaderboard lives on the Main Scene's "Start Here" asset — one per world, so the leaderboard is
 * scoped to this world instance. Ensures the asset's data object has a leaderboard before returning it.
 */
export const getLeaderboardAsset = async (credentials: Credentials): Promise<IDroppedAsset> => {
  try {
    const world = World.create(credentials.urlSlug, { credentials });
    const [keyAsset] = await world.fetchDroppedAssetsWithUniqueName({ uniqueName: MAIN_SCENE_UNIQUE_NAME });
    if (!keyAsset) throw `No "${MAIN_SCENE_UNIQUE_NAME}" asset found in this world.`;

    await initializeDroppedAssetDataObject(keyAsset as IDroppedAsset);

    return keyAsset as IDroppedAsset;
  } catch (error) {
    throw standardizeError(error);
  }
};
