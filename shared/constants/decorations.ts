// shared/constants/decorations.ts
export type DecorSlotId = "rug" | "teddy_bear" | "lights" | "train" | "awning";

export type DecorSlotType = {
  id: DecorSlotId;
  namePrefix: string; // ecosystem item names start with this (Lina: "Rug Pink", etc.)
  anchorUniqueName: string; // unique name of the pre-placed anchor asset in each booth scene
  unlockLevel: number;
};

// ASSUMPTIONS to confirm against Lina's real item names and the booth scene's anchor names
export const DECOR_SLOTS: DecorSlotType[] = [
  { id: "teddy_bear", namePrefix: "Teddy Bear", anchorUniqueName: "toycoon_teddy_bear", unlockLevel: 2 },
  { id: "rug", namePrefix: "Rug", anchorUniqueName: "toycoon_rug", unlockLevel: 2 },
  { id: "train", namePrefix: "Train", anchorUniqueName: "toycoon_train", unlockLevel: 3 },
  { id: "awning", namePrefix: "Awning", anchorUniqueName: "toycoon_awning", unlockLevel: 3 },
  { id: "lights", namePrefix: "Lights", anchorUniqueName: "toycoon_lights", unlockLevel: 3 },
];

export const getDecorSlot = (itemName: string) =>
  DECOR_SLOTS.find(({ namePrefix }) => itemName.toLowerCase().startsWith(namePrefix.toLowerCase()));

export const getDecorUnlockLevel = (itemName: string) => getDecorSlot(itemName)?.unlockLevel ?? 1;

// How many copies of a decoration are currently placed, across all worlds
export const countPlaced = (
  placed: { [slotId: string]: { [urlSlug: string]: string } } | undefined,
  decorationName: string,
) =>
  Object.values(placed ?? {}).reduce(
    (total, byWorld) => total + Object.values(byWorld ?? {}).filter((name) => name === decorationName).length,
    0,
  );