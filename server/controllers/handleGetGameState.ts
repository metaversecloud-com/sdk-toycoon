import { Request, Response } from "express";
import {
  DroppedAsset,
  errorHandler,
  getBoothData,
  getBoothIndex,
  getCredentials,
  getOwnedBoothSceneDropId,
  initializeVisitorData,
} from "@utils/index.js";
import { DroppedAssetInterface } from "@rtsdk/topia";
import { GameStateResponseType, TargetBoothType } from "@shared/types/BoothTypes.js";

/**
 * Resolves the relationship between the visiting player and every booth scene in this world:
 * - does the visitor already own a booth here, and which one?
 * - is the booth they clicked (if any) claimed, and by whom?
 */
export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, sceneDropId, urlSlug } = credentials;
    const forceRefreshBooths = req.query.forceRefreshBooths === "true";
    const forceRefreshInventory = req.query.forceRefreshInventory === "true";

    const [{ visitor, visitorData, visitorInventory }, { booths, worldData }] = await Promise.all([
      initializeVisitorData(credentials, { forceRefreshInventory, shouldGetVisitorDetails: true }),
      getBoothIndex(credentials, forceRefreshBooths),
    ]);

    const ownedBoothSceneDropId = getOwnedBoothSceneDropId({ booths, profileId, urlSlug, visitorData });

    let targetBooth: TargetBoothType | null = null;
    let ownedBoothAsset: DroppedAssetInterface | null = null;
    const targetEntry = sceneDropId ? booths[sceneDropId] : undefined;

    if (targetEntry) {
      const { boothAsset, boothData } = await getBoothData(credentials, targetEntry.keyAssetId, sceneDropId);
      const isOwnedByVisitor = !!boothData.ownerId && boothData.ownerId === profileId;

      targetBooth = {
        sceneDropId,
        isClaimed: !!boothData.ownerId,
        isOwnedByVisitor,
        ownerDisplayName: boothData.ownerDisplayName,
        level: boothData.level,
        claimDate: boothData.claimDate,
      };

      if (isOwnedByVisitor) ownedBoothAsset = boothAsset;
    }

    // Any app open by an owner (booth, Main Scene, gameplay drawer) counts as activity for their booth's 14-day
    // inactivity check. Not awaited: the page shouldn't wait on it.
    if (ownedBoothSceneDropId) {
      const { keyAssetId } = booths[ownedBoothSceneDropId];
      (ownedBoothAsset || DroppedAsset.create(keyAssetId, urlSlug, { credentials: { ...credentials, assetId: keyAssetId } }))
        .updateDataObject({ lastInteractionTimestamp: Date.now() }, {})
        .catch((error: any) =>
          errorHandler({
            error,
            functionName: "handleGetGameState",
            message: "Error updating booth lastInteractionTimestamp",
          }),
        );
    }

    const isAdmin = !!visitor.isAdmin;

    const gameState: GameStateResponseType = {
      visitorData,
      visitorInventory,
      ownsBoothInThisWorld: !!ownedBoothSceneDropId,
      ownedBoothSceneDropId,
      targetBooth,
      availableBoothCount: Object.values(booths).filter(({ ownerId }) => !ownerId).length,
      isAdmin,
      boothsFullAlert: isAdmin ? worldData?.boothsFullAlert || null : null,
    };

    return res.json({ ...gameState, success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetGameState",
      message: "Error getting game state",
      req,
      res,
    });
  }
};
