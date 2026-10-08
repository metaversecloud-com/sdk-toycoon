/**
 * Shared types between client and server for booth ownership and game-state hydration
 */

import { InventoryItemType } from "./InventoryItems.js";
import { VisitorDataObjectType, VisitorInventoryType } from "./VisitorData.js";

// Stored on the booth's key asset (uniqueName BOOTH_KEY_UNIQUE_NAME) data object — the source of truth for a booth
export interface BoothDataObjectType {
  sceneDropId: string;
  ownerId: string | null; // profileId; null = unclaimed
  ownerDisplayName: string | null;
  claimDate: string | null; // ISO date
  level: number;
  badges: string[];
  lastInteractionTimestamp: number; // ms; drives the 14-day inactivity check
  claimCount: number; // increments on every claim; versions the claim lock so a stale read can't double-claim
}

// Lightweight index of every booth scene in a world, cached on the World data object
export interface BoothIndexType {
  [sceneDropId: string]: {
    keyAssetId: string; // droppedAssetId of the booth's key asset
    ownerId: string | null;
  };
}

// Raised when a visitor tries to claim a booth and none are open, surfaced to admins
export interface BoothsFullAlertType {
  lastTriggeredAt: number; // ms
  turnedAwayCount: number;
}

export interface WorldDataObjectType {
  booths?: BoothIndexType;
  boothsFullAlert?: BoothsFullAlertType | null;
}

export interface TargetBoothType {
  sceneDropId: string;
  isClaimed: boolean;
  isOwnedByVisitor: boolean;
  ownerDisplayName: string | null;
  level: number;
  claimDate: string | null;
}

export interface GameStateResponseType {
  visitorData: VisitorDataObjectType;
  visitorInventory: VisitorInventoryType;
  ecosystemMaterials: { [itemId: string]: InventoryItemType }; // every collectable material, for the Materials page
  ownsBoothInThisWorld: boolean;
  ownedBoothSceneDropId: string | null;
  targetBooth: TargetBoothType | null; // null when the clicked asset isn't part of a booth scene (e.g. Main Scene)
  availableBoothCount: number;
  isAdmin: boolean;
  boothsFullAlert: BoothsFullAlertType | null; // only populated for admins
}

export type ClaimBoothResultType = "claimed" | "alreadyOwned" | "allBoothsTaken";

export interface ClaimBoothResponseType {
  result: ClaimBoothResultType;
  ownedBoothSceneDropId: string | null;
}
