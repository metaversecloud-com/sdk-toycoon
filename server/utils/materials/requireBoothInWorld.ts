import { Credentials, VisitorDataObjectType } from "../../types/index.js";
import { getBoothIndex } from "../booths/getBoothIndex.js";
import { getOwnedBoothSceneDropId } from "../booths/getOwnedBoothSceneDropId.js";
import { standardizeError } from "../standardizeError.js";

export const getClaimBoothFirstMessage = (action: string) => `Claim a booth at Start Here before ${action}.`;

/**
 * Gameplay (materials, crafting, selling, …) is only for players who own a booth in this world. Throws a 403 otherwise,
 * so the server enforces it even if someone calls the endpoints directly instead of using the pages.
 * Returns the owned booth (its scene and key asset), e.g. to update the booth's level.
 */
export const requireBoothInWorld = async (
  credentials: Credentials,
  visitorData: VisitorDataObjectType,
  action = "collecting materials",
) => {
  try {
    const { profileId, urlSlug } = credentials;
    const { booths } = await getBoothIndex(credentials);
    const ownedBoothSceneDropId = getOwnedBoothSceneDropId({ booths, profileId, urlSlug, visitorData });
    if (!ownedBoothSceneDropId) throw Object.assign(new Error(getClaimBoothFirstMessage(action)), { status: 403 });
    return { sceneDropId: ownedBoothSceneDropId, keyAssetId: booths[ownedBoothSceneDropId].keyAssetId };
  } catch (error) {
    throw standardizeError(error);
  }
};
