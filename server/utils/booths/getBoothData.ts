import { Credentials } from "../../types/index.js";
import { BoothDataObjectType } from "@shared/types/BoothTypes.js";
import { getDefaultBoothData } from "../../constants.js";
import { standardizeError } from "../standardizeError.js";
import { DroppedAsset } from "../topiaInit.js";

/**
 * Fetches a booth's key asset and its data object, initializing default BoothData if it has never been set up
 */
export const getBoothData = async (credentials: Credentials, keyAssetId: string, sceneDropId: string) => {
  try {
    const { urlSlug } = credentials;

    const boothAsset = await DroppedAsset.get(keyAssetId, urlSlug, {
      credentials: { ...credentials, assetId: keyAssetId },
    });
    if (!boothAsset) throw "Booth asset not found";

    let boothData = (await boothAsset.fetchDataObject()) as BoothDataObjectType | null;

    if (!boothData?.sceneDropId) {
      boothData = getDefaultBoothData(sceneDropId);
      const lockId = `${keyAssetId}-${Math.floor(Date.now() / 60000) * 60000}`;
      await boothAsset
        .setDataObject(boothData, { lock: { lockId, releaseLock: true } })
        .catch(() => console.warn("Unable to acquire lock, another process may be initializing this booth"));
    }

    return { boothAsset, boothData };
  } catch (error) {
    throw standardizeError(error);
  }
};
