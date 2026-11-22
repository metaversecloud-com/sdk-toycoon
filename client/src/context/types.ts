import { VisitorDataObjectType, VisitorInventoryItemType, VisitorInventoryType } from "@shared/types/VisitorData";
import { BoothsFullAlertType, TargetBoothType } from "@shared/types/BoothTypes";
import { InventoryItemType } from "@shared/types/InventoryItems";
import { PlacedDecorationsType } from "@shared/constants";

export const SET_HAS_INTERACTIVE_PARAMS = "SET_HAS_INTERACTIVE_PARAMS";
export const SET_GAME_STATE = "SET_GAME_STATE";
export const SET_ERROR = "SET_ERROR";
// Merges just the parts of the game state a gameplay action changed (see GamePatchType)
export const GAME_PATCHED = "GAME_PATCHED";
// Clears the "Auto-Collector delivered" summary once the player has seen it
export const AUTO_COLLECT_DISMISSED = "AUTO_COLLECT_DISMISSED";

/**
 * A targeted change to game state: only the listed timers/items/fields are touched, so several actions in flight at
 * once (e.g. starting two material stations quickly) can't overwrite each other's updates.
 */
export type GamePatchType = {
  materialTimers?: { [materialName: string]: number | null };
  craftTimers?: { [recipeId: string]: number | null };
  materials?: { [itemId: string]: VisitorInventoryItemType };
  toys?: { [itemId: string]: VisitorInventoryItemType };
  decorations?: { [itemId: string]: VisitorInventoryItemType };
  placedDecorations?: PlacedDecorationsType; // replaces the whole record (it's small)
  visitorData?: Partial<Pick<VisitorDataObjectType, "totalCoinsEarned" | "totalToysCrafted" | "totalToysSold">>;
  inventory?: Partial<Pick<VisitorInventoryType, "coins" | "xp" | "level">>;
};

// What the Auto-Collector granted when the server settled it (sent by /game-state as `autoCollect`)
export type AutoCollectSummaryType = {
  unitsCollected: number;
  xpEarned: number;
  levelsGained: number[];
};

export type InteractiveParams = {
  assetId: string;
  displayName: string;
  identityId: string;
  interactiveNonce: string;
  interactivePublicKey: string;
  profileId: string;
  sceneDropId: string;
  uniqueName: string;
  urlSlug: string;
  username: string;
  visitorId: string;
};

export interface InitialState {
  isAdmin?: boolean;
  error?: string;
  hasInteractiveParams?: boolean;
  visitorData?: VisitorDataObjectType;
  visitorInventory?: VisitorInventoryType;
  ecosystemMaterials?: { [itemId: string]: InventoryItemType };
  ecosystemToys?: { [itemId: string]: InventoryItemType };
  ecosystemDecorations?: { [itemId: string]: InventoryItemType };
  ecosystemBadges?: { [itemId: string]: InventoryItemType };
  timerSpeed?: number; // this world's timer multiplier
  ownsBoothInThisWorld?: boolean;
  ownedBoothSceneDropId?: string | null;
  targetBooth?: TargetBoothType | null;
  availableBoothCount?: number;
  boothsFullAlert?: BoothsFullAlertType | null;
  // Server clock minus client clock (ms), measured when game state loads; added to Date.now() for countdowns
  serverTimeOffset?: number;
  serverTime?: number;
  ecosystemBoosters?: { [itemId: string]: InventoryItemType };
  // Units the Auto-Collector delivered since the player last saw the summary (adds up across page loads)
  autoCollectAway?: AutoCollectSummaryType;
}

export type ActionType = {
  type: string;
  payload: Partial<InitialState> & { patch?: GamePatchType; autoCollect?: AutoCollectSummaryType | null };
};

export type ErrorType =
  | string
  | {
      message?: string;
      response?: { data?: { error?: { message?: string }; message?: string } };
    };