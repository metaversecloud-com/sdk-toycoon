import { DroppedAssetInterface } from "@rtsdk/topia";
import { Credentials } from "../../types/index.js";
import { BoothDataObjectType } from "@shared/types/BoothTypes.js";
import { VisitorDataObjectType } from "@shared/types/VisitorData.js";
import { standardizeError } from "../standardizeError.js";
import { User } from "../topiaInit.js";

/**
 * Releases a booth back to unclaimed without touching the previous owner's persistent inventory.
 * - Owner record: drops this world's boothIds entry and un-places this world's decor (placedDecorations[urlSlug]).
 *   unlockedDecor, coins, xp, level, badges, etc. are never modified — decor is owned globally and permanently.
 * - Booth: owner metadata reset. claimCount is intentionally preserved; it versions the claim lock, and resetting it
 *   would make a future claim reuse a lock id that's still held from an earlier claim.
 *
 * The owner record is cleaned up first so a failure leaves the booth still owned and the clear can simply be retried.
 */
export const clearBooth = async ({
  boothAsset,
  boothData,
  credentials,
  world,
}: {
  boothAsset: DroppedAssetInterface;
  boothData: BoothDataObjectType;
  credentials: Credentials;
  world: any;
}): Promise<{ previousOwnerId: string | null }> => {
  try {
    const { profileId, urlSlug } = credentials;
    const { ownerId: previousOwnerId, sceneDropId } = boothData;

    if (previousOwnerId) {
      const owner = await User.create({ credentials: { ...credentials, profileId: previousOwnerId } });
      const ownerData = (await owner.fetchDataObject()) as VisitorDataObjectType | null;
      const recordedBoothId = ownerData?.boothIds?.[urlSlug];

      // Skip if the owner's record points at a different booth in this world — that data isn't ours to clear
      if (ownerData && (!recordedBoothId || recordedBoothId === sceneDropId)) {
        const { [urlSlug]: _removedBooth, ...boothIds } = ownerData.boothIds || {};
        const update: Partial<VisitorDataObjectType> = { boothIds };

        if (ownerData.placedDecorations?.[urlSlug]) {
          const { [urlSlug]: _removedDecor, ...placedDecorations } = ownerData.placedDecorations;
          update.placedDecorations = placedDecorations;
        }

        await owner.updateDataObject(update, {});
      }
    }

    // TODO (coordinate with Angel): reset this booth scene's decor anchors to their default images once
    // handlePlaceDecoration's anchor-swap pipeline exists, so released booths don't keep the old owner's decor

    await boothAsset.updateDataObject(
      {
        ownerId: null,
        ownerDisplayName: null,
        claimDate: null,
        level: 1,
        badges: [],
        lastInteractionTimestamp: 0,
      },
      { analytics: [{ analyticName: "boothsCleared", profileId, urlSlug, uniqueKey: sceneDropId }] },
    );

    await world.updateDataObject({ [`booths.${sceneDropId}.ownerId`]: null });

    return { previousOwnerId };
  } catch (error) {
    throw standardizeError(error);
  }
};
