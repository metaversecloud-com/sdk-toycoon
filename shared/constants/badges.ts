import { DECOR_IMAGE_COLORS, DECOR_SPOTS, getDecorSlotType, PlacedDecorationsType } from "./decor.js";
import { TOY_RECIPES } from "./recipes.js";

export type BadgeTermType = "short" | "medium" | "long";

export type BadgeDefinitionType = {
  id: string; // matched (ignoring case and punctuation) to the BADGE ecosystem item's name, e.g. "Stocked Up"
  name: string;
  description: string;
  term: BadgeTermType;
};

// What a player's data needs for the badge checks (a subset of the visitor data object)
export type BadgeProgressType = {
  materialsCollected?: number;
  totalToysCrafted?: number;
  toysCraftedByType?: { [recipeId: string]: number };
  recentCraftTimes?: number[];
  totalToysSold?: number;
  totalCoinsEarned?: number;
  daysPlayed?: { [day: string]: boolean };
  shopsVisited?: { [ownerProfileId: string]: boolean };
  decorPlacedEver?: { [itemId: string]: boolean };
  placedDecorations?: PlacedDecorationsType;
};

type BadgeContextType = {
  progress: BadgeProgressType;
  level: number;
  urlSlug: string;
  // Every decoration and decor toy item, so placements (stored by id or by name) can be matched up
  decorItems: { id: string; name: string; type?: string; slot?: string; unlockLevel: number }[];
};

// From toycoon_badges.xlsx, in its order ("Are We There Yet?" left out). Descriptions use the in-game names.
export const BADGES: (BadgeDefinitionType & { isEarned: (context: BadgeContextType) => boolean })[] = [
  {
    id: "stocked_up",
    name: "Stocked Up",
    description: "Collect materials at the Materials Box for the first time.",
    term: "short",
    isEarned: ({ progress }) => (progress.materialsCollected || 0) >= 1,
  },
  {
    id: "first_creation",
    name: "First Creation",
    description: "Finish your very first toy at Toy Assembly.",
    term: "short",
    isEarned: ({ progress }) => (progress.totalToysCrafted || 0) >= 1,
  },
  {
    id: "first_sale",
    name: "First Sale",
    description: "Sell your first toy at the Cashier.",
    term: "short",
    isEarned: ({ progress }) => (progress.totalToysSold || 0) >= 1,
  },
  {
    id: "finishing_touch",
    name: "Finishing Touch",
    description: "Put your first decoration on your display.",
    term: "short",
    isEarned: (context) => getPlacedDecorNames(context).size >= 1,
  },
  {
    id: "teddy_time",
    name: "Teddy Time",
    description: "Reach Level 2 and unlock the Teddy Bear.",
    term: "short",
    isEarned: ({ level }) => level >= 2,
  },
  {
    id: "busy_hands",
    name: "Busy Hands",
    description: "Craft 10 toys.",
    term: "short",
    isEarned: ({ progress }) => (progress.totalToysCrafted || 0) >= 10,
  },
  {
    id: "all_aboard",
    name: "All Aboard!",
    description: "Reach Level 3 and unlock the Train.",
    term: "medium",
    isEarned: ({ level }) => level >= 3,
  },
  {
    id: "workshop_hero",
    name: "Workshop Hero",
    description: "Craft 100 toys.",
    term: "medium",
    isEarned: ({ progress }) => (progress.totalToysCrafted || 0) >= 100,
  },
  {
    id: "full_set",
    name: "Full Set",
    description: "Craft at least one of every toy: Rocking Horse, Teddy Bear, and Train.",
    term: "medium",
    isEarned: ({ progress }) => TOY_RECIPES.every(({ id }) => (progress.toysCraftedByType?.[id] || 0) >= 1),
  },
  {
    id: "piggy_bank",
    name: "Piggy Bank",
    description: "Earn 500 Toy Tokens in total.",
    term: "medium",
    isEarned: ({ progress }) => (progress.totalCoinsEarned || 0) >= 500,
  },
  {
    id: "supply_run",
    name: "Supply Run",
    description: "Collect 250 materials at the Materials Box.",
    term: "medium",
    isEarned: ({ progress }) => (progress.materialsCollected || 0) >= 250,
  },
  {
    id: "light_it_up",
    name: "Light It Up",
    description: "Hang lights on your display.",
    term: "medium",
    isEarned: (context) => getPlacedDecorItems(context).some((item) => getDecorSlotType(item) === "lights"),
  },
  {
    id: "color_coordinated",
    name: "Color Coordinated",
    description: "Put a rug and an awning of the same color on your display.",
    term: "medium",
    isEarned: ({ progress, urlSlug }) => {
      const placedName = (slotType: "rug" | "awning") => {
        const spot = Object.keys(DECOR_SPOTS).find((candidate) => DECOR_SPOTS[candidate] === slotType);
        return spot ? progress.placedDecorations?.[spot]?.[urlSlug] : null;
      };
      const rugColor = getDecorColor(placedName("rug"), "rug");
      return !!rugColor && rugColor === getDecorColor(placedName("awning"), "awning");
    },
  },
  {
    id: "assembly_line",
    name: "Assembly Line",
    description: "Craft 5 toys within 5 minutes.",
    term: "medium",
    isEarned: ({ progress }) => {
      const times = progress.recentCraftTimes || [];
      return times.length >= 5 && times[times.length - 1] - times[times.length - 5] <= 5 * 60 * 1000;
    },
  },
  {
    id: "regular",
    name: "Regular",
    description: "Play Toycoon on 3 different days.",
    term: "medium",
    isEarned: ({ progress }) => Object.keys(progress.daysPlayed || {}).length >= 3,
  },
  {
    id: "window_shopper",
    name: "Window Shopper",
    description: "Visit a classmate's display.",
    term: "medium",
    isEarned: ({ progress }) => Object.keys(progress.shopsVisited || {}).length >= 1,
  },
  {
    id: "toy_tycoon",
    name: "Toy Tycoon",
    description: "Craft 500 toys.",
    term: "long",
    isEarned: ({ progress }) => (progress.totalToysCrafted || 0) >= 500,
  },
  {
    id: "big_bank",
    name: "Big Bank",
    description: "Earn 5,000 Toy Tokens in total.",
    term: "long",
    isEarned: ({ progress }) => (progress.totalCoinsEarned || 0) >= 5000,
  },
  {
    id: "showstopper_shop",
    name: "Showstopper Shop",
    description: "Put every decoration you've unlocked, in every color, on your display at least once.",
    term: "long",
    isEarned: (context) => {
      const placed = getPlacedDecorNames(context);
      const unlocked = context.decorItems.filter(
        (item) => item.type !== "toy" && getDecorSlotType(item) && item.unlockLevel <= context.level,
      );
      return unlocked.length > 0 && unlocked.every(({ name }) => placed.has(name));
    },
  },
  {
    id: "bear_hugs",
    name: "Bear Hugs",
    description: "Craft 50 Teddy Bears.",
    term: "long",
    isEarned: ({ progress }) => (progress.toysCraftedByType?.teddy_bear || 0) >= 50,
  },
  {
    id: "giddy_up",
    name: "Giddy Up",
    description: "Craft 50 Rocking Horses.",
    term: "long",
    isEarned: ({ progress }) => (progress.toysCraftedByType?.rocking_horse || 0) >= 50,
  },
  {
    id: "conductor",
    name: "Conductor",
    description: "Craft 50 Trains.",
    term: "long",
    isEarned: ({ progress }) => (progress.toysCraftedByType?.train || 0) >= 50,
  },
  {
    id: "loyal_toymaker",
    name: "Loyal Toymaker",
    description: "Play Toycoon on 10 different days.",
    term: "long",
    isEarned: ({ progress }) => Object.keys(progress.daysPlayed || {}).length >= 10,
  },
  {
    id: "workshop_legend",
    name: "Workshop Legend",
    description: "Play Toycoon on 30 different days.",
    term: "long",
    isEarned: ({ progress }) => Object.keys(progress.daysPlayed || {}).length >= 30,
  },
  {
    id: "shop_hop",
    name: "Shop Hop",
    description: "Visit 5 different classmates' displays.",
    term: "long",
    isEarned: ({ progress }) => Object.keys(progress.shopsVisited || {}).length >= 5,
  },
];

