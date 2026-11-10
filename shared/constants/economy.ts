import { toCanonicalMaterialName } from "./materialNames.js";

/* ==========================================================================================================
 * ECONOMY: every balancing number for the game lives here. Each number's comment says what it controls.
 *
 * NOT in this file (on purpose):
 *   - Toy sell tokens / sell XP / craft time / shelf cap ..... shared/constants/recipes.ts (TOY_RECIPES)
 *   - Level XP thresholds (100, 1000) ........................ shared/levels.ts
 *   - Level-up token bonuses (10, 30) ........................ shared/constants/recipes.ts
 *   - Decoration prices ...................................... Lina's ecosystem metadata (cost)
 * ======================================================================================================== */

/* ---------------------------------------------------------------------------------------------------------
 * SECTION 1: XP RATES
 * XP for collecting a material and for collecting a crafted toy is based on how long the action takes.
 * Change a rate below to rebalance every material (or every toy) at once.
 * Always uses the BASE time, never a boosted time, so boosters can't reduce XP.
 * ------------------------------------------------------------------------------------------------------- */
export const XP_PER_SECOND = {
  material: 0.05, // collecting a material: seconds x this (Wood 15s = 1 XP, Paint 150s = 8 XP)
  craft: 0.1, // collecting a crafted toy: seconds x this (Rocking Horse 30s = 3 XP, Train 180s = 18 XP)
};

// The least XP any collect or craft pays, so very short actions still move the XP bar
export const MIN_ACTION_XP = 1;

// Turns a duration into XP: round(seconds x rate), never below MIN_ACTION_XP. 0 seconds = 0 XP.
export const getTimeBasedXp = (seconds: number, xpPerSecond: number) =>
  seconds > 0 ? Math.max(MIN_ACTION_XP, Math.round(seconds * xpPerSecond)) : 0;

/* ---------------------------------------------------------------------------------------------------------
 * SECTION 2: MATERIALS
 * ------------------------------------------------------------------------------------------------------- */
export type MaterialConfigType = {
  spawnSeconds: number; // time for a station to make one unit
  unlockLevel: number; // level at which the station opens
  cap: number; // max units a player can hold
  collectXp: number; // XP granted each time one unit is collected; 0 = none. Keep it the smallest reward in the loop (collect < craft < sell)
};

// TO ADD A MATERIAL: add one line here. Ecosystem metadata (spawnIntervalSeconds, unlockLevel, rewardXP) overrides it.
// Timers come from the economy model v2 "Revised Seconds per Unit" (original spec times x speed multiplier 5).
export const MATERIALS: { [materialName: string]: MaterialConfigType } = {
  Wood: { spawnSeconds: 15, unlockLevel: 1, cap: 20 },
  Fabric: { spawnSeconds: 30, unlockLevel: 1, cap: 10 },
  Stuffing: { spawnSeconds: 50, unlockLevel: 2, cap: 10 },
  Thread: { spawnSeconds: 75, unlockLevel: 2, cap: 10 },
  Wheels: { spawnSeconds: 75, unlockLevel: 3, cap: 20 },
  Gears: { spawnSeconds: 100, unlockLevel: 3, cap: 10 },
  Paint: { spawnSeconds: 150, unlockLevel: 3, cap: 10 },
};

// Used for a material that isn't listed above (for example one added to the ecosystem later)
export const DEFAULT_MATERIAL: MaterialConfigType = { spawnSeconds: 0, unlockLevel: 1, cap: 10 };

// Looks up a material's settings by name ("Wheel", "wheels" and "Wheels" all work)
export const getMaterialConfig = (materialName: string): MaterialConfigType =>
  MATERIALS[toCanonicalMaterialName(materialName)] ?? DEFAULT_MATERIAL;

export const getMaterialCap = (name: string) => getMaterialConfig(name).cap;
export const getMaterialUnlockLevel = (name: string) => getMaterialConfig(name).unlockLevel;
export const getMaterialSpawnSeconds = (name: string) => getMaterialConfig(name).spawnSeconds;

// XP for collecting one unit of a material that takes this many seconds
export const getCollectXpForSeconds = (spawnSeconds: number) => getTimeBasedXp(spawnSeconds, XP_PER_SECOND.material);

// XP for collecting one unit of a named material (fixed override if set, otherwise from its timer)
export const getMaterialCollectXp = (name: string) => {
  const { collectXp, spawnSeconds } = getMaterialConfig(name);
  return collectXp ?? getCollectXpForSeconds(spawnSeconds);
};

