// Booth decor (Phase 3): which items can go on which spot in a booth scene, and how placements are counted.
// Every booth scene has one web-image asset per spot, with the spot's unique name. Placing a decoration swaps that
// asset's picture; one item per spot.

export type DecorSlotType = "rug" | "awning" | "lights" | "toy";

// Spot unique name → what can go there. Rug, awning, and lights each have one spot; toys can go on any of the three.
export const DECOR_SPOTS: { [spot: string]: DecorSlotType } = {
  toycoon_awning: "awning",
  toycoon_lights: "lights",
  toycoon_rug: "rug",
  toycoon_slot1: "toy",
  toycoon_slot2: "toy",
  toycoon_slot3: "toy",
};

// Toys on the toy spots are sized to fit inside this box (world pixels, keeping their proportions), and an empty toy
// spot shows the app's transparent picture of the same size. Amanda picked 80px in a real booth (2026-10-25).
export const TOY_SPOT_SIZE = 80;

export const DECOR_SPOT_LABELS: { [spot: string]: string } = {
  toycoon_awning: "Awning",
  toycoon_lights: "Lights",
  toycoon_rug: "Rug",
  toycoon_slot1: "Toy 1",
  toycoon_slot2: "Toy 2",
  toycoon_slot3: "Toy 3",
};

export const DECOR_SLOT_TYPE_LABELS: { [slotType in DecorSlotType]: string } = {
  awning: "Awnings",
  lights: "Lights",
  rug: "Rugs",
  toy: "Toys",
};

// The sign at the top of every booth: "Claim Me!" while open, "<name>'s Display" once claimed
export const SIGN_UNIQUE_NAME = "toycoon_sign";
export const UNCLAIMED_SIGN_TEXT = "Claim Me!";
export const getClaimedSignText = (displayName: string) => `${displayName || "My"}'s Display`;

// The level a decoration unlocks at when its metadata doesn't set unlockLevel, by the start of its name (Lina's items
// are named like "Rug Pink"). From Angel's decorations work; confirm against Lina's real item names.
const DECOR_UNLOCK_LEVELS: { namePrefix: string; unlockLevel: number }[] = [
  { namePrefix: "Teddy Bear", unlockLevel: 2 },
  { namePrefix: "Rug", unlockLevel: 2 },
  { namePrefix: "Train", unlockLevel: 3 },
  { namePrefix: "Awning", unlockLevel: 3 },
  { namePrefix: "Lights", unlockLevel: 3 },
];

export const getDecorUnlockLevel = (itemName: string) =>
  DECOR_UNLOCK_LEVELS.find(({ namePrefix }) => itemName.toLowerCase().startsWith(namePrefix.toLowerCase()))
    ?.unlockLevel ?? 1;

// Price for a decoration whose ecosystem item has no cost set yet.
// TODO: replace with Lina's prices (each item's metadata.cost)
export const DEFAULT_DECOR_COST = 10;

type DecorItemType = { type?: string; slot?: string; name: string; cost?: number; layerUrl?: string; icon?: string };

const SLOT_TYPES: DecorSlotType[] = ["rug", "awning", "lights", "toy"];

/**
 * Which spots an item can go on. Toys go on the toy spots. Decorations use their metadata.slot if set ("rug",
 * "awning", "lights", or a spot's unique name), otherwise their name ("Blue Rug" → rug, "Fairy Lights" → lights).
 * null = not a booth decoration.
 */
export const getDecorSlotType = (item: DecorItemType): DecorSlotType | null => {
  if (item.type === "toy") return "toy";
  if (item.type !== "decoration") return null;

  const slot = (item.slot || "").trim().toLowerCase();
  if (DECOR_SPOTS[slot]) return DECOR_SPOTS[slot];
  const fromSlot = SLOT_TYPES.find((slotType) => slot === slotType || slot === slotType.replace(/s$/, ""));
  if (fromSlot) return fromSlot;

  const name = item.name.toLowerCase();
  if (name.includes("rug")) return "rug";
  if (name.includes("awning")) return "awning";
  if (name.includes("light")) return "lights";
  return null;
};

export const getSpotsForSlotType = (slotType: DecorSlotType) =>
  Object.keys(DECOR_SPOTS).filter((spot) => DECOR_SPOTS[spot] === slotType);

