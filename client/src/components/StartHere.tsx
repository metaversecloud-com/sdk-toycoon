import { useContext, useEffect, useRef, useState } from "react";

// components
import { AbandonBoothButton, TeleportButton } from "@/components";

// context
import { GlobalStateContext } from "@/context/GlobalContext";

// hooks
import { useClaimBooth } from "@/hooks/useClaimBooth";

const HOW_IT_WORKS = [
  { emoji: "🪵", title: "Collect materials", text: "Start a station, wait, then collect wood, fabric, and more." },
  { emoji: "🧸", title: "Craft toys", text: "Turn materials into teddy bears, rocking horses, and trains." },
  { emoji: "🪙", title: "Sell for Toy Tokens", text: "Every toy you sell earns Toy Tokens and XP." },
  { emoji: "🎀", title: "Decorate your booth", text: "Spend Toy Tokens on rugs, displays, and lights." },
];

/**
 * The welcome screen on the Main Scene's "Start Here" asset — the first thing a new player sees.
 * New players learn the loop and claim a booth; returning players go straight to theirs.
 */
export const StartHere = () => {
  const { availableBoothCount = 0, ownsBoothInThisWorld } = useContext(GlobalStateContext);
  const { claimBooth, claimResult, isClaiming } = useClaimBooth();
  const resultRef = useRef<HTMLHeadingElement>(null);
  const [hasAbandoned, setHasAbandoned] = useState(false);

  // The claim/abandon buttons disappear once used, so move focus to the result instead of stranding keyboard users
  useEffect(() => {
    if (claimResult || hasAbandoned) resultRef.current?.focus();
  }, [claimResult, hasAbandoned]);

  const renderAction = () => {
    if (claimResult === "allBoothsTaken") {
      return (
        <div className="tc-panel" role="status">
          <h3 ref={resultRef} tabIndex={-1} className="tc-panel__title">
            All booths are taken
          </h3>
          <p className="p2">Every booth in this world is claimed right now. We've let the world admin know — check back soon!</p>
        </div>
      );
    }

    if (ownsBoothInThisWorld) {
      const justClaimed = claimResult === "claimed";
      return (
        <div className="tc-panel" role="status">
          <h3 ref={resultRef} tabIndex={-1} className="tc-panel__title">
            {justClaimed ? "🎉 Your booth is ready!" : "Welcome back!"}
          </h3>
          <p className="p2">
            {justClaimed
              ? "Head over and start collecting materials for your first toy."
              : "Your booth is waiting for you."}
          </p>
          <TeleportButton destination="my-booth" className="tc-cta">
            Go to my booth
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
              You gave up your booth
            </h3>
            <p className="p2">Your toys and materials are still yours. Claim a new booth whenever you're ready.</p>
          </div>
        )}
        <p className="tc-pill">
          <span aria-hidden="true">🎪 </span>
          {availableBoothCount === 1 ? "1 booth open" : `${availableBoothCount} booths open`}
        </p>
        <button type="button" className="tc-cta" disabled={isClaiming || !hasOpenBooths} onClick={() => claimBooth()}>
          {isClaiming ? "Claiming..." : hasOpenBooths ? "Claim my booth" : "No booths open"}
        </button>
        <p className="p3 tc-muted">One booth per player in each world. It's yours to keep and decorate.</p>
      </div>
    );
  };

  return (
    <div className="tc-workshop">
      <div className="tc-workshop__top">
        <h2 className="tc-sign">Toycoon</h2>
        <p className="tc-hint">
          <span className="tc-hint__icon" aria-hidden="true">
            ▶
          </span>
          Run your own toy workshop!
        </p>
      </div>

      <div className="tc-welcome">
        <section aria-labelledby="tc-how-it-works">
          <h3 id="tc-how-it-works" className="tc-section-title">
            How it works
          </h3>
          <ol className="tc-steps">
            {HOW_IT_WORKS.map(({ emoji, title, text }, index) => (
              <li key={title} className="tc-step">
                <span className="tc-step__number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="tc-step__art" aria-hidden="true">
                  {emoji}
                </span>
                <span className="tc-step__title">{title}</span>
                <span className="tc-step__text">{text}</span>
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
