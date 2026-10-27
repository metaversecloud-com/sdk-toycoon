import { DEPLOYED_APP_URL, EMPTY_SPOT_IMAGE_PATH } from "../constants.js";

/**
 * The app's transparent empty decor-spot picture. Topia refuses localhost and plain-http picture links, so this is the
 * app's own https address when it has one, otherwise EMPTY_SPOT_IMAGE_URL or the deployed dev site's copy.
 */
export const getEmptySpotImageUrl = (host: string) => {
  const baseUrl = getBaseUrl(host);
  if (baseUrl.startsWith("https://")) return `${baseUrl}${EMPTY_SPOT_IMAGE_PATH}`;
  return process.env.EMPTY_SPOT_IMAGE_URL || `${DEPLOYED_APP_URL}${EMPTY_SPOT_IMAGE_PATH}`;
};

export function getBaseUrl(host: string) {
  const protocol = process.env.INSTANCE_PROTOCOL;
  let baseUrl;

  if (host === "localhost") {
    baseUrl = `http://localhost:3001`;
  } else {
    baseUrl = `${protocol}://${host}`;
  }

  return baseUrl;
}
