import { toCanonicalMaterialName } from "./materialNames.js";

export type MaterialConfigType = {
  spawnSeconds: number; // time for a station to make one unit
  unlockLevel: number; // level at which the station opens
  cap: number; // max units a player can hold
  collectXp: number; // XP granted each time one unit is collected
};

// To add a material: add one line here. Ecosystem metadata (spawnIntervalSeconds, unlockLevel, rewardXP) overrides these.
// Timers are the economy model's v2 "Revised Seconds per Unit" (baseline x Speed Multiplier 5).
export const MATERIALS: { [materialName: string]: MaterialConfigType } = {
  Wood: { spawnSeconds: 15, unlockLevel: 1, cap: 20, collectXp: 1 },
  Fabric: { spawnSeconds: 30, unlockLevel: 1, cap: 10, collectXp: 1 },
  Stuffing: { spawnSeconds: 50, unlockLevel: 2, cap: 10, collectXp: 1 },
  Thread: { spawnSeconds: 75, unlockLevel: 2, cap: 10, collectXp: 1 },
  Wheels: { spawnSeconds: 75, unlockLevel: 3, cap: 20, collectXp: 1 },
  Gears: { spawnSeconds: 100, unlockLevel: 3, cap: 10, collectXp: 1 },
  Paint: { spawnSeconds: 150, unlockLevel: 3, cap: 10, collectXp: 1 },
};

// For a material not listed above (e.g. added to the ecosystem later), matching the old fallbacks
export const DEFAULT_MATERIAL: MaterialConfigType = { spawnSeconds: 0, unlockLevel: 1, cap: 10, collectXp: 1 };

export const getMaterialConfig = (materialName: string): MaterialConfigType =>
  MATERIALS[toCanonicalMaterialName(materialName)] ?? DEFAULT_MATERIAL;

export const getMaterialCap = (name: string) => getMaterialConfig(name).cap;
export const getMaterialUnlockLevel = (name: string) => getMaterialConfig(name).unlockLevel;
export const getMaterialSpawnSeconds = (name: string) => getMaterialConfig(name).spawnSeconds;
export const getMaterialCollectXp = (name: string) => getMaterialConfig(name).collectXp;