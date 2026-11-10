import { Request, Response } from "express";
import {
  BOOSTERS,
  BoosterActiveStateType,
  BoosterIdType,
  getActiveBooster,
  getBoosterForItem,
} from "@shared/constants/index.js";
import {
  claimActionLock,
  errorHandler,
  getBoothIndex,
  getCredentials,
  getInventoryItems,
  initializeVisitorData,
  modifyVisitorInventoryItem,
  requireBoothInWorld,
} from "@utils/index.js";

/**
 * Activates ONE booster the player owns ({ boosterId }): uses it up and starts its timer.
 * The timer is written under a one-shot lock, so a double-click can't use up two boosters.
 * Requires a booth in this world (Auto-Collector only pays out for players with a booth).
 */
export const handleActivateBooster = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    // ----- 1. Check the request -----
    const booster = BOOSTERS[req.body?.boosterId as BoosterIdType];
    if (!booster) throw "Valid boosterId is required";

    const [{ ecosystemBoosters }, { visitor, visitorData, visitorInventory }, { booths }] = await Promise.all([
      getInventoryItems(credentials),
      initializeVisitorData(credentials),
      getBoothIndex(credentials),
    ]);
    await requireBoothInWorld(credentials, visitorData, "activating boosters", booths);

    const item = Object.values(ecosystemBoosters).find((candidate) => getBoosterForItem(candidate)?.id === booster.id);
    if (!item) throw `${booster.displayName} isn't set up in the ecosystem yet.`;

    const now = Date.now();
    if (visitorInventory.level < booster.unlockLevel) throw `${booster.displayName} unlocks at level ${booster.unlockLevel}.`;

    // Still running? (checked BEFORE the settling check so the player gets the right message)
    if (getActiveBooster(visitorData.activeBoosters, booster.id, now)) throw `${booster.displayName} is already running.`;

    // The previous Auto-Collector must be fully settled first (any page load settles it)
    const previousAuto = visitorData.activeBoosters?.auto_collect;
    if (booster.id === "auto_collect" && previousAuto && !previousAuto.done) {
      throw "Your last Auto-Collector is still settling. Reload the page and try again.";
    }

    if ((visitorInventory.boosters[item.id]?.quantity ?? 0) < 1) throw `You don't have a ${booster.displayName}. Buy one first.`;

    // ----- 2. Start the timer under a one-shot lock -----
    const activePath = `activeBoosters.${booster.id}`;
    const state: BoosterActiveStateType = {
      startedAt: now,
      endsAt: now + booster.durationSeconds * 1000,
      ...(booster.maxUses ? { usesLeft: booster.maxUses } : {}), // Instant Craft
      ...(booster.id === "auto_collect" ? { cursors: {}, done: false } : {}), // Auto-Collector: fresh settle state
    };
    const claimed = await claimActionLock({
      action: `activate_${booster.id}`,
      alsoWrite: { [activePath]: state },
      profileId,
      visitor,
      visitorData,
    });
    if (!claimed) return res.status(409).json({ success: false, message: "Already activating — try again in a moment." });

    // ----- 3. Use up the booster; undo the timer if that fails -----
    let boosterItem;
    try {
      boosterItem = await modifyVisitorInventoryItem({ credentials, visitor, id: item.id, quantity: -1 });
    } catch (useError) {
      await visitor
        .updateDataObject({ [activePath]: null }, {})
        .catch((error: any) => errorHandler({ error, functionName: "handleActivateBooster", message: "Error clearing timer" }));
      throw useError;
    }

    // ----- 4. Analytics (best effort: the booster is already active) -----
    visitor
      .updateDataObject(
        {},
        {
          analytics: [
            { analyticName: "toycoon_booster_activated", profileId, urlSlug, uniqueKey: `${profileId}_${booster.id}` },
          ],
        },
      )
      .catch((error: any) =>
        errorHandler({ error, functionName: "handleActivateBooster", message: "Error tracking analytics" }),
      );

    return res.json({ success: true, boosterId: booster.id, state, booster: boosterItem });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleActivateBooster",
      message: "Error activating booster",
      req,
      res,
    });
  }
};