import { Request, Response } from "express";
import { collectFromBin, errorHandler, getCredentials, getMaterialBin } from "@utils/index.js";

/**
 * Step 2 of 2: collects one unit from a ready bin (server-validated timer) and resets the bin to idle.
 * Blocked once the visitor is at the material's inventory cap.
 */
export const handleCollectMaterial = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { generationStartedAt, material, state, visitor, visitorData } = await getMaterialBin(
      credentials,
      req.body?.materialId,
    );

    if (state === "idle") throw `Start ${material.displayName} first.`;
    if (state === "generating") throw `${material.displayName} isn't ready yet.`;

    const result = await collectFromBin({
      credentials,
      generationStartedAt: generationStartedAt!,
      material,
      visitor,
      visitorData,
    });
    if (result.status === "locked") {
      return res.status(409).json({ success: false, message: "Already collecting — try again in a moment." });
    }

    return res.json({ success: true, materialName: material.name, item: result.item });
  } catch (error) {
    return errorHandler({ error, functionName: "handleCollectMaterial", message: "Error collecting material", req, res });
  }
};
