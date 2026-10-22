import { useEffect, useId, useState } from "react";

// types
import { ToyRecipeType, ToyTypeId } from "@shared/constants";
import { InventoryItemType } from "@shared/types/InventoryItems";

// utils
import { WORLD_OBJECTS } from "@/utils";

// Placeholder toy art until toy items have images
const PLACEHOLDER_TOY_EMOJI: { [id in ToyTypeId]: string } = {
  rocking_horse: "🐴",
  teddy_bear: "🧸",
  train: "🚂",
};

const plural = (count: number, name: string) => `${count} ${name}${count === 1 ? "" : "s"}`;

/**
 * One crafted toy at the Cashier, compact for the drawer: name and the payout for the picked amount on top, then a
 * quantity picker (1 up to how many you have, starting at all of them) beside the Sell button. Toys you have none of
 * just say how to get one.
 */
export const SellCard = ({
  isBusy,
  isDisabled,
  onSell,
  ownedCount,
  recipe,
  toyItem,
}: {
  isBusy: boolean;
  isDisabled: boolean;
  onSell: (quantity: number) => void;
  ownedCount: number;
  recipe: ToyRecipeType;
  toyItem?: InventoryItemType;
}) => {
  const id = useId();
  // Starts at everything you have; − lowers it
  const [quantity, setQuantity] = useState(Math.max(ownedCount, 1));

  // Back to "all of them" whenever the count changes (a sale, or a newly crafted toy)
  useEffect(() => {
    setQuantity(Math.max(ownedCount, 1));
  }, [ownedCount]);

  // Always the toy type ("Teddy Bear"), not the crafted item's full name ("Brown Teddy Bear")
  const name = recipe.displayName;
  const tokensEach = toyItem?.reward || recipe.sellTokens;
  const xpEach = toyItem?.xpReward || recipe.sellXp;
  const canSell = !!toyItem && ownedCount > 0;
  const reason = !toyItem
    ? `The ${recipe.displayName} isn't set up yet.`
    : ownedCount < 1
      ? `Craft a ${recipe.displayName} at ${WORLD_OBJECTS.assembly} first.`
      : null;

  const setClamped = (value: number) => setQuantity(Math.min(Math.max(Math.round(value) || 1, 1), ownedCount));

  return (
    <li className="tc-recipe tc-sell-card" aria-labelledby={`${id}-title`}>
      <div className="tc-sell-card__header">
        <span className="tc-recipe__art" aria-hidden="true">
          {toyItem?.icon ? <img src={toyItem.icon} alt="" /> : PLACEHOLDER_TOY_EMOJI[recipe.id]}
        </span>
        <h3 id={`${id}-title`} className="tc-recipe__title">
          {name}
        </h3>
        {canSell && (
          <p className="tc-sell-card__payout" aria-live="polite">
            <span>
              <span aria-hidden="true">🪙 </span>+{tokensEach * quantity}
              <span className="sr-only"> Toy Tokens</span>
            </span>
            <span>+{xpEach * quantity} XP</span>
          </p>
        )}
      </div>

      {canSell ? (
        <div className="tc-sell-card__actions">
          <div className="tc-qty__controls">
            <label htmlFor={`${id}-qty`} className="sr-only">
              How many to sell
            </label>
            <button
              type="button"
              className="tc-qty__step"
              aria-label="One fewer"
              disabled={isDisabled || quantity <= 1}
              onClick={() => setClamped(quantity - 1)}
            >
              −
            </button>
            <input
              id={`${id}-qty`}
              className="tc-qty__input"
              type="number"
              inputMode="numeric"
              min={1}
              max={ownedCount}
              value={quantity}
              disabled={isDisabled}
              onChange={(event) => setClamped(Number(event.target.value))}
            />
            <button
              type="button"
              className="tc-qty__step"
              aria-label="One more"
              disabled={isDisabled || quantity >= ownedCount}
              onClick={() => setClamped(quantity + 1)}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="tc-sell-card__sell"
            disabled={isDisabled}
            aria-label={`Sell ${plural(quantity, name)}`}
            onClick={() => onSell(quantity)}
          >
            {isBusy ? "Selling..." : `Sell ${quantity}`}
          </button>
        </div>
      ) : (
        <p className="tc-recipe__blocked">{reason}</p>
      )}
    </li>
  );
};

export default SellCard;
