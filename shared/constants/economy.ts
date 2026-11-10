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
  spawnSeconds: number; // seconds a station takes to make one unit (also drives collect XP)
  unlockLevel: number; // player level at which the station opens
  cap: number; // most units a player can hold; the station can't start or collect at the cap
  collectXp?: number; // optional: set a fixed XP for this material. Leave out to use the time formula
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
 * Bought with Toy Tokens for ONE-TIME use, then activated by the player and they expire.
 * Boosters are NOT decorations: they are a separate world prop (up-arrow icon) and are consumed, never placed.
 * NOTE: these are the settings only. The buy/activate logic is not built yet.
 * Prices are about 1.2-1.5x the tokens a booster realistically earns; retune after a playtest.
 * ------------------------------------------------------------------------------------------------------- */
export type BoosterIdType = "auto_collect" | "material_speed" | "instant_craft";

export type BoosterConfigType = {
  id: BoosterIdType;
  displayName: string; // name shown to players
  cost: number; // Toy Tokens per purchase
  unlockLevel: number; // player level needed to buy it
  durationSeconds: number; // how long it stays active after the player activates it
  maxUses?: number; // if set, it also ends after this many uses, even if time remains
  timeMultiplier?: number; // station time is multiplied by this while active (0.5 = twice as fast)
};

export const BOOSTERS: { [id in BoosterIdType]: BoosterConfigType } = {
  // Stations restart and collect themselves for 5 minutes
  auto_collect: {
    id: "auto_collect",
    displayName: "Auto-Collector",
    cost: 25, // about 1.3x the 15-20 tokens of materials that 5 minutes of stations make
    unlockLevel: 2,
    durationSeconds: 5 * 60,
  },
  // Material stations take half the time for 5 minutes
  material_speed: {
    id: "material_speed",
    displayName: "Speed-Up",
    cost: 15, // a bit above its real gain (~10-13 tokens) because crafting becomes the bottleneck
    unlockLevel: 2,
    durationSeconds: 5 * 60,
    timeMultiplier: 0.5, // collect XP still uses the base seconds
  },
  // The next 10 crafts finish instantly, within 1 minute
  instant_craft: {
    id: "instant_craft",
    displayName: "Instant Craft",
    cost: 20, // crafting already runs while gathering, so this mostly brings income forward
    unlockLevel: 2,
    durationSeconds: 60,
    maxUses: 10, // ends after 10 crafts or 60 seconds, whichever comes first
  },
};

// Different boosters can run together; buying the same one while it's active is blocked so a purchase isn't wasted
export const BOOSTER_RULES = { stackDifferentTypes: true, blockReactivateWhileActive: true };

// A station time after a booster is applied (rounded up to whole seconds)
export const getBoostedSeconds = (baseSeconds: number, timeMultiplier = 1) => Math.ceil(baseSeconds * timeMultiplier);