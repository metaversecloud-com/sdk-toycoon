import { Request, Response } from "express";
import {
  claimBooth,
  errorHandler,
  getBoothIndex,
  getCredentials,
  getOwnedBoothSceneDropId,
  getVisitor,
} from "@utils/index.js";
import { ClaimBoothResponseType } from "@shared/types/BoothTypes.js";
import { MAX_CLAIM_ATTEMPTS } from "../constants.js";

/**
 * Assigns the visitor an open booth in this world (one booth per visitor per world).
 * - Visitor already owns a booth here → returns it so the client can teleport them straight there
 * - No open booths → flags an alert for admins on the World data object
 */
export const handleClaimBooth = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    const [{ visitor, visitorData }, { booths, world, worldData }] = await Promise.all([
      getVisitor(credentials),
      getBoothIndex(credentials),
    ]);

    const existingBoothSceneDropId = getOwnedBoothSceneDropId({ booths, profileId, urlSlug, visitorData });
    if (existingBoothSceneDropId) {
      const response: ClaimBoothResponseType = {
        result: "alreadyOwned",
        ownedBoothSceneDropId: existingBoothSceneDropId,
      };
      return res.json({ ...response, success: true });
    }

    // Random order so simultaneous claimers spread across booths instead of colliding on the same one
    const openBoothIds = Object.keys(booths).filter((id) => !booths[id].ownerId);
    for (let i = openBoothIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [openBoothIds[i], openBoothIds[j]] = [openBoothIds[j], openBoothIds[i]];
    }

    let claimedBoothSceneDropId: string | null = null;
    let lockedAttempts = 0;

    for (const sceneDropId of openBoothIds) {
      const { keyAssetId } = booths[sceneDropId];
      const claim = await claimBooth({
        credentials,
        keyAssetId,
        sceneDropId,
        level: visitorData.level || 1,
        badges: visitorData.badges || [],
      });

      if (claim.status === "claimed") {
        claimedBoothSceneDropId = sceneDropId;
        break;
      }

      if (claim.status === "taken") {
        // Index was stale; correct it so the next visitor doesn't try this booth
        await world.updateDataObject({ [`booths.${sceneDropId}.ownerId`]: claim.ownerId });
        continue;
      }

      lockedAttempts++;
      if (lockedAttempts >= MAX_CLAIM_ATTEMPTS) break;
    }

    if (claimedBoothSceneDropId) {
      await Promise.all([
        world.updateDataObject({ [`booths.${claimedBoothSceneDropId}.ownerId`]: profileId }),
        visitor.updateDataObject({ boothIds: { ...visitorData.boothIds, [urlSlug]: claimedBoothSceneDropId } }, {}),
      ]);

      const response: ClaimBoothResponseType = { result: "claimed", ownedBoothSceneDropId: claimedBoothSceneDropId };
      return res.json({ ...response, success: true });
    }

    if (lockedAttempts > 0) {
      return res.status(409).json({
        success: false,
        message: "Booths are being claimed right now. Please try again.",
      });
    }

    // TODO: delivery mechanism for this alert is still TBD with the team — for now it's a flag shown in the admin view
    await world
      .updateDataObject(
        {
          boothsFullAlert: {
            lastTriggeredAt: Date.now(),
            turnedAwayCount: (worldData?.boothsFullAlert?.turnedAwayCount || 0) + 1,
          },
        },
        { analytics: [{ analyticName: "boothClaimsTurnedAway", profileId, urlSlug, uniqueKey: profileId }] },
      )
      .catch((error: any) =>
        errorHandler({
          error,
          functionName: "handleClaimBooth",
          message: "Error flagging all-booths-taken alert",
        }),
      );

    const response: ClaimBoothResponseType = { result: "allBoothsTaken", ownedBoothSceneDropId: null };
    return res.json({ ...response, success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleClaimBooth",
      message: "Error claiming booth",
      req,
      res,
    });
  }
};
