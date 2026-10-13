import { getMaterialCap } from "@shared/constants";
import { InventoryItemType } from "@shared/types/InventoryItems";
import { VisitorInventoryType } from "@shared/types/VisitorData";

// components
import { MaterialArt } from "./MaterialArt";

/**
 * Bottom bar: how much of each material the player holds, against its cap
 */
export const MaterialsInventoryBar = ({
  materials,
  visitorInventory,
}: {
  materials: InventoryItemType[];
  visitorInventory?: VisitorInventoryType;
}) => (
  <ul className="tc-inventory-bar" aria-label="Your materials">
    {materials.map(({ displayName, icon, id, name }) => {
      const owned = visitorInventory?.materials[id]?.quantity ?? 0;
      const cap = getMaterialCap(name);
      const isFull = owned >= cap;

      return (
        <li
          key={id}
          className={`tc-inventory-bar__item${isFull ? " tc-inventory-bar__item--full" : ""}`}
          aria-label={`${displayName}: ${owned} of ${cap}${isFull ? ", full" : ""}`}
          title={`${displayName}: ${owned}/${cap}`}
        >
          <MaterialArt imageUrl={icon} name={name} />
          <span className="tc-inventory-bar__count" aria-hidden="true">
            {owned}/{cap}
          </span>
        </li>
      );
    })}
  </ul>
);

export default MaterialsInventoryBar;