/* ---------------------------------------------------------------------------------------------------------
 * SECTION 3: BOOSTERS
 * One-time use. Flow: BUY with Toy Tokens (adds one to the player's inventory) -> ACTIVATE (starts a timer
 * stored in visitor data) -> it expires. Boosters are NOT decorations: they are their own world prop.
 * Prices are about 1.2-1.5x the tokens a booster realistically earns; retune after a playtest.
 * Each booster matches a Lina ecosystem item by NAME (type "booster"). See getBoosterForItem below.
 * ------------------------------------------------------------------------------------------------------- */
export type BoosterIdType = "auto_collect" | "material_speed" | "instant_craft";

export type BoosterConfigType = {
  id: BoosterIdType;
  displayName: string; // shown to players AND used to match Lina's ecosystem item name
  cost: number; // Toy Tokens per purchase (this file is the source of truth, not item metadata)
  unlockLevel: number; // player level needed to buy it
  durationSeconds: number; // how long it stays active after activation
  maxUses?: number; // if set, it also ends after this many uses even if time remains
  timeMultiplier?: number; // fraction of the normal wait while active (0.5 = half the time, 0 = instant)
};

export const BOOSTERS: { [id in BoosterIdType]: BoosterConfigType } = {
  // Stations restart and collect on their own for 5 minutes (NOT built yet)
  auto_collect: {
    id: "auto_collect",
    displayName: "Auto-Collector",
    cost: 25, // about 1.3x the 15-20 tokens of materials that 5 minutes of stations make
    unlockLevel: 2,
    durationSeconds: 5 * 60,
  },
  // Material stations started while active take half the time
  material_speed: {
    id: "material_speed",
    displayName: "Speed-Up",
    cost: 15, // a bit above its real gain (~10-13 tokens) because crafting becomes the bottleneck
    unlockLevel: 2,
    durationSeconds: 5 * 60,
    timeMultiplier: 0.5,
  },
  // The next 10 crafts finish instantly, within 1 minute
  instant_craft: {
    id: "instant_craft",
    displayName: "Instant Craft",
    cost: 20, // crafting already runs while gathering, so this mostly brings income forward
    unlockLevel: 2,
    durationSeconds: 60,
    maxUses: 10, // ends after 10 crafts or 60 seconds, whichever comes first
    timeMultiplier: 0, // 0 = the craft is ready the moment it starts
  },
};

// Different boosters can run together. Buying is always allowed; activating one that is already running is blocked.
export const BOOSTER_RULES = { stackDifferentTypes: true, blockActivateWhileActive: true };

// What is stored in visitorData.activeBoosters[boosterId] while a booster runs
// What is stored in visitorData.activeBoosters[boosterId] while a booster runs (and until it is fully settled)
export type BoosterActiveStateType = {
  startedAt: number; // server ms timestamp of activation
  endsAt: number; // server ms timestamp it expires
  usesLeft?: number; // only for boosters with maxUses (Instant Craft)
  // Auto-Collector only: per material, the ms timestamp its virtual cycle is settled up to. Moves forward by whole
  // units so partial progress is never lost between loads.
  cursors?: { [materialName: string]: number };
  // Auto-Collector only: set once the booster has ended AND its last units were granted
  done?: boolean;
};

// Case, spaces and dashes don't matter: "Speed Up", "speed-up" and "Speed-Up" all match
const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

// Which booster an ecosystem item is (matched by name or displayName). undefined = not a known booster.
export const getBoosterForItem = (item: { name: string; displayName?: string }) =>
  Object.values(BOOSTERS).find((booster) =>
    [item.name, item.displayName ?? ""].some((value) => normalizeName(value) === normalizeName(booster.displayName)),
  );

// The booster's running state, or null if it isn't active (never activated, expired, or out of uses)
export const getActiveBooster = (
  active: { [id: string]: BoosterActiveStateType | null | undefined } | undefined,
  id: BoosterIdType,
  now = Date.now(),
) => {
  const state = active?.[id];
  if (!state || state.endsAt <= now) return null;
  if (state.usesLeft !== undefined && state.usesLeft <= 0) return null;
  return state;
};

// A timer start time moved back so the wait is multiplier x as long. The existing timer check then just works,
// and XP (which uses the base seconds) is unaffected.
export const getBackdatedStart = (now: number, baseSeconds: number, multiplier = 1) =>
  now - Math.round(baseSeconds * 1000 * (1 - multiplier));