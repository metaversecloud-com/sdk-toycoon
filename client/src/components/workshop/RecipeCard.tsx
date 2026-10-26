import { useId } from "react";

// components
import { MaterialArt } from "@/components";

// types
import { ToyRecipeType, ToyTypeId } from "@shared/constants";
import { InventoryItemType } from "@shared/types/InventoryItems";
import { MaterialBinStateType } from "@shared/utils/getMaterialBinState";

// Placeholder toy art until toy items have images
const PLACEHOLDER_TOY_EMOJI: { [id in ToyTypeId]: string } = {
  rocking_horse: "🐴",
  teddy_bear: "🧸",
  train: "🚂",
};

// The brief's three visible workstation states, driven by the craft timer
const ASSEMBLY_STAGES: { state: MaterialBinStateType; label: string }[] = [
  { state: "idle", label: "Loose Parts" },
  { state: "generating", label: "Work in Progress" },
  { state: "ready", label: "Completed" },
];

const formatTime = (totalSeconds: number) =>
  `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;

/**
 * One toy's workbench: materials (have/need), shelf space, and the craft timer.
 * Loose Parts (Craft) → Work in Progress (countdown) → Completed (Collect). Crafted toys are sold at the Cashier.
 */
export const RecipeCard = ({
  blockedReason,
  craftState,
  isDisabled,
  materialCounts,
  materialIcons,
  onCollect,
  onCraft,
  ownedToyCount,
  recipe,
  secondsRemaining,
  toyItem,
}: {
  blockedReason: string | null;
  craftState: MaterialBinStateType;
  isDisabled: boolean;
  materialCounts: { [materialName: string]: number };
  // The in-game icon for each material (same art as the Materials Box)
  materialIcons: { [materialName: string]: string };
  onCollect: () => void;
  onCraft: () => void;
  ownedToyCount: number;
  recipe: ToyRecipeType;
  secondsRemaining: number;
  // The one item this recipe crafts (e.g. Brown Teddy Bear); undefined if it isn't in the ecosystem yet
  toyItem?: InventoryItemType;
}) => {
  const id = useId();
  // Always the toy type ("Teddy Bear"), not the crafted item's full name ("Brown Teddy Bear")
  const toyName = recipe.displayName;
  const percentDone = Math.round(((recipe.craftSeconds - secondsRemaining) / recipe.craftSeconds) * 100);
  const isCrafting = craftState !== "idle";

  const renderAction = () => {
    if (craftState === "ready") {
      return (
        <button type="button" className="tc-cta" disabled={isDisabled} onClick={onCollect}>
          Collect {toyName}
        </button>
      );
    }

    if (craftState === "generating") {
      return (
        <div className="tc-craft-timer">
          <p className="tc-recipe__meta">
            <span aria-hidden="true">🕒 </span>Ready in {formatTime(secondsRemaining)}
          </p>
          <span
            className="tc-progress tc-craft-timer__bar"
            role="progressbar"
            aria-label={`${toyName} crafting progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentDone}
          >
            {/* Width is runtime data, so it's the one inline style here */}
            <span className="tc-progress__fill" style={{ width: `${percentDone}%` }} />
          </span>
        </div>
      );
    }

    return (
      <>
        <button
          type="button"
          className="tc-cta"
          disabled={isDisabled || !!blockedReason || !toyItem}
          aria-describedby={blockedReason ? `${id}-blocked` : undefined}
          onClick={onCraft}
        >
          Craft {toyName}
        </button>
        {blockedReason && (
          <p id={`${id}-blocked`} className="tc-recipe__blocked">
            {blockedReason}
          </p>
        )}
      </>
    );
  };

  return (
    <li className={`tc-recipe tc-recipe--${craftState}`} aria-labelledby={`${id}-title`}>
      <div className="tc-recipe__header">
        <span className="tc-recipe__art" aria-hidden="true">
          {toyItem?.icon ? <img src={toyItem.icon} alt="" /> : PLACEHOLDER_TOY_EMOJI[recipe.id]}
        </span>
        <div>
          <h3 id={`${id}-title`} className="tc-recipe__title">
            {toyName}
          </h3>
          <p className="tc-recipe__meta">
            Takes {formatTime(recipe.craftSeconds)}
          </p>
        </div>
      </div>

      {!isCrafting && (
        <ul className="tc-recipe__materials" aria-label={`Materials for a ${recipe.displayName}`}>
          {Object.entries(recipe.materials).map(([name, needed]) => {
            const have = materialCounts[name] ?? 0;
            const hasEnough = have >= needed;
            return (
              <li key={name} className={`tc-recipe__material${hasEnough ? "" : " tc-recipe__material--short"}`}>
                <MaterialArt imageUrl={materialIcons[name]} name={name} />
                <span>
                  {name} {Math.min(have, needed)}/{needed}
                </span>
                <span aria-hidden="true">{hasEnough ? "✓" : "✗"}</span>
                <span className="sr-only">{hasEnough ? "enough" : `need ${needed - have} more`}</span>
              </li>
            );
          })}
        </ul>
      )}

      <ol className="tc-assembly" aria-label="Crafting progress">
        {ASSEMBLY_STAGES.map((stage) => (
          <li
            key={stage.state}
            className={`tc-assembly__stage${stage.state === craftState ? " tc-assembly__stage--active" : ""}`}
            aria-current={stage.state === craftState ? "step" : undefined}
          >
            {stage.label}
          </li>
        ))}
      </ol>

      <p className="tc-recipe__meta">
        On your shelf: {ownedToyCount}/{recipe.cap}
        {isCrafting ? " (+1 being made)" : ""}
      </p>

      {renderAction()}
    </li>
  );
};

export default RecipeCard;
