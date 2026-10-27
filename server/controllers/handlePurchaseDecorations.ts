import { Request, Response } from "express";
import { AxiosError } from "axios";
import { getDecorPrice, getDecorSlotType } from "@shared/constants/index.js";
import {
  claimActionLock,
  errorHandler,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  modifyVisitorInventoryItem,
} from "@utils/index.js";
import { CURRENCY_ITEM_NAME } from "../constants.js";

/**
 * Buys one decoration ({ decorationId }) at the Decorations shop for its cost in Toy Tokens: rugs, awnings, lights, and every
 * toy (Rocking Horse, both Teddy Bears, both Trains). Players can own several copies, e.g. to show two White Teddy
 * Bears.
 * Toys bought here are display pieces: they're counted on the player's data object (decorToys), not added to the
 * Topia inventory, so they never show up at the Cashier. Crafted toys are the ones that are sold.
 */
export const handlePurchaseDecoration = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;
    const { decorationId } = req.body || {};
    if (!decorationId) throw "Valid decorationId is required";

    const [{ ecosystemDecorations, ecosystemToys }, { visitor, visitorData, visitorInventory }] = await Promise.all([
      getInventoryItems(credentials),
      initializeVisitorData(credentials),
    ]);
    const item = ecosystemDecorations[decorationId] ?? ecosystemToys[decorationId];
    if (!item || !getDecorSlotType(item)) throw "That isn't sold at Decorations.";

    const price = getDecorPrice(item);
    const trackPurchase = () =>
      visitor
        .updateDataObject(
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
        )
        .catch((error: AxiosError) =>
          errorHandler({ error, functionName: "handlePurchaseDecoration", message: "Error tracking analytics" }),
        );
    if (visitorInventory.level < item.unlockLevel) throw `${item.displayName} unlocks at level ${item.unlockLevel}.`;
    if (visitorInventory.coins < price) throw `You need ${price - visitorInventory.coins} more Toy Tokens.`;

    const isDecorToy = item.type === "toy";
    const decorToyPath = `decorToys.${decorationId}`;
    const decorToysBefore = visitorData.decorToys?.[decorationId] ?? 0;

    // One purchase at a time, so a double-tap can't spend twice. A decor toy's new count is written with the lock.
    const claimed = await claimActionLock({
      action: "buy",
      alsoWrite: isDecorToy ? { [decorToyPath]: decorToysBefore + 1 } : {},
      profileId,
      visitor,
      visitorData,
    });
    if (!claimed) {
      return res.status(409).json({ success: false, message: "Already buying — try again in a moment." });
    }

    if (isDecorToy) {
      let coinsAfter;
      try {
        coinsAfter = await modifyVisitorInventoryItem({
          credentials,
          visitor,
          name: CURRENCY_ITEM_NAME,
          quantity: -price,
        });
      } catch (payError) {
        // Not paid, so take the copy back
        await visitor
          .updateDataObject({ [decorToyPath]: decorToysBefore }, {})
          .catch((error: any) =>
            errorHandler({ error, functionName: "handlePurchaseDecoration", message: "Error undoing decor toy" }),
          );
        throw payError;
      }
      trackPurchase();
      return res.json({
        success: true,
        decorToy: { itemId: decorationId, quantity: decorToysBefore + 1 },
        coins: coinsAfter.quantity,
        price,
      });
    }

    const coinsItem = await modifyVisitorInventoryItem({
      credentials,
      visitor,
      name: CURRENCY_ITEM_NAME,
      quantity: -price,
    });

    let boughtItem;
    try {
      boughtItem = await modifyVisitorInventoryItem({ credentials, visitor, id: decorationId, quantity: 1 });
    } catch (grantError) {
      await modifyVisitorInventoryItem({ credentials, visitor, name: CURRENCY_ITEM_NAME, quantity: price }).catch(
        (error) =>
          errorHandler({ error, functionName: "handlePurchaseDecoration", message: "Error refunding Toy Tokens" }),
      );
      throw grantError;
    }

    trackPurchase();
    return res.json({ success: true, item: boughtItem, coins: coinsItem.quantity, price });
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