export const BADGE_TERM_LABELS: { [term in BadgeTermType]: string } = {
  short: "Getting started",
  medium: "Rising toymaker",
  long: "Toy legend",
};

// Shop visits stop being recorded once this many are saved: Shop Hop is the largest goal that counts them
export const MAX_SHOPS_VISITED_TRACKED = 5;

// Assembly Line looks at the times of this many most recent crafts
export const RECENT_CRAFT_TIMES_KEPT = 5;

// "All Aboard!" → "allaboard", so a badge matches its ecosystem item however the item's name is punctuated
export const normalizeBadgeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

// The ids of the badges a player has earned by their progress, whether or not they've been granted yet
export const getEarnedBadgeIds = (context: BadgeContextType) =>
  BADGES.filter(({ isEarned }) => isEarned(context)).map(({ id }) => id);

// The color named in a rug/awning/lights item ("Blue Rug" → "blue"), if it's one of Lina's booth colors
export const getDecorColor = (itemName: string | null | undefined, slotType: "rug" | "awning" | "lights") => {
  if (!itemName) return undefined;
  const name = itemName.toLowerCase().replace(/[^a-z]/g, "");
  return DECOR_IMAGE_COLORS[slotType]?.find((color) => name.includes(color));
};

// Every decoration the player has ever put on a display: recorded by id since badges existed, plus whatever is placed
// right now in any world (placements made before badges were tracked)
const getPlacedDecorNames = ({ progress, decorItems }: BadgeContextType) => {
  const names = new Set<string>();
  for (const id of Object.keys(progress.decorPlacedEver || {})) {
    const item = decorItems.find((candidate) => candidate.id === id);
    if (item) names.add(item.name);
  }
  for (const placementsByWorld of Object.values(progress.placedDecorations || {})) {
    for (const name of Object.values(placementsByWorld || {})) if (name) names.add(name);
  }
  return names;
};

const getPlacedDecorItems = (context: BadgeContextType) => {
  const names = getPlacedDecorNames(context);
  return context.decorItems.filter(({ name }) => names.has(name));
};
