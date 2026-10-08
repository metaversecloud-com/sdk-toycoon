import { DroppedAssetInterface } from "@rtsdk/topia";
import { LeaderboardDataType } from "@shared/types/LeaderboardTypes.js";

// Data object on the Main Scene key asset (toycoon_start): holds this world's leaderboard.
// Booth records live on each booth's toycoon_booth asset — see BoothDataObjectType in shared/types/BoothTypes.ts.
export interface IDroppedAsset extends DroppedAssetInterface {
  dataObject: {
    leaderboard?: LeaderboardDataType; // { profileId: "displayName|totalXp|level|totalToysCrafted" }
  };
}
