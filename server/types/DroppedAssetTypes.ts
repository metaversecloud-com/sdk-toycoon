import { DroppedAssetInterface } from "@rtsdk/topia";

// Data object on the key asset (the Toycoon world asset): holds the leaderboard
export interface IDroppedAsset extends DroppedAssetInterface {
  dataObject: {
    leaderboard?: Record<string, string>; // { profileId: "displayName|totalTokens|level|rareBearsCount" }
  };
}

// Data object on each booth asset: read-only info other visitors can see
export type BoothAssetDataObjectType = {
  ownerId?: string; // profileId of the visitor who claimed this booth
  ownerName?: string; // shown on the booth's read-only view
  claimedAt?: number; // ms timestamp, matches VisitorWorldDataType.claimedAt
  lastActiveAt?: number; // ms timestamp, used by the admin "clear inactive booths" action
  level?: number; // optional, update when the owner levels up so visitors can see it
};