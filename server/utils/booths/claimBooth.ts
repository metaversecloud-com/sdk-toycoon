import { Credentials } from "../../types/index.js";
import { standardizeError } from "../standardizeError.js";
import { getBoothData } from "./getBoothData.js";

/**
 * Attempts to claim a single booth for the visitor.
 * The booth's key asset data object is re-read first (the world's booth index can be stale), then written under a
 * lock versioned by claimCount and intentionally never released: once one claim lands, any other request that read
 * the same open state uses the same lockId and is rejected instead of overwriting the owner.
 */
export const claimBooth = async ({
  credentials,
  keyAssetId,
  sceneDropId,
  level,
  badges,
}: {
  credentials: Credentials;
  keyAssetId: string;
  sceneDropId: string;
  level: number;
  badges: string[];
}): Promise<{ status: "claimed" } | { status: "taken"; ownerId: string } | { status: "locked" }> => {
  try {
    const { displayName, profileId, urlSlug } = credentials;

    const { boothAsset, boothData } = await getBoothData(credentials, keyAssetId, sceneDropId);
    if (boothData.ownerId) return { status: "taken", ownerId: boothData.ownerId };

    const claimCount = boothData.claimCount || 0;

    try {
      await boothAsset.updateDataObject(
        {
          ownerId: profileId,
          ownerDisplayName: displayName,
          claimDate: new Date().toISOString(),
          level,
          badges,
          lastInteractionTimestamp: Date.now(),
          claimCount: claimCount + 1,
        },
        {
          lock: { lockId: `claim-${keyAssetId}-${claimCount}`, releaseLock: false },
          analytics: [{ analyticName: "boothsClaimed", profileId, urlSlug, uniqueKey: profileId }],
        },
      );
    } catch (error) {
      console.warn(`Unable to acquire claim lock for booth ${sceneDropId}; another visitor may be claiming it`, error);
      return { status: "locked" };
    }

    return { status: "claimed" };
  } catch (error) {
    throw standardizeError(error);
  }
};
