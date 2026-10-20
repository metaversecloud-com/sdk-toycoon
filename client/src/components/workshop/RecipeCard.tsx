import { useId } from "react";

// components
import { MaterialArt } from "@/components";

// types
import { ToyRecipeType, ToyTypeId } from "@shared/constants";
import { InventoryItemType } from "@shared/types/InventoryItems";

export type AssemblyStageType = "loose" | "wip" | "done";

const ASSEMBLY_STAGES: { id: AssemblyStageType; label: string }[] = [
  { id: "loose", label: "Loose Parts" },
  { id: "wip", label: "Work in Progress" },
  { id: "done", label: "Completed" },
];

// Placeholder toy art until toy items have images
const PLACEHOLDER_TOY_EMOJI: { [id in ToyTypeId]: string } = {
  rocking_horse: "🐴",
  teddy_bear: "🧸",
  train: "🚂",
};

/**
 * One toy recipe at the Workshop: its materials (have/need), shelf space, rewards, and the Craft button.
 * Crafted toys are sold at the separate Sell counter.
 * While crafting, the card plays the Loose Parts → Work in Progress → Completed moment.
 */
export const RecipeCard = ({
  assemblyStage,
  blockedReason,
  isDisabled,
  materialCounts,
  onCraft,
  ownedToyCount,
  recipe,
  toyItem,
}: {
  assemblyStage: AssemblyStageType | null;
  blockedReason: string | null;
  isDisabled: boolean;
  materialCounts: { [materialName: string]: number };
  onCraft: () => void;
  ownedToyCount: number;
  recipe: ToyRecipeType;
  // The one item this recipe crafts (e.g. Brown Teddy Bear); undefined if it isn't in the ecosystem yet
  toyItem?: InventoryItemType;
}) => {
  const id = useId();
  const sellTokens = toyItem?.reward || recipe.sellTokens;
  const sellXp = toyItem?.xpReward || recipe.sellXp;

  return (
    <li className={`tc-recipe${assemblyStage ? ` tc-recipe--${assemblyStage}` : ""}`} aria-labelledby={`${id}-title`}>
      <div className="tc-recipe__header">
        <span className="tc-recipe__art" aria-hidden="true">
          {toyItem?.icon ? <img src={toyItem.icon} alt="" /> : PLACEHOLDER_TOY_EMOJI[recipe.id]}
        </span>
        <div>
          <h3 id={`${id}-title`} className="tc-recipe__title">
            {recipe.displayName}
          </h3>
          <p className="tc-recipe__meta">
            Sells for {sellTokens} Toy Tokens · {sellXp} XP
          </p>
        </div>
      </div>

      <ul className="tc-recipe__materials" aria-label={`Materials for a ${recipe.displayName}`}>
        {Object.entries(recipe.materials).map(([name, needed]) => {
          const have = materialCounts[name] ?? 0;
          const hasEnough = have >= needed;
          return (
            <li key={name} className={`tc-recipe__material${hasEnough ? "" : " tc-recipe__material--short"}`}>
              <MaterialArt name={name} />
              <span>
                {name} {Math.min(have, needed)}/{needed}
              </span>
              <span aria-hidden="true">{hasEnough ? "✓" : "✗"}</span>
              <span className="sr-only">{hasEnough ? "enough" : `need ${needed - have} more`}</span>
            </li>
          );
        })}
      </ul>

      <p className="tc-recipe__meta">
        On your shelf: {ownedToyCount}/{recipe.cap}
      </p>

      {assemblyStage && (
        <ol className="tc-assembly" aria-label="Crafting progress">
          {ASSEMBLY_STAGES.map((stage) => (
            <li
              key={stage.id}
              className={`tc-assembly__stage${stage.id === assemblyStage ? " tc-assembly__stage--active" : ""}`}
              aria-current={stage.id === assemblyStage ? "step" : undefined}
            >
              {stage.label}
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        className="tc-cta"
        disabled={isDisabled || !!blockedReason || !toyItem}
        aria-describedby={blockedReason ? `${id}-blocked` : undefined}
        onClick={onCraft}
      >
        {assemblyStage && assemblyStage !== "done" ? "Crafting..." : `Craft ${toyItem?.displayName ?? recipe.displayName}`}
      </button>
      {blockedReason && (
        <p id={`${id}-blocked`} className="tc-recipe__blocked">
          {blockedReason}
        </p>
      )}

    </li>
  );
};

export default RecipeCard;
