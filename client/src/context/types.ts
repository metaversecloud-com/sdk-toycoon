import { VisitorDataObjectType, VisitorInventoryItemType, VisitorInventoryType } from "@shared/types/VisitorData";
import { BoothsFullAlertType, TargetBoothType } from "@shared/types/BoothTypes";
import { InventoryItemType } from "@shared/types/InventoryItems";

export const SET_HAS_INTERACTIVE_PARAMS = "SET_HAS_INTERACTIVE_PARAMS";
export const SET_GAME_STATE = "SET_GAME_STATE";
export const SET_ERROR = "SET_ERROR";
// Merges just the parts of the game state a gameplay action changed (see GamePatchType)
export const GAME_PATCHED = "GAME_PATCHED";

/**
 * A targeted change to game state: only the listed timers/items/fields are touched, so several actions in flight at
 * once (e.g. starting two material stations quickly) can't overwrite each other's updates.
 */
export type GamePatchType = {
  materialTimers?: { [materialName: string]: number | null };
  craftTimers?: { [recipeId: string]: number | null };
  materials?: { [itemId: string]: VisitorInventoryItemType };
  toys?: { [itemId: string]: VisitorInventoryItemType };
  visitorData?: Partial<Pick<VisitorDataObjectType, "totalCoinsEarned" | "totalToysCrafted" | "totalToysSold">>;
  inventory?: Partial<Pick<VisitorInventoryType, "coins" | "xp" | "level">>;
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
  ownsBoothInThisWorld?: boolean;
  ownedBoothSceneDropId?: string | null;
  targetBooth?: TargetBoothType | null;
  availableBoothCount?: number;
  boothsFullAlert?: BoothsFullAlertType | null;
  // Server clock minus client clock (ms), measured when game state loads; added to Date.now() for countdowns
  serverTimeOffset?: number;
  serverTime?: number;
}

export type ActionType = {
  type: string;
  payload: Partial<InitialState> & { patch?: GamePatchType };
};

export type ErrorType =
  | string
  | {
      message?: string;
      response?: { data?: { error?: { message?: string }; message?: string } };
    };
