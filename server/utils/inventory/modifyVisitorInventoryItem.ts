import { VisitorInterface } from "@rtsdk/topia";
import { Credentials, VisitorInventoryItemType } from "../../types/index.js";
import { standardizeError } from "../standardizeError.js";
import { getInventoryItem } from "./inventoryCache.js";
import { structureVisitorInventoryItem } from "./structureVisitorInventoryItem.js";

/**
 * Adds (positive) or removes (negative) quantity of an ecosystem item for the visitor.
 * Passing the ecosystem item lets the SDK upsert: it grants the item if the visitor doesn't own it yet.
 */
export const modifyVisitorInventoryItem = async ({
  credentials,
  id,
  name,
  quantity,
  visitor,
}: {
  credentials: Credentials;
  id?: string;
  name?: string;
  quantity: number;
  visitor: VisitorInterface;
}): Promise<VisitorInventoryItemType> => {
  try {
    const inventoryItem = await getInventoryItem(credentials, { id, name });
    const visitorItem = await visitor.modifyInventoryItemQuantity(inventoryItem, quantity);
    return await structureVisitorInventoryItem(visitorItem, credentials);
  } catch (error) {
    throw standardizeError(error);
  }
};
