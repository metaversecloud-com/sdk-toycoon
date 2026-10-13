import { Request, Response } from "express";
import { errorHandler, getCredentials, getMaterialBin } from "@utils/index.js";

/**
 * Step 1 of 2: starts an idle material bin. The server records when it started; after the material's
 * spawnIntervalSeconds the bin is ready to collect (see getMaterialBinState). Bins never start on their own.
 */
export const handleStartMaterial = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { material, state, visitor } = await getMaterialBin(credentials, req.body?.materialId);

    if (state === "generating") throw `${material.displayName} is already being made.`;
    if (state === "ready") throw `${material.displayName} is ready — collect it first.`;

    const generationStartedAt = Date.now();
    // Dot-path so other materials' bins are untouched
    await visitor.updateDataObject({ [`materialGenerationStartedAt.${material.name}`]: generationStartedAt }, {});

    return res.json({ success: true, materialName: material.name, generationStartedAt });
  } catch (error) {
    return errorHandler({ error, functionName: "handleStartMaterial", message: "Error starting material", req, res });
  }
};
