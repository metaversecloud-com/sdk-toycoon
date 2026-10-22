import { toCanonicalMaterialName } from "./materialNames.js";

// Max units of each material a player can hold (brief §4; matches the economy model's Materials tab). Once a material is at its cap, its bin can't be started or
// collected until the player spends some down. Keyed by the ecosystem item's name.
export const MATERIAL_CAPS: { [materialName: string]: number } = {
  Wood: 20,
  Fabric: 10,
  Stuffing: 10,
  Thread: 10,
  Wheels: 20,
  Gears: 10,
  Paint: 10,
};

// Cap for any material not listed above (e.g. one added to the ecosystem later)
export const DEFAULT_MATERIAL_CAP = 10;

export const getMaterialCap = (materialName: string) =>
  MATERIAL_CAPS[toCanonicalMaterialName(materialName)] ?? DEFAULT_MATERIAL_CAP;

// The level each material first becomes collectable, from the brief's level table (§3): each level unlocks the
// materials its new toy needs. Used when the ecosystem item's metadata doesn't set unlockLevel.
//   Level 1 — Rocking Horse: Wood, Fabric
//   Level 2 — Teddy Bear:    + Stuffing, Thread (reuses Fabric)
//   Level 3 — Train:         + Wheels, Gears, Paint (reuses Wood)
export const MATERIAL_UNLOCK_LEVELS: { [materialName: string]: number } = {
  Wood: 1,
  Fabric: 1,
  Stuffing: 2,
  Thread: 2,
  Wheels: 3,
  Gears: 3,
  Paint: 3,
};

// Seconds a station takes to make one unit, used when the ecosystem item's metadata doesn't set spawnIntervalSeconds.
// From toycoon-economy-model.xlsx (v2), Materials tab "Revised Seconds per Unit": the original spec's baseline
// times x the model's Speed Multiplier of 5. If the multiplier changes in the model, update these to match.
export const MATERIAL_SPAWN_SECONDS: { [materialName: string]: number } = {
  Wood: 15,
  Fabric: 30,
  Stuffing: 50,
  Thread: 75,
  Wheels: 75,
  Gears: 100,
  Paint: 150,
};

export const getMaterialUnlockLevel = (materialName: string) =>
  MATERIAL_UNLOCK_LEVELS[toCanonicalMaterialName(materialName)] ?? 1;

export const getMaterialSpawnSeconds = (materialName: string) =>
  MATERIAL_SPAWN_SECONDS[toCanonicalMaterialName(materialName)] ?? 0;

export * from "./recipes.js";
export * from "./materialNames.js";
export * from "./decorations.js";