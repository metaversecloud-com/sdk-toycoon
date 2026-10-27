import { DroppedAssetInterface } from "@rtsdk/topia";
import { DECOR_SPOTS, SIGN_UNIQUE_NAME, TOY_SPOT_SIZE } from "@shared/constants/index.js";
import { BoothDataObjectType } from "@shared/types/BoothTypes.js";
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

type SpotDefaultsType = NonNullable<BoothDataObjectType["spotDefaults"]>;

// Topia only accepts public https links for a spot's picture: it refuses a placeholder like
// "layers/textAssetPreview.png" and a localhost or plain-http link alike
const isImageUrl = (value?: string | null): value is string => !!value && /^https:\/\//i.test(value);

const hasImageUrl = (layers?: { bottom: string; top: string }) =>
  !!layers && (isImageUrl(layers.bottom) || isImageUrl(layers.top));

/**
 * The picture links a spot shows. Dropped web images may carry them as bottomLayerURL/topLayerURL or as layer0/layer1,
 * so read both, keeping only real links. "" = no readable link.
 */
export const getSpotLayers = (asset: DroppedAssetInterface) => ({
  bottom: [asset.bottomLayerURL, asset.layer0].find(isImageUrl) || "",
  top: [asset.topLayerURL, asset.layer1].find(isImageUrl) || "",
});

/**
 * Saves each decor spot's empty picture and size on the booth's key asset, for removing or clearing to put back.
 * - Empty spots (emptySpots: nothing placed on them right now) save what they show whenever it differs from what's
 *   saved, so changing a spot's picture in the world is picked up the next time it's decorated.
 * - Decorated spots keep what's saved (they're showing a decoration, not their empty picture).
 * - Wherever there's no real link to save (a spot's picture can't be read, or a decorated spot has nothing usable saved),
 *   fallbackImageUrl (the app's transparent spot picture) is saved instead, so there's always something to put back.
 * Call before changing a spot. Returns every saved default.
 */
export const recordSpotDefaults = async ({
  boothAsset,
  boothData,
  emptySpots,
  fallbackImageUrl,
  spots,
}: {
  boothAsset: DroppedAssetInterface;
  boothData: BoothDataObjectType;
  emptySpots: string[];
  fallbackImageUrl: string;
  spots: BoothSpotsType;
}) => {
  try {
    const recorded: SpotDefaultsType = { ...(boothData.spotDefaults || {}) };
    const update: { [path: string]: SpotDefaultsType[string] } = {};
    const fallback = (scale: number) => ({ bottom: fallbackImageUrl, top: "", scale });

    for (const spot of Object.keys(DECOR_SPOTS)) {
      const asset = spots[spot];
      // Toy spots don't use saved pictures (see getSpotEmptyState)
      if (!asset || DECOR_SPOTS[spot] === "toy") continue;
      const saved = recorded[spot];

      let next: SpotDefaultsType[string] | null = null;
      if (emptySpots.includes(spot)) {
        const layers = getSpotLayers(asset);
        console.log(
          `[decor] ${spot} empty picture: bottomLayerURL=${asset.bottomLayerURL ?? "-"} topLayerURL=${asset.topLayerURL ?? "-"} ` +
            `layer0=${asset.layer0 ?? "-"} layer1=${asset.layer1 ?? "-"} scale=${asset.assetScale ?? "-"}`,
        );
        const current = hasImageUrl(layers)
          ? { ...layers, scale: asset.assetScale ?? 1 }
          : fallback(asset.assetScale ?? 1);
        const isSame = saved?.bottom === current.bottom && saved?.top === current.top && saved?.scale === current.scale;
        if (!isSame) next = current;
      } else if (!hasImageUrl(saved)) {
        next = fallback(saved?.scale ?? 1);
      }

      if (!next) continue;
      recorded[spot] = next;
      update[`spotDefaults.${spot}`] = next;
    }
    if (Object.keys(update).length) await boothAsset.updateDataObject(update, {});
    return recorded;
  } catch (error) {
    throw standardizeError(error);
  }
};

// Keeps a mis-measured image from vanishing or filling the scene. Low enough for a very large picture in a small spot
// (a 4000px picture in an 80px spot is 0.02).
const MIN_SCALE = 0.01;
const MAX_SCALE = 5;

/**
 * The assetScale that makes a decoration fit inside its spot's empty picture (keeping its proportions). Topia shows a
 * swapped-in picture at its own pixel size, so a big image would otherwise dwarf the booth. If either image's size
 * can't be read, the spot keeps its original size. Logs what it measured, for checking sizes in a real world.
 */
