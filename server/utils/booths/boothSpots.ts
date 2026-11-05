import { DroppedAssetInterface } from "@rtsdk/topia";
import { DECOR_SPOTS, getEmptySpotImage, SIGN_UNIQUE_NAME, TOY_SPOT_SIZE } from "@shared/constants/index.js";
import { Credentials } from "../../types/index.js";
import { errorHandler } from "../errorHandler.js";
import { getImageSize } from "../getImageSize.js";
import { standardizeError } from "../standardizeError.js";
import { World } from "../topiaInit.js";

const SPOT_NAMES = [...Object.keys(DECOR_SPOTS), SIGN_UNIQUE_NAME];

export type BoothSpotsType = { [spot: string]: DroppedAssetInterface };

/**
 * A booth scene's decor spots and sign, by unique name. Dropping a scene can suffix its assets' unique names, so an
 * exact match wins but "toycoon_rug<suffix>" also counts. Spots missing from the scene are left out.
 * The scene listing leaves out each asset's picture links, so every spot found is then fetched in full (in parallel).
 */
export const getBoothSpots = async (credentials: Credentials, sceneDropId: string): Promise<BoothSpotsType> => {
  try {
    const world = World.create(credentials.urlSlug, { credentials });
    const assets = (await world.fetchDroppedAssetsBySceneDropId({ sceneDropId })) as DroppedAssetInterface[];

    const spots: BoothSpotsType = {};
    for (const spot of SPOT_NAMES) {
      const match =
        assets.find(({ uniqueName }) => uniqueName === spot) ||
        assets.find(({ uniqueName }) => !!uniqueName && uniqueName.startsWith(spot));
      if (match) spots[spot] = match;

      // Two assets with the same name (e.g. a copied and pasted spot) means changes may land on one nobody can see
      const namesakes = assets.filter(({ uniqueName }) => !!uniqueName && uniqueName.startsWith(spot));
      if (namesakes.length > 1) {
        console.warn(
          `[decor] ${namesakes.length} assets in booth scene ${sceneDropId} are named like "${spot}": ` +
            namesakes
              .map(({ id, uniqueName, position }) => `${id} "${uniqueName}" at (${position?.x}, ${position?.y})`)
              .join("; ") +
            `. Using ${match?.id}.`,
        );
      }
    }

    await Promise.all(
      Object.entries(spots).map(([spot, asset]) =>
        asset
          .fetchDroppedAssetById()
          .catch((error: any) =>
            errorHandler({ error, functionName: "getBoothSpots", message: `Error fetching ${spot}'s details` }),
          ),
      ),
    );
    return spots;
  } catch (error) {
    throw standardizeError(error);
  }
};

// Topia only accepts public https links for a spot's picture: it refuses a placeholder like
// "layers/textAssetPreview.png" and a localhost or plain-http link alike
const isImageUrl = (value?: string | null): value is string => !!value && /^https:\/\//i.test(value);

/**
 * The picture links a spot shows. Dropped web images may carry them as bottomLayerURL/topLayerURL or as layer0/layer1,
 * so read both, keeping only real links. "" = no readable link.
 */
export const getSpotLayers = (asset: DroppedAssetInterface) => ({
  bottom: [asset.bottomLayerURL, asset.layer0].find(isImageUrl) || "",
  top: [asset.topLayerURL, asset.layer1].find(isImageUrl) || "",
});

// The box a decoration on this spot is sized to: toys fit TOY_SPOT_SIZE. Rugs, awnings, and lights have pictures made
// for the booth (Lina's), so they show at their own size.
export const getSpotBox = (spot: string) =>
  DECOR_SPOTS[spot] === "toy" ? { width: TOY_SPOT_SIZE, height: TOY_SPOT_SIZE } : undefined;

// Keeps a mis-measured image from vanishing or filling the scene. Low enough for a very large picture in a small spot
// (a 4000px picture in an 80px spot is 0.02).
const MIN_SCALE = 0.01;
const MAX_SCALE = 5;

/**
 * The assetScale that makes a decoration fit inside a box (keeping its proportions). Topia shows a swapped-in picture
 * at its own pixel size, so a big toy image would otherwise dwarf the booth. 1 if the image's size can't be read.
 * Logs what it measured, for checking sizes in a real world.
 */
export const getFitScale = async (imageUrl: string, box: { width: number; height: number }) => {
  const image = await getImageSize(imageUrl);
  if (!image?.width || !image.height) {
    console.warn(`[decor] Can't size ${imageUrl}: its size is unreadable. Showing it at scale 1.`);
    return 1;
  }
  const fit = Math.min(box.width / image.width, box.height / image.height);
  const scale = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, fit)) * 1000) / 1000;
  console.log(
    `[decor] Fitting ${imageUrl} (${image.width}x${image.height}) into ${box.width}x${box.height}: scale ${scale}`,
  );
  return scale;
};

/**
 * Empties a spot: Lina's empty picture for that kind of spot (awning-empty.png, toy-empty.png, …). Rug, awning, and
 * lights empties show at their own size; the toy empty is fitted to the toy box like a toy, so an empty toy spot takes
 * the same space as a toy on it.
 */
export const resetSpot = async (asset: DroppedAssetInterface, spot: string) => {
  const emptyImage = getEmptySpotImage(spot);
  const box = getSpotBox(spot);
  const scale = box ? await getFitScale(emptyImage, box) : 1;
  const layers = getSpotLayers(asset);
  await Promise.all([
    layers.bottom === emptyImage && !layers.top ? undefined : asset.updateWebImageLayers(emptyImage, ""),
    // Topia doesn't always report a spot's current size, so set it unless it's known to match
    asset.assetScale === scale ? undefined : asset.updateScale(scale),
  ]);
};

/**
 * Empties every decor spot in a booth (claiming, clearing, or abandoning it). One spot failing doesn't stop the others.
 */
export const resetBoothSpots = async ({ spots }: { spots: BoothSpotsType }) => {
  await Promise.all(
    Object.keys(DECOR_SPOTS).map(async (spot) => {
      if (!spots[spot]) return;
      await resetSpot(spots[spot], spot).catch((error: any) =>
        errorHandler({ error, functionName: "resetBoothSpots", message: `Error resetting ${spot}` }),
      );
    }),
  );
};

/**
 * Sets the text on a booth's sign. Returns false (and logs) if the scene has no sign asset.
 */
export const setBoothSign = async ({ sign, text }: { sign?: DroppedAssetInterface; text: string }) => {
  if (!sign) {
    console.warn(`[booths] No "${SIGN_UNIQUE_NAME}" asset in this booth scene; can't set its text to "${text}"`);
    return false;
  }
  await sign.updateCustomTextAsset({}, text);
  return true;
};
