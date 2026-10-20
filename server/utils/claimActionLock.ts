import { VisitorInterface } from "@rtsdk/topia";
import { VisitorDataObjectType } from "../types/index.js";

/**
 * Makes an action one-shot per attempt: bumps lockVersions[action] (plus any other fields to write in the same update)
 * under a lock named after the current version, and never releases it. A double-click or second tab reads the same
 * version, can't acquire that lock, and gets "locked". The version only ever goes up — failed attempts included — so a
 * lock from an earlier attempt can never block a later one.
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
  try {
    await visitor.updateDataObject(
      { [`lockVersions.${action}`]: version + 1, ...alsoWrite },
      { lock: { lockId: `${action}_${profileId}_${version}`, releaseLock: false } },
    );
    return true;
  } catch {
    return false;
  }
};
