import { VisitorInterface } from "@rtsdk/topia";
import { Credentials, InventoryItemType, VisitorInventoryItemType } from "../../types/index.js";
import { errorHandler } from "../errorHandler.js";
import { modifyVisitorInventoryItem } from "../inventory/modifyVisitorInventoryItem.js";
import { standardizeError } from "../standardizeError.js";

/**
 * Collects one unit from a bin the caller has already verified is ready and under its cap, and resets it to idle.
 * The reset happens first, under a lock versioned by the bin's start time and never released: a double-click (or
 * two tabs, or Collect All racing a single collect) reads the same start time, so the second request can't collect
 * the same unit twice. If granting fails, the bin is put back to ready so the unit isn't lost.
 */
export const collectFromBin = async ({
  credentials,
  generationStartedAt,
  material,
  visitor,
}: {
  credentials: Credentials;
  generationStartedAt: number;
  material: InventoryItemType;
  visitor: VisitorInterface;
}): Promise<{ status: "collected"; item: VisitorInventoryItemType } | { status: "locked" }> => {
  try {
    const timerPath = `materialGenerationStartedAt.${material.name}`;

    try {
      await visitor.updateDataObject(
        { [timerPath]: null },
        {
          lock: {
            lockId: `collect_${credentials.profileId}_${material.name}_${generationStartedAt}`,
            releaseLock: false,
          },
        },
      );
    } catch {
      return { status: "locked" };
    }

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
