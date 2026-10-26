import { ReactNode, useContext, useEffect, useRef, useState } from "react";

// components
import { AbandonBoothButton, TeleportButton } from "@/components";

// context
import { GlobalStateContext } from "@/context/GlobalContext";

// hooks
import { useClaimBooth } from "@/hooks/useClaimBooth";

// utils
import { getMaterialIcons, WORLD_OBJECTS } from "@/utils";
import { getCraftedToyItem, TOY_RECIPES } from "@shared/constants";

/**
 * The welcome screen on the Main Scene's "Start Here" asset — the first thing a new player sees.
 * New players learn the loop step by step (each step names the in-world object to walk to) and claim a display.
 * Once they have a display, each step gets a button that teleports them to that step's station.
 */
export const StartHere = () => {
  const { availableBoothCount = 0, ecosystemMaterials, ecosystemToys, ownsBoothInThisWorld, visitorInventory } =
    useContext(GlobalStateContext);
  const { claimBooth, claimResult, isClaiming } = useClaimBooth();
  const resultRef = useRef<HTMLHeadingElement>(null);
  const [hasAbandoned, setHasAbandoned] = useState(false);

  // The claim/abandon buttons disappear once used, so move focus to the result instead of stranding keyboard users
  useEffect(() => {
    if (claimResult || hasAbandoned) resultRef.current?.focus();
  }, [claimResult, hasAbandoned]);

  // The same art the game uses (ecosystem item images); emoji only where there's no item or it has no image yet
  const woodIcon = getMaterialIcons(ecosystemMaterials).Wood;
  const firstToy = TOY_RECIPES[0];
  const firstToyIcon = getCraftedToyItem(firstToy, Object.values(ecosystemToys || {}))?.icon;
  const howItWorks: {
    art: ReactNode;
    title: string;
    text: string;
    station: "materials" | "assembly" | "cashier" | "shop";
  }[] = [
    {
      station: "materials",
      art: woodIcon ? <img src={woodIcon} alt="" /> : "🪵",
      title: "Collect materials",
      text: `Go to the ${WORLD_OBJECTS.materials}. Press Start, wait for the timer, then Collect.`,
    },
    {
      station: "assembly",
      art: firstToyIcon ? <img src={firstToyIcon} alt="" /> : "🐴",
      title: "Craft toys",
      text: `Take your materials to ${WORLD_OBJECTS.assembly} and craft a ${firstToy.displayName}.`,
    },
    {
      station: "cashier",
      art: "🪙",
      title: "Sell toys",
      text: `Sell your toys at the ${WORLD_OBJECTS.cashier} for Toy Tokens. Every step earns XP!`,
    },
    { station: "shop", art: "🛍️", title: "Go shopping", text: "Spend Toy Tokens on decorations for your display." },
  ];
  const hasStarted = (visitorInventory?.xp ?? 0) > 0;

  const renderAction = () => {
    if (claimResult === "allBoothsTaken") {
      return (
        <div className="tc-panel" role="status">
          <h3 ref={resultRef} tabIndex={-1} className="tc-panel__title">
            All displays are taken
          </h3>
          <p className="p2">
            Every display in this world is claimed right now. We've let the world admin know — check back soon!
          </p>
        </div>
      );
    }

    if (ownsBoothInThisWorld) {
      const justClaimed = claimResult === "claimed";
      return (
        <div className="tc-panel" role="status">
          <h3 ref={resultRef} tabIndex={-1} className="tc-panel__title">
            {justClaimed ? "🎉 Your display is ready!" : "Welcome back!"}
          </h3>
          <p className="p2">
            {hasStarted
              ? "Jump to any station with the buttons above."
              : `Start with step 1: go to the ${WORLD_OBJECTS.materials} and collect Wood and Fabric for your first ${firstToy.displayName}.`}
          </p>
          <TeleportButton destination="my-booth" className="btn btn-outline">
            Go to my display
          </TeleportButton>
          {!justClaimed && <AbandonBoothButton onAbandoned={() => setHasAbandoned(true)} />}
        </div>
      );
    }

    const hasOpenBooths = availableBoothCount > 0;
    return (
      <div className="tc-panel">
        {hasAbandoned && (
          <div role="status">
            <h3 ref={resultRef} tabIndex={-1} className="tc-panel__title">
              You gave up your display
            </h3>
            <p className="p2">Your toys and materials are still yours. Claim a new display whenever you're ready.</p>
          </div>
        )}
        <p className="tc-pill">
          <span aria-hidden="true">🎪 </span>
          {availableBoothCount === 1 ? "1 display open" : `${availableBoothCount} displays open`}
        </p>
        <button type="button" className="tc-cta" disabled={isClaiming || !hasOpenBooths} onClick={() => claimBooth()}>
          {isClaiming ? "Claiming..." : hasOpenBooths ? "Claim my display" : "No displays open"}
        </button>
        <p className="p3 tc-muted">
          Your display is where you show off your toys at the craft fair. One per player in each world — it's yours to
          keep and decorate.
        </p>
      </div>
    );
  };

  return (
    <div className="tc-workshop">
      <div className="tc-workshop__top">
        <h2 className="tc-sign">Toycoon</h2>
        <p className="tc-hint">Run your own toy workshop!</p>
      </div>

      <div className="tc-welcome">
        <section aria-labelledby="tc-how-it-works">
          <h3 id="tc-how-it-works" className="tc-section-title">
            How it works
          </h3>
          <ol className="tc-steps">
            {howItWorks.map(({ art, station, title, text }, index) => (
              <li key={title} className="tc-step">
                <span className="tc-step__number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="tc-step__art" aria-hidden="true">
                  {art}
                </span>
                <span className="tc-step__title">{title}</span>
                <span className="tc-step__text">{text}</span>
                {/* Stations open once you have a display, so new players see the steps and the claim button */}
                {ownsBoothInThisWorld && (
                  <TeleportButton destination={station} className="tc-step__go">
                    Go to {station === "assembly" ? "" : "the "}
                    {WORLD_OBJECTS[station]}
                  </TeleportButton>
                )}
              </li>
            ))}
          </ol>
        </section>

        {renderAction()}
      </div>
    </div>
  );
};

export default StartHere;