export const getDecorPrice = (item: DecorItemType) => item.cost || DEFAULT_DECOR_COST;

// Lina's booth pictures for rugs, awnings, and lights (made to fit the booth): booth-<kind>-<color>.png, e.g.
// booth-rug-pink.png. The colors she uploaded, by kind (2026-10-26).
export const DECOR_IMAGE_BASE_URL = "https://sdk-toycoon.s3.us-east-1.amazonaws.com";
export const DECOR_IMAGE_COLORS: { [slotType in DecorSlotType]?: string[] } = {
  awning: ["blue", "green", "pink"],
  lights: ["white", "multicolor"],
  rug: ["blue", "green", "pink"],
};

// What each kind of spot shows with nothing on it (Lina's pictures, same sizes as the decorations that go there)
export const DECOR_EMPTY_IMAGES: { [slotType in DecorSlotType]: string } = {
  awning: `${DECOR_IMAGE_BASE_URL}/awning-empty.png`,
  lights: `${DECOR_IMAGE_BASE_URL}/lights-empty.png`,
  rug: `${DECOR_IMAGE_BASE_URL}/rug-empty.png`,
  toy: `${DECOR_IMAGE_BASE_URL}/toy-empty.png`,
};

export const getEmptySpotImage = (spot: string) => DECOR_EMPTY_IMAGES[DECOR_SPOTS[spot]];

/**
 * The picture shown on a spot: the item's layerUrl if set; otherwise, for rugs, awnings, and lights, Lina's booth
 * picture in the color named in the item ("Rug Pink" / "Pink Rug" → booth-rug-pink.png, "Multi-Color Lights" →
 * booth-lights-multicolor.png); otherwise (toys, unknown colors) the item's inventory image.
 */
export const getDecorImageUrl = (item: DecorItemType) => {
  if (item.layerUrl) return item.layerUrl;
  const slotType = getDecorSlotType(item);
  const name = item.name.toLowerCase().replace(/[^a-z]/g, "");
  const color = slotType ? DECOR_IMAGE_COLORS[slotType]?.find((candidate) => name.includes(candidate)) : undefined;
  if (slotType && color) return `${DECOR_IMAGE_BASE_URL}/booth-${slotType}-${color}.png`;
  return item.icon || "";
};

/**
 * How many copies of a decoration the player owns for decorating. Toys bought at the Decorations shop are tracked on
 * the player's data object (decorToys), separately from crafted toys, which are for selling. Rugs, awnings, and lights
 * are ordinary inventory items.
 */
export const getOwnedDecorCount = (
  item: { id: string; type?: string },
  visitorInventory?: { decorations: { [itemId: string]: { quantity: number } } },
  visitorData?: { decorToys?: { [itemId: string]: number } },
) =>
  item.type === "toy" ? visitorData?.decorToys?.[item.id] ?? 0 : visitorInventory?.decorations[item.id]?.quantity ?? 0;

// { [spot]: { [urlSlug]: item name } }, as stored on the visitor's data object. null = removed.
export type PlacedDecorationsType = { [spot: string]: { [urlSlug: string]: string | null } };

/**
 * How many of an item (by name) are placed, across every spot in every world. Pass except to leave one placement out
 * (the spot being changed). A player can place as many copies as they own.
 */
export const countPlacements = (
  placedDecorations: PlacedDecorationsType | undefined,
  itemName: string,
  except?: { spot: string; urlSlug: string },
) => {
  let count = 0;
  for (const [spot, byWorld] of Object.entries(placedDecorations || {})) {
    for (const [urlSlug, placedName] of Object.entries(byWorld || {})) {
      if (placedName !== itemName) continue;
      if (except && except.spot === spot && except.urlSlug === urlSlug) continue;
      count++;
    }
  }
  return count;
};

// This world's placements: { [spot]: item name }
export const getPlacementsInWorld = (placedDecorations: PlacedDecorationsType | undefined, urlSlug: string) =>
  Object.fromEntries(
    Object.keys(DECOR_SPOTS)
      .map((spot) => [spot, placedDecorations?.[spot]?.[urlSlug] ?? null] as const)
      .filter(([, name]) => !!name),
  ) as { [spot: string]: string };
