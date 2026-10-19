import { toCanonicalMaterialName } from "@shared/constants";

// Placeholder art until each material item gets a stationImageUrl (station) / icon (inventory bar) in its metadata
const PLACEHOLDER_EMOJI: { [materialName: string]: string } = {
  Wood: "🪵",
  Fabric: "🧶",
  Stuffing: "☁️",
  Thread: "🧵",
  Wheels: "🛞",
  Gears: "⚙️",
  Paint: "🎨",
};

/**
 * Decorative only — every place this is used has the material's name in text next to it, so it's hidden from
 * screen readers.
 */
export const MaterialArt = ({ imageUrl, name }: { imageUrl?: string; name: string }) => {
  if (imageUrl) return <img src={imageUrl} alt="" aria-hidden="true" />;
  return <span aria-hidden="true">{PLACEHOLDER_EMOJI[toCanonicalMaterialName(name)] ?? "📦"}</span>;
};

export default MaterialArt;
