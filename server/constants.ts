import { BoothDataObjectType } from "@shared/types/BoothTypes.js";
import { VisitorDataObjectType } from "@shared/types/VisitorData.js";

// Every booth scene must contain exactly one asset with this unique name; its data object holds the BoothData
export const BOOTH_KEY_UNIQUE_NAME = "toycoon_booth";

export const getDefaultBoothData = (sceneDropId: string): BoothDataObjectType => ({
  sceneDropId,
  ownerId: null,
  ownerDisplayName: null,
  claimDate: null,
  level: 1,
  badges: [],
  lastInteractionTimestamp: 0,
  claimCount: 0,
});

// How many open booths to try before giving up when claims collide
export const MAX_CLAIM_ATTEMPTS = 5;

// The Main Scene's "Start Here" asset — also the return-teleport destination
export const MAIN_SCENE_UNIQUE_NAME = "toycoon_start";

// Visitors land this many px below the target asset so they don't spawn on top of it
// TODO: tune once real booth/Main Scene layouts exist
export const TELEPORT_Y_OFFSET = 140;

// Owned booths with no owner interaction for this long are released by clearInactiveBooths
export const INACTIVE_BOOTH_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;

// How many booths to clear in parallel during bulk admin operations
export const CLEAR_BOOTHS_CONCURRENCY = 10;

// How many players the leaderboard shows
export const LEADERBOARD_SIZE = 25;

// Ecosystem inventory item names for currencies
export const COINS_ITEM_NAME = "Coins";
export const XP_ITEM_NAME = "Experience Points";

// Written to a visitor's data object the first time they open the app. placedDecorations and boothIds MUST be
// present as {} — otherwise Firebase stores later dot-path updates as literal "a.b" keys at the root.
export const DEFAULT_VISITOR_DATA: VisitorDataObjectType = {
  totalCoinsEarned: 0,
  totalToysCrafted: 0,
  badges: [],
  placedDecorations: {},
  boothIds: {},
};
