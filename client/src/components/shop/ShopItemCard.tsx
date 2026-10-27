// types
import { InventoryItemType } from "@shared/types/InventoryItems";

/**
 * One item for sale at the Decor Shop: picture, name, price, how many the player owns, and Buy
 */
export const ShopItemCard = ({
  blockedReason,
  isBusy,
  isDisabled,
  item,
  onBuy,
  owned,
  price,
}: {
  blockedReason: string | null; // e.g. not enough Toy Tokens, or level-locked
  isBusy: boolean;
  isDisabled: boolean;
  item: InventoryItemType;
  onBuy: () => void;
  owned: number;
  price: number;
}) => (
  <li className="tc-shop-item">
    <span className="tc-shop-item__art" aria-hidden="true">
      {item.icon ? <img src={item.icon} alt="" /> : "🎁"}
    </span>
    <span className="tc-shop-item__name">{item.displayName}</span>
    <span className="tc-shop-item__meta">
      <span aria-hidden="true">🪙 </span>
      {price}
      <span className="sr-only"> Toy Tokens</span>
      {owned > 0 && ` · You own ${owned}`}
    </span>
    <button
      type="button"
      className="tc-shop-item__buy"
      disabled={isDisabled || !!blockedReason}
      aria-label={`Buy ${item.displayName} for ${price} Toy Tokens`}
      title={blockedReason ?? undefined}
      onClick={onBuy}
    >
      {isBusy ? "Buying..." : blockedReason && blockedReason.startsWith("Level") ? blockedReason : "Buy"}
    </button>
  </li>
);

export default ShopItemCard;
