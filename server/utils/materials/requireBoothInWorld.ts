import { Credentials, VisitorDataObjectType } from "../../types/index.js";
import { getBoothIndex } from "../booths/getBoothIndex.js";
import { getOwnedBoothSceneDropId } from "../booths/getOwnedBoothSceneDropId.js";
import { standardizeError } from "../standardizeError.js";

export const getClaimBoothFirstMessage = (action: string) => `Claim a booth at Start Here before ${action}.`;

/**
 * Gameplay (materials, crafting, …) is only for players who own a booth in this world. Throws a 403 otherwise, so the server enforces it
 * even if someone calls the endpoints directly instead of using the Materials page.
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
    return ownedBoothSceneDropId;
  } catch (error) {
    throw standardizeError(error);
  }
};
