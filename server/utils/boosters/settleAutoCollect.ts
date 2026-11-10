import { VisitorInterface } from "@rtsdk/topia";
import { BoosterActiveStateType, getMaterialCap } from "@shared/constants/index.js";
import {
  Credentials,
  InventoryItemType,
  VisitorDataObjectType,
  VisitorInventoryItemType,
  VisitorInventoryType,
} from "../../types/index.js";
import { awardBonusXp } from "../awardXp.js";
import { claimActionLock } from "../claimActionLock.js";
import { errorHandler } from "../errorHandler.js";
import { modifyVisitorInventoryItem } from "../inventory/modifyVisitorInventoryItem.js";
import { standardizeError } from "../standardizeError.js";

// What the client is told about a settlement (shown as a message; XP and level-ups are already in the inventory)
export type AutoCollectSummaryType = {
  unitsCollected: number;
  xpEarned: number;
  levelsGained: number[];
};

/**
 * Auto-Collector: grants the material units the player's stations "made" while the booster was running.
 * Called from handleGetGameState, so every page load settles it.
 *
 * How units are counted: each unlocked station cycles on its own from the moment the booster was activated. A station's
 * cursor is the time it is settled up to; units = whole cycles between the cursor and now (or the booster's end).
 * Units stop at each material's inventory cap. Collect XP is granted for every unit actually collected.
 *
 * Updates visitorData and visitorInventory IN PLACE, so the caller can send them straight to the client.
 * Returns null when there was nothing to settle (no booster, nothing new, or another request is already settling).
 */
export const settleAutoCollect = async ({
  boothKeyAssetId,
  credentials,
  ecosystemMaterials,
  visitor,
  visitorData,
  visitorInventory,
}: {
  boothKeyAssetId: string;
  credentials: Credentials;
  ecosystemMaterials: { [itemId: string]: InventoryItemType };
  visitor: VisitorInterface;
  visitorData: VisitorDataObjectType;
  visitorInventory: VisitorInventoryType;
}): Promise<AutoCollectSummaryType | null> => {
  try {
    // ----- 1. Is there an Auto-Collector that still has units to settle? -----
    const state = visitorData.activeBoosters?.auto_collect;
    if (!state || state.done) return null;

    const now = Date.now();
    const settleUntil = Math.min(now, state.endsAt); // never count time after the booster ended
    const cursors = { ...(state.cursors ?? {}) };

    // ----- 2. Work out each station's new units and its new cursor -----
    const toGrant: { material: InventoryItemType; quantity: number }[] = [];
    let cursorsMoved = false;

    for (const material of Object.values(ecosystemMaterials)) {
      if (visitorInventory.level < material.unlockLevel || material.spawnIntervalSeconds <= 0) continue;

      const cycleMs = material.spawnIntervalSeconds * 1000;
      const cursor = cursors[material.name] ?? state.startedAt; // a station starts cycling when the booster is activated
      const produced = Math.floor((settleUntil - cursor) / cycleMs);
      if (produced < 1) continue;

      // The cursor moves past every produced unit, even ones lost to the cap, so they are never granted later
      cursors[material.name] = cursor + produced * cycleMs;
      cursorsMoved = true;

      const owned = visitorInventory.materials[material.id]?.quantity ?? 0;
      const space = Math.max(0, getMaterialCap(material.name) - owned);
      const quantity = Math.min(produced, space);
      if (quantity > 0) toGrant.push({ material, quantity });
    }

    // ----- 3. Anything to save? (new units, or the booster just ended and needs closing out) -----
    const hasEnded = now >= state.endsAt;
    if (!cursorsMoved && !hasEnded) return null;

    const newState: BoosterActiveStateType = { ...state, cursors, ...(hasEnded ? { done: true } : {}) };

    // Save the new cursors FIRST under a one-shot lock, so two page loads can't both grant the same units
    const claimed = await claimActionLock({
      action: "settle_auto_collect",
      alsoWrite: { "activeBoosters.auto_collect": newState },
      profileId: credentials.profileId,
      visitor,
      visitorData,
    });
    if (!claimed) return null; // another request is settling right now
    visitorData.activeBoosters.auto_collect = newState;

    if (toGrant.length === 0) return null;

    // ----- 4. Grant the units, one material at a time (they all write the same visitor record) -----
    let unitsCollected = 0;
    let xpEarned = 0;
    for (const { material, quantity } of toGrant) {
      try {
        const item: VisitorInventoryItemType = await modifyVisitorInventoryItem({
          credentials,
          visitor,
          id: material.id,
          quantity,
        });
        visitorInventory.materials[material.id] = item;
        unitsCollected += quantity;
        xpEarned += quantity * material.xpReward;
      } catch (error) {
        errorHandler({ error, functionName: "settleAutoCollect", message: `Error granting ${material.name}` });
      }
    }

    // ----- 5. Collect XP for everything granted (also handles level-ups and the leaderboard) -----
    let levelsGained: number[] = [];
    if (xpEarned > 0) {
      const xpResult = await awardBonusXp({
        amount: xpEarned,
        boothKeyAssetId,
        credentials,
        visitor,
        visitorData,
      });
      if (xpResult) {
        visitorInventory.xp = xpResult.xp;
        visitorInventory.level = xpResult.level;
        if (xpResult.tokens !== null) visitorInventory.coins = xpResult.tokens; // level-up bonus Toy Tokens
        levelsGained = xpResult.levelsGained;
      }
    }

    return { unitsCollected, xpEarned, levelsGained };
  } catch (error) {
    throw standardizeError(error);
  }
};