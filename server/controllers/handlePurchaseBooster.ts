import { Request, Response } from "express";
import { AxiosError } from "axios";
import { BOOSTERS, BoosterIdType, getBoosterForItem } from "@shared/constants/index.js";
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
 * Buys ONE booster ({ boosterId }) with Toy Tokens. It goes into the player's inventory; it does nothing until the
 * player activates it (POST /activate-booster). Price and level come from BOOSTERS in economy.ts.
 */
export const handlePurchaseBooster = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    // ----- 1. Check the request -----
    const booster = BOOSTERS[req.body?.boosterId as BoosterIdType];
    if (!booster) throw "Valid boosterId is required";

    const { ecosystemBoosters } = await getInventoryItems(credentials);
    const item = Object.values(ecosystemBoosters).find((candidate) => getBoosterForItem(candidate)?.id === booster.id);
    if (!item) throw `${booster.displayName} isn't set up in the ecosystem yet.`;

    const { visitor, visitorData, visitorInventory } = await initializeVisitorData(credentials);
    if (visitorInventory.level < booster.unlockLevel) throw `${booster.displayName} unlocks at level ${booster.unlockLevel}.`;
    if (visitorInventory.coins < booster.cost) throw "Not enough Toy Tokens.";

    // One purchase at a time, so a double-tap can't buy (and charge for) two
    const claimed = await claimActionLock({ action: "buy_booster", profileId, visitor, visitorData });
    if (!claimed) return res.status(409).json({ success: false, message: "Already buying — try again in a moment." });

    // ----- 2. Take the Toy Tokens -----
    const tokens = await modifyVisitorInventoryItem({
      credentials,
      visitor,
      name: CURRENCY_ITEM_NAME,
      quantity: -booster.cost,
    });

    // ----- 3. Give the booster; refund the Toy Tokens if that fails -----
    let boosterItem;
    try {
      boosterItem = await modifyVisitorInventoryItem({ credentials, visitor, id: item.id, quantity: 1 });
    } catch (grantError) {
      await modifyVisitorInventoryItem({ credentials, visitor, name: CURRENCY_ITEM_NAME, quantity: booster.cost }).catch(
        (error) => errorHandler({ error, functionName: "handlePurchaseBooster", message: "Error refunding Toy Tokens" }),
      );
      throw grantError;
    }

    // ----- 4. Analytics and toast (best effort) -----
    visitor
      .updateDataObject(
        {},
        {
          analytics: [
            { analyticName: "toycoon_booster_purchased", profileId, urlSlug, uniqueKey: `${profileId}_${booster.id}` },
          ],
        },
      )
      .catch((error: AxiosError) =>
        errorHandler({ error, functionName: "handlePurchaseBooster", message: "Error tracking analytics" }),
      );

    return res.json({ success: true, tokens: tokens.quantity, booster: boosterItem });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handlePurchaseBooster",
      message: "Error purchasing booster",
      req,
      res,
    });
  }
};