import { Request, Response } from "express";
import { AxiosError } from "axios";
import {
  errorHandler,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  modifyVisitorInventoryItem,
} from "@utils/index.js";
import { COINS_ITEM_NAME } from "../constants.js";

export const handlePurchaseDecoration = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;
    const { decorationId } = req.body;

    if (!decorationId) throw "Valid decorationId is required";

    const { ecosystemDecorations } = await getInventoryItems(credentials);
    const decorationConfig = ecosystemDecorations[decorationId];
    if (!decorationConfig) throw "Invalid decoration type";

    const { visitor, visitorInventory } = await initializeVisitorData(credentials);

    if (visitorInventory.level < decorationConfig.unlockLevel) throw "You haven't unlocked this decoration yet.";
    if ((visitorInventory.decorations[decorationId]?.availableQuantity || 0) > 0)
      throw "You already own an unplaced copy of this decoration.";
    if (visitorInventory.coins < decorationConfig.cost) throw "Not enough coins.";

    // 1. Deduct coins
    const coinsResponse = await modifyVisitorInventoryItem({
      credentials,
      visitor,
      name: COINS_ITEM_NAME,
      quantity: -decorationConfig.cost,
    });
    visitorInventory.coins = coinsResponse.quantity;

    // 2. Grant the item; refund if it fails
    let itemResponse;
    try {
      itemResponse = await modifyVisitorInventoryItem({ credentials, visitor, id: decorationId, quantity: 1 });
    } catch (grantError) {
      const refund = await modifyVisitorInventoryItem({
        credentials,
        visitor,
        name: COINS_ITEM_NAME,
        quantity: decorationConfig.cost,
      });
      visitorInventory.coins = refund.quantity;
      throw grantError;
    }

    // itemResponse is the fully structured item with its new total quantity; one more copy is now available to place
    const existing = visitorInventory.decorations[decorationId];
    visitorInventory.decorations[decorationId] = {
      ...itemResponse,
      availableQuantity: (existing?.availableQuantity || 0) + 1,
    };

    await visitor.updateDataObject(
      {},
      {
        analytics: [
          {
            analyticName: "toycoon_decor_purchased",
            profileId,
            urlSlug,
            uniqueKey: `${profileId}_${decorationId}`,
          },
        ],
      },
    );

    await visitor
      .fireToast({
        groupId: "handlePurchaseDecoration",
        title: "You purchased a new decoration!",
        text: `You can now place ${decorationConfig.displayName} in your booth.`,
      })
      .catch((error: AxiosError) =>
        errorHandler({ error, functionName: "handlePurchaseDecoration", message: "Error firing toast" }),
      );

    return res.json({ success: true, visitorInventory });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handlePurchaseDecoration",
      message: "Error purchasing decoration",
      req,
      res,
    });
  }
};