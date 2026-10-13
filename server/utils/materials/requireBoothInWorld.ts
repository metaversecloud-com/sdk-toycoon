import { Credentials, VisitorDataObjectType } from "../../types/index.js";
import { getBoothIndex } from "../booths/getBoothIndex.js";
import { getOwnedBoothSceneDropId } from "../booths/getOwnedBoothSceneDropId.js";
import { standardizeError } from "../standardizeError.js";

export const CLAIM_BOOTH_FIRST_MESSAGE = "Claim a booth at Start Here before collecting materials.";

/**
 * Materials are only for players who own a booth in this world. Throws a 403 otherwise, so the server enforces it
 * even if someone calls the endpoints directly instead of using the Materials page.
 */
export const requireBoothInWorld = async (credentials: Credentials, visitorData: VisitorDataObjectType) => {
  try {
    const { profileId, urlSlug } = credentials;
    const { booths } = await getBoothIndex(credentials);
    const ownedBoothSceneDropId = getOwnedBoothSceneDropId({ booths, profileId, urlSlug, visitorData });
    if (!ownedBoothSceneDropId) throw Object.assign(new Error(CLAIM_BOOTH_FIRST_MESSAGE), { status: 403 });
    return ownedBoothSceneDropId;
  } catch (error) {
    throw standardizeError(error);
  }
};
