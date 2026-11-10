import { getTimeBasedXp, XP_PER_SECOND } from "./economy.js";
import { toCanonicalMaterialName } from "./materialNames.js";

// Toy recipes and economy, from toycoon-economy-model.xlsx (v2, "Recipes & Sustainable Output" tab) and the brief's
// level table (section 3). Crafting, selling, and the UI all read from here so the numbers live in one place.

export type ToyTypeId = "rocking_horse" | "teddy_bear" | "train";

export interface ToyRecipeType {
  id: ToyTypeId;
  displayName: string;
  unlockLevel: number; // player level needed to craft it
  // Material name (as in the ecosystem, e.g. "Wood") -> quantity used per craft
  materials: { [materialName: string]: number };
  // Fixed sell price (V1 has no order matching). Ecosystem metadata rewardTokens / rewardXP override these per item.
  sellTokens: number; // Toy Tokens earned when sold
  sellXp: number; // XP earned when sold
  // OPTIONAL fixed XP for collecting a finished toy. Leave it out and the XP comes from craftSeconds (see getCraftXp)
  craftXp?: number;
  // Max finished toys of this type a player can hold unsold (a toy being crafted counts too)
  cap: number;
  // How long crafting takes. About 2/3 of the recipe's material bottleneck time, so materials can be gathered while
  // a toy is being made. Also drives the craft XP.
  craftSeconds: number;
  // Crafting always produces this one item. Other colors (White Teddy Bear, Silver Train) are decoration variants
  // only and are never crafted.
  craftedColor?: string;
}

/* ---------------------------------------------------------------------------------------------------------
 * THE THREE RECIPES
 * ------------------------------------------------------------------------------------------------------- */
export const TOY_RECIPES: ToyRecipeType[] = [
  {
    id: "rocking_horse",
    displayName: "Rocking Horse",
    unlockLevel: 1,
    materials: { Wood: 3, Fabric: 1 },
    sellTokens: 3,
    sellXp: 10,
    cap: 10,
    craftSeconds: 30,
  },
  {
    id: "teddy_bear",
    displayName: "Teddy Bear",
    unlockLevel: 2,
    materials: { Stuffing: 2, Thread: 1, Fabric: 1 },
    sellTokens: 5,
    sellXp: 25,
    cap: 8,
    craftSeconds: 60,
    craftedColor: "Brown",
  },
  {
    id: "train",
    displayName: "Train",
    unlockLevel: 3,
    materials: { Wood: 5, Wheels: 4, Gears: 2, Paint: 1 },
    sellTokens: 20,
    sellXp: 100,
    cap: 5,
    craftSeconds: 180,
    craftedColor: "Black",
  },
];

/* ---------------------------------------------------------------------------------------------------------
 * LEVEL-UP REWARDS
 * Toy Tokens paid once when a player reaches a level (economy model, Leveling tab)
 * ------------------------------------------------------------------------------------------------------- */
export const LEVEL_UP_TOKEN_REWARDS: { [level: number]: number } = {
  2: 10,
  3: 30,
};

/* ---------------------------------------------------------------------------------------------------------
 * LOOKUPS
 * ------------------------------------------------------------------------------------------------------- */
export const getToyRecipeById = (id: ToyTypeId) => TOY_RECIPES.find((recipe) => recipe.id === id);

// XP for collecting a finished toy: the recipe's own craftXp if set, otherwise based on its craft time.
// Uses the BASE craftSeconds, so a booster that shortens crafting never lowers XP.
export const getCraftXp = (recipe: ToyRecipeType) =>
  recipe.craftXp ?? getTimeBasedXp(recipe.craftSeconds, XP_PER_SECOND.craft);

/**
 * Maps an item to its toy type by the type's name appearing in the item's name (for example "Brown Teddy Bear" or
 * "Teddy Bear Brown" -> Teddy Bear). Returns undefined for anything that isn't a known toy.
 */
export const getToyRecipeForItem = (itemName: string) => {
  const normalized = itemName.toLowerCase();
  return TOY_RECIPES.find((recipe) => normalized.includes(recipe.displayName.toLowerCase()));
};

export const getUnlockedRecipes = (level: number) => TOY_RECIPES.filter((recipe) => recipe.unlockLevel <= level);

/* ---------------------------------------------------------------------------------------------------------
 * CRAFTING CHECKS
 * ------------------------------------------------------------------------------------------------------- */

// What's still needed to craft a recipe, given the player's material counts by name. Empty object = can craft.
export const getMissingMaterials = (
  recipe: ToyRecipeType,
  ownedByName: { [materialName: string]: number },
): { [materialName: string]: number } =>
  Object.fromEntries(
    Object.entries(recipe.materials)
      .map(([name, needed]) => [name, needed - (ownedByName[name] ?? 0)] as const)
      .filter(([, short]) => short > 0),
  );

export const canCraft = (recipe: ToyRecipeType, ownedByName: { [materialName: string]: number }) =>
  Object.keys(getMissingMaterials(recipe, ownedByName)).length === 0;

type OwnedItemType = { name: string; quantity: number };

// The player's materials as { materialName: quantity }, for comparing against recipes (which use material names)
export const getMaterialCountsByName = (materials: { [itemId: string]: OwnedItemType } = {}) =>
  Object.values(materials).reduce<{ [materialName: string]: number }>((counts, { name, quantity }) => {
    const materialName = toCanonicalMaterialName(name);
    counts[materialName] = (counts[materialName] ?? 0) + (quantity || 0);
    return counts;
  }, {});

// How many of the recipe's crafted toy the player holds (for its shelf cap). Only the crafted item counts; other
// colors are decoration variants and don't take shelf space.
export const countOwnedToys = (
  recipe: ToyRecipeType,
  toys: { [itemId: string]: OwnedItemType & { displayName?: string } } = {},
) =>
  Object.values(toys)
    .filter((toy) => getCraftedToyItem(recipe, [toy]))
    .reduce((total, { quantity }) => total + (quantity || 0), 0);

// Turns missing materials into text: "2 more Wood and 1 more Paint"
export const describeMissingMaterials = (missing: { [materialName: string]: number }) =>
  Object.entries(missing)
    .map(([name, short]) => `${short} more ${name}`)
    .join(" and ");

/**
 * The single ecosystem item a recipe crafts: the toy type's item, in the recipe's craftedColor if it has one
 * (Brown Teddy Bear, Black Train). Matches either word order ("Brown Teddy Bear" / "Teddy Bear Brown").
 */
export const getCraftedToyItem = <T extends { name: string; displayName?: string }>(recipe: ToyRecipeType, items: T[]) =>
  items.find((item) => {
    const names = [item.name, item.displayName ?? ""].map((name) => name.toLowerCase());
    return names.some(
      (name) =>
        name.includes(recipe.displayName.toLowerCase()) &&
        (!recipe.craftedColor || name.includes(recipe.craftedColor.toLowerCase())),
    );
  });