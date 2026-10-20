import { Credentials, VisitorDataObjectType } from "../../types/index.js";
import { BoothIndexType } from "@shared/types/BoothTypes.js";
import { getBoothIndex } from "../booths/getBoothIndex.js";
import { getOwnedBoothSceneDropId } from "../booths/getOwnedBoothSceneDropId.js";
import { standardizeError } from "../standardizeError.js";

export const getClaimBoothFirstMessage = (action: string) => `Claim a booth at Start Here before ${action}.`;

/**
 * Gameplay (materials, crafting, selling, …) is only for players who own a booth in this world. Throws a 403 otherwise,
 * so the server enforces it even if someone calls the endpoints directly instead of using the pages.
 * Returns the owned booth (its scene and key asset), e.g. to update the booth's level.
 * Pass booths if the caller already fetched the index (ideally in parallel with its other Topia calls).
 */
export const requireBoothInWorld = async (
  credentials: Credentials,
  visitorData: VisitorDataObjectType,
  action = "collecting materials",
  prefetchedBooths?: BoothIndexType,
) => {
  try {
    const { profileId, urlSlug } = credentials;
    const booths = prefetchedBooths ?? (await getBoothIndex(credentials)).booths;
    const ownedBoothSceneDropId = getOwnedBoothSceneDropId({ booths, profileId, urlSlug, visitorData });
    if (!ownedBoothSceneDropId) throw Object.assign(new Error(getClaimBoothFirstMessage(action)), { status: 403 });
    return { sceneDropId: ownedBoothSceneDropId, keyAssetId: booths[ownedBoothSceneDropId].keyAssetId };
  } catch (error) {
    throw standardizeError(error);
  }
};
