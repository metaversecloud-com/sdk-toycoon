import { KeyboardEvent, useContext, useEffect, useId, useRef } from "react";

import { GlobalStateContext } from "@/context/GlobalContext";
import { TOY_RECIPES } from "@shared/constants";

/**
 * Celebrates a level-up after a sale: the new level, the bonus Toy Tokens, and what it unlocked.
 * A dialog with one action, so focus goes to (and stays on) its button; Escape or the backdrop closes it.
 */
export const LevelUpModal = ({
  bonusTokens,
  level,
  levelsGained,
  onClose,
}: {
  bonusTokens: number;
  level: number;
  levelsGained: number[];
  onClose: () => void;
}) => {
  const titleId = useId();
  const { ecosystemMaterials } = useContext(GlobalStateContext);

  // What the levels just gained unlocked
  const unlockedToys = TOY_RECIPES.filter(({ unlockLevel }) => levelsGained.includes(unlockLevel)).map(
    ({ displayName }) => displayName,
  );
  // Read from the ecosystem items so metadata overrides (unlockLevel) are respected
  const unlockedMaterials = Object.values(ecosystemMaterials || {})
    .filter((material) => levelsGained.includes(material.unlockLevel))
    .map((material) => material.displayName);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => opener?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") onClose();
    // Only one focusable element, so Tab stays on it
    if (event.key === "Tab") {
      event.preventDefault();
      closeButtonRef.current?.focus();
    }
  };

  return (
    <div
      className="modal-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      onKeyDown={onKeyDown}
    >
      <div className="modal tc-levelup" onClick={(event) => event.stopPropagation()}>
        <div className="tc-levelup__confetti" aria-hidden="true">
          🎉✨🎊
        </div>
        <h3 className="tc-panel__title" id={titleId}>
          Level {level}!
        </h3>
        {bonusTokens > 0 && (
          <p className="p2">
            <span aria-hidden="true">🪙 </span>+{bonusTokens} bonus Toy Tokens
          </p>
        )}
        {(unlockedToys.length > 0 || unlockedMaterials.length > 0) && (
          <div className="tc-levelup__unlocks">
            <p className="tc-recipe__meta">Now unlocked</p>
            {unlockedToys.length > 0 && <p className="p2">New toys: {unlockedToys.join(", ")}</p>}
            {unlockedMaterials.length > 0 && <p className="p2">New materials: {unlockedMaterials.join(", ")}</p>}
          </div>
        )}
        <button ref={closeButtonRef} type="button" className="tc-cta" onClick={onClose}>
          Keep going
        </button>
      </div>
    </div>
  );
};

export default LevelUpModal;