import { BoothOwnerStatsType } from "@shared/types/BoothTypes.js";
import { VisitorDataObjectType } from "@shared/types/VisitorData.js";
import { XP_ITEM_NAME } from "../../constants.js";
import { Credentials } from "../../types/index.js";
import { errorHandler } from "../errorHandler.js";
import { User } from "../topiaInit.js";

/**
 * The lifetime stats visitors see on someone else's booth. Counts live on the owner's data object and XP in their
 * inventory (separate Topia calls). Best-effort: a stat that can't be read comes back null and the booth still opens.
 */
export const getBoothOwnerStats = async (credentials: Credentials, ownerId: string): Promise<BoothOwnerStatsType> => {
  // profileId must be top-level: the SDK's data-object methods read it from there, not from credentials
  const owner = User.create({ profileId: ownerId, credentials: { ...credentials, profileId: ownerId } });

  const [ownerData, totalXp] = await Promise.all([
    owner
      .fetchDataObject()
      .then((data) => data as VisitorDataObjectType | null)
      .catch((error: any) => {
        errorHandler({ error, functionName: "getBoothOwnerStats", message: "Error getting booth owner's toy counts" });
        return null;
      }),
    owner
      .fetchInventoryItems()
      .then(() => owner.inventoryItems.find(({ item, name }) => (item?.name || name) === XP_ITEM_NAME)?.quantity || 0)
      .catch((error: any) => {
        errorHandler({ error, functionName: "getBoothOwnerStats", message: "Error getting booth owner's XP" });
        return null;
      }),
  ]);

  return {
    totalToysCrafted: ownerData ? ownerData.totalToysCrafted || 0 : null,
    totalToysSold: ownerData ? ownerData.totalToysSold || 0 : null,
    totalXp,
  };
};
