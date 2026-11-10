import { Request, Response } from "express";
import { BOOSTERS, getActiveBooster, getBackdatedStart } from "@shared/constants/index.js";
import { errorHandler, getCredentials, getMaterialBin } from "@utils/index.js";

/**
 * Step 1 of 2: starts an idle material bin. The server records when it started; after the material's
 * spawnIntervalSeconds the bin is ready to collect (see getMaterialBinState). Bins never start on their own.
 * While a Speed-Up booster is active, the start time is moved back so the wait is shorter (collect XP is unchanged).
 */
export const handleStartMaterial = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { material, state, visitor, visitorData } = await getMaterialBin(credentials, req.body?.materialId);

    if (state === "generating") throw `${material.displayName} is already being made.`;
    if (state === "ready") throw `${material.displayName} is ready — collect it first.`;

    // ----- Speed-Up booster: back-date the start so the wait is shorter -----
    const now = Date.now();
    const speedUp = getActiveBooster(visitorData.activeBoosters, "material_speed", now);
    const multiplier = speedUp ? (BOOSTERS.material_speed.timeMultiplier ?? 1) : 1;
    const generationStartedAt = getBackdatedStart(now, material.spawnIntervalSeconds, multiplier);

    // Dot-path so other materials' bins are untouched
    await visitor.updateDataObject({ [`materialGenerationStartedAt.${material.name}`]: generationStartedAt }, {});

    return res.json({ success: true, materialName: material.name, generationStartedAt, boosted: !!speedUp });
  } catch (error) {
    return errorHandler({ error, functionName: "handleStartMaterial", message: "Error starting material", req, res });
  }
};