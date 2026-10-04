export const initialState = {
  error: "",
  gameState: {},
  hasInteractiveParams: false,
};

export const DEFAULT_VISITOR_DATA = {
  totalCoinsEarned: 0,
  totalToysCrafted: 0,
  rareToysCrafted: 0,
  badges: [],
  placedDecorations: {}, // must be {} or Firebase writes dot-notation keys at root
  worlds: {},
};

export const DEFAULT_VISITOR_WORLD_DATA = {}; // unclaimed

export const LEVEL_XP_THRESHOLDS = [0, 100, 1000]; // L1, L2, L3
export const INACTIVITY_MS = 14 * 24 * 60 * 60 * 1000;

export const COINS_ITEM_NAME = "Coins";
export const XP_ITEM_NAME = "Experience Points";