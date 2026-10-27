import { ChangeEvent, useId } from "react";

// types
import { InventoryItemType } from "@shared/types/InventoryItems";

/**
 * One spot on the player's display (Rug, Awning, Lights, Toy spot 1–3): what's on it, and a picker to change it.
 * The picker lists only items the player can put there right now (owned, with a copy not already on display).
 */
export const DisplaySpot = ({
  current,
  isBusy,
  isDisabled,
  label,
  onChange,
  options,
}: {
  current?: InventoryItemType; // the item on this spot, if any
  isBusy: boolean;
  isDisabled: boolean;
  label: string;
  onChange: (itemId: string | null) => void;
  options: InventoryItemType[];
}) => {
  const id = useId();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value || null);

  return (
    <li className={`tc-spot${current ? "" : " tc-spot--empty"}`}>
      <span className="tc-spot__art" aria-hidden="true">
        {current?.icon ? <img src={current.icon} alt="" /> : current ? "🎁" : "＋"}
      </span>
      <label htmlFor={id} className="tc-spot__label">
        {label}
      </label>
      <select
        id={id}
        className="tc-spot__select"
        value={current?.id ?? ""}
        disabled={isDisabled}
        aria-busy={isBusy}
        onChange={handleChange}
      >
        <option value="">Empty</option>
        {current && <option value={current.id}>{current.displayName}</option>}
        {options
          .filter(({ id: optionId }) => optionId !== current?.id)
          .map(({ id: optionId, displayName }) => (
            <option key={optionId} value={optionId}>
              {displayName}
            </option>
          ))}
      </select>
    </li>
  );
};

export default DisplaySpot;
