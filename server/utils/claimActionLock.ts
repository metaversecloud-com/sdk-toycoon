import { VisitorInterface } from "@rtsdk/topia";
import { VisitorDataObjectType } from "../types/index.js";

// How long to wait before re-checking a taken lock, so a request that holds it has time to finish its write
const LOCK_RECHECK_DELAY_MS = 1000;

/**
 * Makes an action one-shot per attempt: bumps lockVersions[action] (plus any other fields to write in the same update)
 * under a lock named after the current version, and never releases it. A double-click or second tab reads the same
 * version, can't acquire that lock, and gets "locked". The version only ever goes up — failed attempts included — so a
 * lock from an earlier attempt can never block a later one.
 *
 * If the lock is taken but, after a short wait, the version still hasn't moved, the request that took it never wrote
 * (e.g. it timed out after Topia granted the lock). Left alone, that would block this action for this player for good
 * — a Collect button that silently does nothing — so this claims a one-off recovery lock for the current minute instead.
 * Returns false if another request already holds the lock.
 */
export const claimActionLock = async ({
  action,
  alsoWrite = {},
  profileId,
  visitor,
  visitorData,
}: {
  action: string;
  alsoWrite?: object;
  profileId: string;
  visitor: VisitorInterface;
  visitorData: VisitorDataObjectType;
}) => {
  const version = visitorData.lockVersions?.[action] ?? 0;
  const tryClaim = (lockId: string) =>
    visitor
      .updateDataObject({ [`lockVersions.${action}`]: version + 1, ...alsoWrite }, { lock: { lockId, releaseLock: false } })
      .then(() => true)
      .catch(() => false);

  if (await tryClaim(`${action}_${profileId}_${version}`)) return true;

  await new Promise((resolve) => setTimeout(resolve, LOCK_RECHECK_DELAY_MS));
  let current: Partial<VisitorDataObjectType> | null = null;
  try {
    current = (await visitor.fetchDataObject()) as Partial<VisitorDataObjectType> | null;
  } catch {
    return false;
  }
  if (!current || (current.lockVersions?.[action] ?? 0) !== version) return false;

  console.warn(`[claimActionLock] Recovering orphaned "${action}" lock for ${profileId} at version ${version}`);
  return tryClaim(`${action}_${profileId}_${version}_recovered_${Math.floor(Date.now() / 60000)}`);
};
