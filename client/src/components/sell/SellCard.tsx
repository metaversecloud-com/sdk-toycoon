//client/src/components/sell/SellCard.tsx
import { useEffect, useId, useState } from "react";

// types
import { ToyRecipeType, ToyTypeId } from "@shared/constants";
import { InventoryItemType } from "@shared/types/InventoryItems";

// Placeholder toy art until toy items have images
const PLACEHOLDER_TOY_EMOJI: { [id in ToyTypeId]: string } = {
  rocking_horse: "🐴",
  teddy_bear: "🧸",
  train: "🚂",
};

const plural = (count: number, name: string) => `${count} ${name}${count === 1 ? "" : "s"}`;

/**
 * One crafted toy on the Sell counter: how many you have, a quantity picker (1 up to how many you have), the payout for
 * that many, and the Sell button.
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
  const [quantity, setQuantity] = useState(1);

  // Keep the picked amount within what the player has (e.g. after selling some)
  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(current, 1), Math.max(ownedCount, 1)));
  }, [ownedCount]);

  const name = toyItem?.displayName ?? recipe.displayName;
  const tokensEach = toyItem?.reward || recipe.sellTokens;
  const xpEach = toyItem?.xpReward || recipe.sellXp;
  const canSell = !!toyItem && ownedCount > 0;
  const reason = !toyItem
    ? `The ${recipe.displayName} isn't set up yet.`
    : ownedCount < 1
      ? `Craft a ${recipe.displayName} at the Workshop first.`
      : null;

  const setClamped = (value: number) => setQuantity(Math.min(Math.max(Math.round(value) || 1, 1), ownedCount));

  return (
    <li className="tc-recipe" aria-labelledby={`${id}-title`}>
      <div className="tc-recipe__header">
        <span className="tc-recipe__art" aria-hidden="true">
          {toyItem?.icon ? <img src={toyItem.icon} alt="" /> : PLACEHOLDER_TOY_EMOJI[recipe.id]}
        </span>
        <div>
          <h3 id={`${id}-title`} className="tc-recipe__title">
            {name}
          </h3>
          <p className="tc-recipe__meta">
            You have {ownedCount} · {tokensEach} Toy Tokens + {xpEach} XP each
          </p>
        </div>
      </div>

      {canSell && (
        <div className="tc-qty">
          <label htmlFor={`${id}-qty`} className="tc-recipe__meta">
            How many?
          </label>
          <div className="tc-qty__controls">
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
            <button
              type="button"
              className="tc-qty__all"
              disabled={isDisabled || quantity === ownedCount}
              onClick={() => setQuantity(ownedCount)}
            >
              All ({ownedCount})
            </button>
          </div>
        </div>
      )}

      <p className="tc-sell-price" aria-live="polite">
        <span aria-hidden="true">🪙 </span>+{tokensEach * (canSell ? quantity : 1)} Toy Tokens · +
        {xpEach * (canSell ? quantity : 1)} XP
      </p>

      <button
        type="button"
        className="tc-cta"
        disabled={isDisabled || !canSell}
        aria-describedby={reason ? `${id}-reason` : undefined}
        onClick={() => onSell(quantity)}
      >
        {isBusy ? "Selling..." : canSell ? `Sell ${plural(quantity, name)}` : `Sell a ${name}`}
      </button>
      {reason && (
        <p id={`${id}-reason`} className="tc-recipe__blocked">
          {reason}
        </p>
      )}
    </li>
  );
};

export default SellCard;
