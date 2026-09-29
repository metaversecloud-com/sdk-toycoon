import { DroppedAssetInterface, VisitorInterface } from "@rtsdk/topia";
import { Credentials } from "../types/index.js";
import { TELEPORT_Y_OFFSET } from "../constants.js";
import { errorHandler } from "./errorHandler.js";
import { getQueryString } from "./getQueryString.js";
import { standardizeError } from "./standardizeError.js";

/**
 * Teleports the visitor next to a dropped asset, then opens that asset's drawer so the app reflects where they landed
 */
export const teleportVisitorToAsset = async ({
  baseUrl,
  credentials,
  droppedAsset,
  sceneDropId,
  title,
  visitor,
}: {
  baseUrl: string;
  credentials: Credentials;
  droppedAsset: DroppedAssetInterface;
  sceneDropId?: string;
  title: string;
  visitor: VisitorInterface;
}) => {
  try {
    const { x, y } = droppedAsset.position || { x: 0, y: 0 };
    await visitor.moveVisitor({ shouldTeleportVisitor: true, x, y: y + TELEPORT_Y_OFFSET });

    const { displayName, identityId, interactiveNonce, interactivePublicKey, profileId, urlSlug, username, visitorId } =
      credentials;
    const query = getQueryString({
      assetId: droppedAsset.id,
      displayName,
      identityId,
      interactiveNonce,
      interactivePublicKey,
      profileId,
      sceneDropId,
      uniqueName: droppedAsset.uniqueName || undefined,
      urlSlug,
      username,
      visitorId,
    });

    // The teleport already succeeded; a drawer that fails to open shouldn't fail the request
    await visitor
      .openIframe({ droppedAssetId: droppedAsset.id!, link: `${baseUrl}/?${query}`, shouldOpenInDrawer: true, title })
      .catch((error: any) =>
        errorHandler({
          error,
          functionName: "teleportVisitorToAsset",
          message: "Error opening drawer after teleport",
        }),
      );
  } catch (error) {
    throw standardizeError(error);
  }
};
