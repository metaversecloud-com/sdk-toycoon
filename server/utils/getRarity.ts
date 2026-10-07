// shared/utils/getRarity.ts
const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
export const getRarity = (value = 0) =>
  RARITIES[Math.min(Math.max(Math.round(value), 0), RARITIES.length - 1)];