export const getFitScale = async (
  imageUrl: string,
  defaults: SpotDefaultsType[string],
  box?: { width: number; height: number }, // a fixed size to fit into instead of measuring the empty picture
) => {
  const baseScale = defaults.scale ?? 1;
  const emptyUrl = box ? `${box.width}x${box.height} box` : defaults.bottom || defaults.top;
  const [image, empty] = await Promise.all([getImageSize(imageUrl), box ?? getImageSize(emptyUrl)]);
  if (!image?.width || !image.height || !empty?.width || !empty.height) {
    console.warn(
      `[decor] Can't size ${imageUrl} for its spot: decoration ${image ? `${image.width}x${image.height}` : "unreadable"}, ` +
        `empty picture ${emptyUrl || "(none)"} ${empty ? `${empty.width}x${empty.height}` : "unreadable"}. Keeping scale ${baseScale}.`,
    );
    return baseScale;
  }
  const fit = Math.min(empty.width / image.width, empty.height / image.height);
  const scale = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, baseScale * fit)) * 1000) / 1000;
  console.log(
    `[decor] Fitting ${imageUrl} (${image.width}x${image.height}) into ${emptyUrl} (${empty.width}x${empty.height}) ` +
      `at spot scale ${baseScale}: scale ${scale}`,
  );
  return scale;
};

/**
 * What a spot looks like with nothing on it.
 * - Toy spots: always the app's transparent picture at normal size, and toys are sized to a TOY_SPOT_SIZE box. Booth
 *   templates can start toy spots off showing a sample toy, so their original picture isn't an empty one.
 * - Rug, awning, lights: the picture and size saved by recordSpotDefaults (null if nothing is saved).
 */
export const getSpotEmptyState = (
  spot: string,
  spotDefaults: BoothDataObjectType["spotDefaults"] = {},
  emptySpotImageUrl = "",
): SpotDefaultsType[string] | null =>
  DECOR_SPOTS[spot] === "toy" ? { bottom: emptySpotImageUrl, top: "", scale: 1 } : spotDefaults[spot] ?? null;

// The box a decoration on this spot is sized to, if it has a fixed one
export const getSpotBox = (spot: string) =>
  DECOR_SPOTS[spot] === "toy" ? { width: TOY_SPOT_SIZE, height: TOY_SPOT_SIZE } : undefined;

/**
 * Puts a spot back to its empty picture and original size. If the saved empty picture has no real link (Topia needs
 * one), fallbackImageUrl is used; without either, only the size is reset.
 */
export const resetSpot = async (
  asset: DroppedAssetInterface,
  defaults: SpotDefaultsType[string],
  fallbackImageUrl?: string,
) => {
  const scale = defaults.scale ?? 1;
  const target = hasImageUrl(defaults)
    ? { bottom: isImageUrl(defaults.bottom) ? defaults.bottom : "", top: isImageUrl(defaults.top) ? defaults.top : "" }
    : { bottom: fallbackImageUrl || "", top: "" };
  const layers = getSpotLayers(asset);
  const needsPicture = hasImageUrl(target) && (layers.bottom !== target.bottom || layers.top !== target.top);
  if (!hasImageUrl(target)) console.warn(`[decor] No empty picture to put back on ${asset.uniqueName}`);
  await Promise.all([
    needsPicture ? asset.updateWebImageLayers(target.bottom, target.top) : undefined,
    // Topia doesn't always report a spot's current size, so set it unless it's known to match
    asset.assetScale === scale ? undefined : asset.updateScale(scale),
  ]);
};

/**
 * Puts every decor spot back to its recorded empty picture and size (clearing or abandoning a booth). Spots already
 * showing their default are skipped; one spot failing doesn't stop the others.
 */
export const resetBoothSpots = async ({
  emptySpotImageUrl,
  spotDefaults = {},
  spots,
}: {
  emptySpotImageUrl?: string; // the app's transparent picture: every empty toy spot, and any spot with no saved link
  spotDefaults?: BoothDataObjectType["spotDefaults"];
  spots: BoothSpotsType;
}) => {
  await Promise.all(
    Object.keys(DECOR_SPOTS).map(async (spot) => {
      const asset = spots[spot];
      const defaults = getSpotEmptyState(spot, spotDefaults, emptySpotImageUrl);
      if (!asset || !defaults) return;
      await resetSpot(asset, defaults, emptySpotImageUrl).catch((error: any) =>
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
