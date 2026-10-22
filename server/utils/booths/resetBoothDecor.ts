// server/utils/booths/resetBoothDecor.ts
import { DECOR_SLOTS } from "@shared/constants/index.js";

// What an empty decor slot shows. "" assumes a blank slot hides the layer; confirm with Lina, and if the anchors
// have placeholder art, put that image URL here instead.
const EMPTY_DECOR_IMAGE = "";

/**
 * Best-effort: puts every decor anchor in a booth scene back to its empty image. Failures are logged, not thrown,
 * so a missing anchor never blocks clearing the booth.
 */
export const resetBoothDecor = async ({ sceneDropId, world }: { sceneDropId: string; world: any }) => {
  const results = await Promise.allSettled(
    DECOR_SLOTS.map(async ({ anchorUniqueName }) => {
      const anchors = await world.fetchDroppedAssetsBySceneDropId({ sceneDropId, uniqueName: anchorUniqueName });
      await Promise.all((anchors ?? []).map((anchor: any) => anchor.updateWebImageLayers("", EMPTY_DECOR_IMAGE)));
    }),
  );
  results.forEach((result, i) => {
    if (result.status === "rejected") console.error(`Couldn't reset ${DECOR_SLOTS[i].id} in ${sceneDropId}`, result.reason);
  });
};