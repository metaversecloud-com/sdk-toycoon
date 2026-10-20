import { VisitorInterface } from "@rtsdk/topia";
import { Credentials, InventoryItemType, VisitorDataObjectType, VisitorInventoryItemType } from "../../types/index.js";
import { claimActionLock } from "../claimActionLock.js";
import { errorHandler } from "../errorHandler.js";
import { modifyVisitorInventoryItem } from "../inventory/modifyVisitorInventoryItem.js";
import { standardizeError } from "../standardizeError.js";

/**
 * Collects one unit from a bin the caller has already verified is ready and under its cap, and resets it to idle.
 * The reset happens first, under a one-shot action lock (see claimActionLock): a double-click, a second tab, or Collect
 * All racing a single collect can't collect the same unit twice. If granting fails, the bin is put back to ready so the
 * unit isn't lost.
 */
export const collectFromBin = async ({
  credentials,
  generationStartedAt,
  material,
  visitor,
  visitorData,
}: {
  credentials: Credentials;
  generationStartedAt: number;
  material: InventoryItemType;
  visitor: VisitorInterface;
  visitorData: VisitorDataObjectType;
}): Promise<{ status: "collected"; item: VisitorInventoryItemType } | { status: "locked" }> => {
  try {
    const timerPath = `materialGenerationStartedAt.${material.name}`;

    const claimed = await claimActionLock({
      action: `collect_${material.name}`,
      alsoWrite: { [timerPath]: null },
      profileId: credentials.profileId,
      visitor,
      visitorData,
    });
    if (!claimed) return { status: "locked" };

    try {
      const item = await modifyVisitorInventoryItem({ credentials, visitor, id: material.id, quantity: 1 });
      return { status: "collected", item };
    } catch (grantError) {
      await visitor
        .updateDataObject({ [timerPath]: generationStartedAt }, {})
        .catch((error: any) =>
          errorHandler({ error, functionName: "collectFromBin", message: "Error restoring material bin" }),
        );
      throw grantError;
    }
  } catch (error) {
    throw standardizeError(error);
  }
};
