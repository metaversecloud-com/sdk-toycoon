import { Visitor } from "./topiaInit.js";
import { Credentials, VisitorDataObjectType } from "../types/index.js";
import { DEFAULT_VISITOR_DATA } from "../constants.js";
import { VisitorInterface } from "@rtsdk/topia";
import { standardizeError } from "./standardizeError.js";
import { getVisitorInventory } from "./inventory/getVisitorInventory.js";

export const initializeVisitorData = async (credentials: Credentials) => {
  try {
    const { visitorId, urlSlug } = credentials;

    const visitor = (await Visitor.create(visitorId, urlSlug, { credentials })) as VisitorInterface;
    let visitorData = ((await visitor.fetchDataObject()) ?? {}) as VisitorDataObjectType;
    const lockId = `visitor_data_init_${Math.floor(Date.now() / 60000) * 60000}`;

    if (visitorData.totalCoinsEarned === undefined) {
      // Merge so booth data written before first init (boothIds etc.) isn't wiped
      visitorData = { ...structuredClone(DEFAULT_VISITOR_DATA), ...visitorData } as VisitorDataObjectType;
      await visitor.setDataObject(visitorData, { lock: { lockId, releaseLock: true } });
    } else {
      // Backfill fields added after a visitor was first created
      const patch: Partial<VisitorDataObjectType> = {};
      if (!visitorData.placedDecorations) patch.placedDecorations = visitorData.placedDecorations = {};
      if (!visitorData.materialCollectedAt) patch.materialCollectedAt = visitorData.materialCollectedAt = {};
      if (!visitorData.badges) patch.badges = visitorData.badges = [];
      if (Object.keys(patch).length) {
        await visitor.updateDataObject(patch, { lock: { lockId, releaseLock: true } });
      }
    }

    const visitorInventory = await getVisitorInventory(credentials);

    // availableQuantity = owned - placed (across all worlds)
    for (const id in visitorInventory.decorations) {
      const item = visitorInventory.decorations[id];
      let placedCount = 0;
      for (const slot in visitorData.placedDecorations) {
        for (const worldSlug in visitorData.placedDecorations[slot]) {
          if (visitorData.placedDecorations[slot][worldSlug] === item.name) placedCount++;
        }
      }
      item.availableQuantity = Math.max(0, (item.quantity || 0) - placedCount);
    }

    return { visitor, visitorData, visitorInventory };
  } catch (error: any) {
    throw standardizeError(error);
  }
};