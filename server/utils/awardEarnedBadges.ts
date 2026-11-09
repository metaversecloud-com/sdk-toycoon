import { VisitorInterface } from "@rtsdk/topia";
import { BADGES, getEarnedBadgeIds, normalizeBadgeName } from "@shared/constants/index.js";
import { Credentials, VisitorDataObjectType } from "../types/index.js";
import { errorHandler } from "./errorHandler.js";
import { getInventoryItems } from "./inventory/inventoryCache.js";

/**
 * Grants every badge the player's progress has earned but they haven't been given yet (visitorData.badges), with a
 * toast for each. Pass the visitor data as it is after the action that may have earned something.
 * A badge whose BADGE item isn't in the ecosystem yet is skipped, and granted the next time this runs after it's added.
 * Never throws: badges are a bonus on top of whatever the player just did. Returns the ids granted.
 */
export const awardEarnedBadges = async ({
  credentials,
  level,
  visitor,
  visitorData,
}: {
  credentials: Credentials;
  level: number;
  visitor: VisitorInterface;
  visitorData: VisitorDataObjectType;
}): Promise<string[]> => {
  try {
    const { profileId, urlSlug } = credentials;
    const { allItems, ecosystemDecorations, ecosystemToys } = await getInventoryItems(credentials);

    const alreadyGranted = new Set(visitorData.badges || []);
    const earned = getEarnedBadgeIds({
      progress: visitorData,
      level,
      urlSlug,
      decorItems: [...Object.values(ecosystemDecorations), ...Object.values(ecosystemToys)],
    }).filter((id) => !alreadyGranted.has(id));
    if (earned.length === 0) return [];

    const badgeItems = allItems.filter(({ type }) => type === "BADGE");
    const granted: string[] = [];
    const missing: string[] = [];

    for (const id of earned) {
      const badge = BADGES.find((candidate) => candidate.id === id)!;
      const item = badgeItems.find(
        ({ name }) => !!name && (normalizeBadgeName(name) === normalizeBadgeName(badge.name) || name === id),
      );
      if (!item) {
        missing.push(badge.name);
        continue;
      }

      try {
        await visitor.grantInventoryItem(item, 1);
        granted.push(id);
        visitor
          .fireToast({ groupId: "toycoon-badge", title: "Badge unlocked!", text: `You earned ${badge.name}.` })
          .catch((error: any) =>
            errorHandler({ error, functionName: "awardEarnedBadges", message: `Error firing ${badge.name} toast` }),
          );
      } catch (error) {
        errorHandler({ error, functionName: "awardEarnedBadges", message: `Error granting the ${badge.name} badge` });
      }
    }

    if (missing.length) console.warn(`[badges] Earned but not in the ecosystem yet: ${missing.join(", ")}`);
    if (granted.length === 0) return [];

    await visitor.updateDataObject(
      { badges: [...alreadyGranted, ...granted] },
      {
        analytics: granted.map((id) => ({
          analyticName: "toycoon_badge_unlocked",
          profileId,
          urlSlug,
          uniqueKey: `${profileId}_${id}`,
        })),
      },
    );
    return granted;
  } catch (error) {
    errorHandler({ error, functionName: "awardEarnedBadges", message: "Error awarding badges" });
    return [];
  }
};

/**
 * Saves badge progress from an action ({ path: value }, dot-paths allowed one level deep, e.g. "daysPlayed.2026-11-09")
 * and then grants whatever it earned. Meant to run after the response is sent: it never throws, and a failed save
 * only means the progress (and any badge) waits for the next action.
 */
export const saveBadgeProgress = async ({
  credentials,
  level,
  update,
  visitor,
  visitorData,
}: {
  credentials: Credentials;
  level: number;
  update: { [path: string]: unknown };
  visitor: VisitorInterface;
  visitorData: VisitorDataObjectType;
}) => {
  try {
    if (Object.keys(update).length > 0) await visitor.updateDataObject(update, {});
    return await awardEarnedBadges({ credentials, level, visitor, visitorData: applyUpdate(visitorData, update) });
  } catch (error) {
    errorHandler({ error, functionName: "saveBadgeProgress", message: "Error saving badge progress" });
    return [];
  }
};

// The visitor data as it is after a dot-path update
const applyUpdate = (visitorData: VisitorDataObjectType, update: { [path: string]: unknown }) => {
  const next: { [key: string]: any } = { ...visitorData };
  for (const [path, value] of Object.entries(update)) {
    const [key, ...rest] = path.split(".");
    if (rest.length === 0) next[key] = value;
    else next[key] = { ...(next[key] || {}), [rest.join(".")]: value };
  }
  return next as VisitorDataObjectType;
};
