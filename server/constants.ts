import { BoothDataObjectType } from "@shared/types/BoothTypes.js";

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
export const DEFAULT_VISITOR_DATA = {
  totalCoinsEarned: 0,
  totalToysCrafted: 0,
  rareToysCrafted: 0,
  badges: [],
  materialCollectedAt: {}, // <-- add
  placedDecorations: {},
  worlds: {},
};

export const MATERIAL_BIN_CAP = 10;

export const COINS_ITEM_NAME = "Coins";
export const XP_ITEM_NAME = "Experience Points";
export const LEVEL_XP_THRESHOLDS = [0, 100, 1000];
export const DEFAULT_VISITOR_WORLD_DATA = {};