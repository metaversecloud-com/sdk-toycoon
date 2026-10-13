// Max units of each material a player can hold (brief §4). Once a material is at its cap, its bin can't be started or
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

export const getMaterialCap = (materialName: string) => MATERIAL_CAPS[materialName] ?? DEFAULT_MATERIAL_CAP;
