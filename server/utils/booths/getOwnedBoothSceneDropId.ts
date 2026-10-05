import { BoothIndexType } from "@shared/types/BoothTypes.js";
import { VisitorDataObjectType } from "@shared/types/VisitorData.js";

/**
 * Resolves which booth (if any) this visitor owns in this world.
 * Trusts the visitor's record only if the booth index agrees they still own it (booths can be cleared by admins);
 * otherwise falls back to scanning the index in case the visitor record is missing the entry.
 */
export const getOwnedBoothSceneDropId = ({
  booths,
  profileId,
  urlSlug,
  visitorData,
}: {
  booths: BoothIndexType;
  profileId: string;
  urlSlug: string;
  visitorData: VisitorDataObjectType;
}): string | null => {
  const recordedBoothId = visitorData.boothIds?.[urlSlug];
  if (recordedBoothId && booths[recordedBoothId]?.ownerId === profileId) return recordedBoothId;

  return Object.keys(booths).find((id) => booths[id].ownerId === profileId) || null;
};
