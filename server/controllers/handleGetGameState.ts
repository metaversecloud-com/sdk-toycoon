import { Request, Response } from "express";
import {
  DroppedAsset,
  errorHandler,
  getBoothData,
  getBoothIndex,
  getBoothOwnerStats,
  getOpenAnalytics,
  getCredentials,
  getInventoryItems,
  getOwnedBoothSceneDropId,
  initializeVisitorData,
  saveBadgeProgress,
  trackAnalytics,
} from "@utils/index.js";
import { DroppedAssetInterface } from "@rtsdk/topia";
import { MAX_SHOPS_VISITED_TRACKED } from "@shared/constants/index.js";
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
    // Cached (and already refreshed above if forced), so this doesn't cost an extra API call
    const { ecosystemBadges, ecosystemDecorations, ecosystemMaterials, ecosystemToys } = await getInventoryItems(credentials);

    const ownedBoothSceneDropId = getOwnedBoothSceneDropId({ booths, profileId, urlSlug, visitorData });

    let targetBooth: TargetBoothType | null = null;
    let ownedBoothAsset: DroppedAssetInterface | null = null;
    let visitedOwnerId: string | null = null; // whose display this is, when it's someone else's
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
        ownerStats: boothData.ownerId && !isOwnedByVisitor ? await getBoothOwnerStats(credentials, boothData.ownerId) : null,
      };

      if (isOwnedByVisitor) ownedBoothAsset = boothAsset;
      else visitedOwnerId = boothData.ownerId;
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

    // Badge progress: today counts as a day played, and opening someone else's display counts as visiting their shop.
    // Also catches up on any badge already earned (e.g. one just added to the ecosystem). Runs after the reply.
    const badgeUpdate: { [path: string]: boolean } = {};
    const today = new Date(Date.now()).toISOString().slice(0, 10);
    if (!visitorData.daysPlayed?.[today]) badgeUpdate[`daysPlayed.${today}`] = true;
    if (
      visitedOwnerId &&
      !visitorData.shopsVisited?.[visitedOwnerId] &&
      Object.keys(visitorData.shopsVisited || {}).length < MAX_SHOPS_VISITED_TRACKED
    ) {
      badgeUpdate[`shopsVisited.${visitedOwnerId}`] = true;
    }
    saveBadgeProgress({ credentials, level: visitorInventory.level, update: badgeUpdate, visitor, visitorData });
    trackAnalytics({
      credentials,
      events: getOpenAnalytics({
        daysPlayed: visitorData.daysPlayed,
        page: typeof req.query.page === "string" ? req.query.page : undefined,
        targetBooth,
        today,
      }),
      visitor,
    });

    const isAdmin = !!visitor.isAdmin;

    const gameState: GameStateResponseType = {
      visitorData,
      visitorInventory,
      ecosystemMaterials,
      ecosystemToys,
      ecosystemDecorations,
      ecosystemBadges,
      ownsBoothInThisWorld: !!ownedBoothSceneDropId,
      ownedBoothSceneDropId,
      targetBooth,
      availableBoothCount: Object.values(booths).filter(({ ownerId }) => !ownerId).length,
      isAdmin,
      boothsFullAlert: isAdmin ? worldData?.boothsFullAlert || null : null,
      serverTime: Date.now(),
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
