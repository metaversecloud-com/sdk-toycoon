import { Request, Response } from "express";
import { errorHandler, getBaseUrl, getCredentials, getVisitor, teleportVisitorToAsset, World } from "@utils/index.js";
import { STATIONS, StationType } from "../constants.js";

/**
 * Sends the visitor to one of the Main Scene's stations (Materials Box, Toy Assembly, Cashier, Shop) and opens that
 * station's page, so each step on the Start Here sign can take players straight to where they do it
 */
export const handleTeleportToStation = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    const station = STATIONS[req.params.station as StationType];
    if (!station) throw "Unknown station";

    const world = World.create(urlSlug, { credentials });
    // The station's asset under the first of its unique names that's in this world
    const findStationAsset = async () => {
      for (const uniqueName of station.uniqueNames) {
        const [asset] = await world.fetchDroppedAssetsWithUniqueName({ uniqueName });
        if (asset) return asset;
      }
      return undefined;
    };
    const [{ visitor }, stationAsset] = await Promise.all([getVisitor(credentials), findStationAsset()]);

    if (!stationAsset) throw `No "${station.uniqueNames.join('" or "')}" asset found in this world.`;

    await teleportVisitorToAsset({
      baseUrl: getBaseUrl(req.hostname),
      credentials,
      droppedAsset: stationAsset,
      path: station.path,
      title: station.title,
      visitor,
    });

    visitor
      .updateDataObject(
        {},
        { analytics: [{ analyticName: `teleport-${req.params.station}`, profileId, urlSlug, uniqueKey: profileId }] },
      )
      .catch((error: any) =>
        errorHandler({ error, functionName: "handleTeleportToStation", message: "Error tracking teleport analytics" }),
      );

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTeleportToStation",
      message: "Error teleporting to station",
      req,
      res,
    });
  }
};
