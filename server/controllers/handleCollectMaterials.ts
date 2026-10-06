// server/controllers/handleCollectMaterial.ts
export const handleCollectMaterial = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { materialId } = req.body;
    if (!materialId) throw "Valid materialId is required";

    const { ecosystemMaterials } = await getInventoryItems(credentials);
    const material = ecosystemMaterials[materialId];
    if (!material) throw "Invalid material";

    const { visitor, visitorData, visitorInventory } = await initializeVisitorData(credentials);
    if (visitorInventory.level < material.unlockLevel) throw "Material not unlocked yet.";

    const now = Date.now();
    const last = visitorData.materialCollectedAt[material.name];
    const available = getAvailableMaterial(last, material.spawnIntervalSeconds, MATERIAL_BIN_CAP, now);
    if (available < 1) throw "Nothing to collect yet.";

    // Keep partial progress unless the bin was full (then the timer restarts)
    const intervalMs = material.spawnIntervalSeconds * 1000;
    const newTimestamp = last === undefined || available >= MATERIAL_BIN_CAP ? now : last + available * intervalMs;

    // Save the timestamp first so a double-click can't collect twice
    await visitor.updateDataObject(
      { materialCollectedAt: { [material.name]: newTimestamp } },
      { lock: { lockId: `collect_${material.name}_${now}`, releaseLock: true } },
    );

    const response = await modifyVisitorInventoryItem({ credentials, visitor, id: materialId, quantity: available });

    return res.json({ success: true, collected: available, quantity: response.quantity, collectedAt: newTimestamp });
  } catch (error) {
    return errorHandler({ error, functionName: "handleCollectMaterial", message: "Error collecting material", req, res });
  }
};