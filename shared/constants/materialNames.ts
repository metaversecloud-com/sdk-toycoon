// The material names the game's constants and recipes use (caps, unlock levels, timers, recipe ingredients)
export const KNOWN_MATERIAL_NAMES = ["Wood", "Fabric", "Stuffing", "Thread", "Wheels", "Gears", "Paint"] as const;

// "Wheels", "wheel", " Wheel " → "wheel": case, spacing, and a trailing plural "s" don't matter
const normalize = (name: string) => name.trim().toLowerCase().replace(/s$/, "");

/**
 * Maps an ecosystem item name to the game's name for that material (e.g. "Wheel" or "wheels" → "Wheels"), so a small
 * naming difference in the ecosystem doesn't silently drop a material's level, cap, timer, or recipe use.
 * Unknown materials keep their own name.
 */
export const toCanonicalMaterialName = (name: string) =>
  KNOWN_MATERIAL_NAMES.find((known) => normalize(known) === normalize(name || "")) ?? name;
