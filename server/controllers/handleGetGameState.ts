import { Request, Response } from "express";
import {
  errorHandler,
  getBoothData,
  getBoothIndex,
  getCredentials,
  getOwnedBoothSceneDropId,
  getVisitor,
} from "@utils/index.js";
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

    const [{ visitor, visitorData }, { booths, worldData }] = await Promise.all([
      getVisitor(credentials, true),
      getBoothIndex(credentials, forceRefreshBooths),
    ]);

    const ownedBoothSceneDropId = getOwnedBoothSceneDropId({ booths, profileId, urlSlug, visitorData });

    let targetBooth: TargetBoothType | null = null;
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

      // Owner opening their own booth counts as activity for the 14-day inactivity check
      if (isOwnedByVisitor) {
        boothAsset.updateDataObject({ lastInteractionTimestamp: Date.now() }).catch((error: any) =>
          errorHandler({
            error,
            functionName: "handleGetGameState",
            message: "Error updating booth lastInteractionTimestamp",
          }),
        );
      }
    }

    const isAdmin = !!visitor.isAdmin;

    const gameState: GameStateResponseType = {
      visitorData,
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
