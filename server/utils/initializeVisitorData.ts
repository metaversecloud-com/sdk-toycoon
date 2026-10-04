import { DroppedAsset, Visitor } from "./topiaInit.js";
import { Credentials, PlotAssetDataObjectType, VisitorDataObjectType } from "../types/index.js";
import { DEFAULT_VISITOR_DATA, DEFAULT_VISITOR_WORLD_DATA } from "../constants.js";
import { VisitorInterface } from "@rtsdk/topia";
import { standardizeError } from "./standardizeError.js";
import { getVisitorInventory } from "./inventory/getVisitorInventory.js";

/**
 * Initialize visitor data object with default values if it doesn't exist or is missing properties
 */
export const initializeVisitorData = async (credentials: Credentials) => {
  try {
    const { assetId, profileId, urlSlug, visitorId } = credentials;

    const visitor = (await Visitor.create(visitorId, urlSlug, { credentials })) as VisitorInterface;
    let visitorData = (await visitor.fetchDataObject()) as VisitorDataObjectType;
    let shouldUpdate = false;
    const now = Date.now();
    const lockId = `visitor_data_init_${Math.floor(now / 60000) * 60000}`;

    // Sentinel check: first-time visitor
    if (visitorData.totalCoinsEarned === undefined) {
      visitorData = {
        ...DEFAULT_VISITOR_DATA,
        worlds: { [urlSlug]: { ...DEFAULT_VISITOR_WORLD_DATA } },
      };
      await visitor.setDataObject(visitorData, { lock: { lockId, releaseLock: true } });
    }

    if (!visitorData.placedDecorations) {
      shouldUpdate = true;
      visitorData.placedDecorations = {};
    }
    if (!visitorData.worlds) {
      shouldUpdate = true;
      visitorData.worlds = {};
    }

    const world = visitorData.worlds[urlSlug];
    if (!world) {
      shouldUpdate = true;
      visitorData.worlds[urlSlug] = { ...DEFAULT_VISITOR_WORLD_DATA };
    } else if (world.boothAssetId && world.boothAssetId !== assetId) {
      // Verify the claimed booth still exists and is still theirs
      let stillValid = false;
      try {
        const booth = await DroppedAsset.get(world.boothAssetId, urlSlug, {
          credentials: { ...credentials, assetId: world.boothAssetId },
        });
        const boothData = (await booth.fetchDataObject()) as BoothAssetDataObjectType;
        stillValid = boothData.ownerId === profileId;
      } catch {
        console.error("Visitor booth asset no longer in world");
      }
      if (!stillValid) {
        shouldUpdate = true; // <-- missing in original
        visitorData.worlds[urlSlug] = { ...DEFAULT_VISITOR_WORLD_DATA };
        // free up this world's placements so availableQuantity is correct
        for (const slot in visitorData.placedDecorations) {
          delete visitorData.placedDecorations[slot][urlSlug];
          if (!Object.keys(visitorData.placedDecorations[slot]).length) {
            delete visitorData.placedDecorations[slot];
          }
        }
      }
    }

    // Track activity for the inactive-booth admin clear (throttled to ~hourly)
    const w = visitorData.worlds[urlSlug];
    if (w.boothAssetId && now - (w.lastActiveAt ?? 0) > 60 * 60 * 1000) {
      shouldUpdate = true;
      w.lastActiveAt = now;
    }

    if (shouldUpdate) {
      await visitor.updateDataObject(visitorData, { lock: { lockId, releaseLock: true } });
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
      item.availableQuantity = (item.quantity || 0) - placedCount;
    }

    return { visitor, visitorData, visitorInventory };
  } catch (error: any) {
    throw standardizeError(error);
  }
};