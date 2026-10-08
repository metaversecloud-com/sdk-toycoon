import { VisitorDataObjectType, VisitorInventoryType } from "@shared/types/VisitorData";
import { BoothsFullAlertType, TargetBoothType } from "@shared/types/BoothTypes";
import { InventoryItemType } from "@shared/types/InventoryItems";

export const SET_HAS_INTERACTIVE_PARAMS = "SET_HAS_INTERACTIVE_PARAMS";
export const SET_GAME_STATE = "SET_GAME_STATE";
export const SET_ERROR = "SET_ERROR";
export const MATERIAL_COLLECTED = "MATERIAL_COLLECTED";

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
  ownsBoothInThisWorld?: boolean;
  ownedBoothSceneDropId?: string | null;
  targetBooth?: TargetBoothType | null;
  availableBoothCount?: number;
  boothsFullAlert?: BoothsFullAlertType | null;
}

export type ActionType = {
  type: string;
  payload: Partial<InitialState>;
};

export type ErrorType =
  | string
  | {
      message?: string;
      response?: { data?: { error?: { message?: string }; message?: string } };
    };
