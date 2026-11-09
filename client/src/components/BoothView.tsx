import { useContext, useEffect, useRef } from "react";

// components
import { AbandonBoothButton, DisplayDecor, TeleportButton } from "@/components";

// context
import { GlobalStateContext } from "@/context/GlobalContext";

// hooks
import { useClaimBooth } from "@/hooks/useClaimBooth";

// types
import { TargetBoothType } from "@shared/types/BoothTypes";

// utils
import { WORLD_OBJECTS } from "@/utils";
import { TOY_RECIPES } from "@shared/constants";

/**
 * A booth (shown to players as their "display" at the craft fair), seen by every visitor who clicks its key asset.
 * An open display can be claimed right here; once it's yours, it tells you where to go next and lets you choose what's
 * on each of its decor spots.
 */
export const BoothView = ({ booth }: { booth: TargetBoothType }) => {
  const { ownsBoothInThisWorld, visitorInventory } = useContext(GlobalStateContext);
  const { claimBooth, claimResult, isClaiming } = useClaimBooth();
  const resultRef = useRef<HTMLHeadingElement>(null);
  const allTakenRef = useRef<HTMLParagraphElement>(null);

  const { claimDate, isClaimed, isOwnedByVisitor, level, ownerDisplayName, ownerStats, sceneDropId } = booth;
  const hasStarted = (visitorInventory?.xp ?? 0) > 0;

  // The claim button disappears once used, so move focus to the result instead of stranding keyboard users
  useEffect(() => {
    if (claimResult === "allBoothsTaken") allTakenRef.current?.focus();
    else if (claimResult) resultRef.current?.focus();
  }, [claimResult]);

  const renderNextStep = () => (
    <div className="tc-panel" role="status">
      <h3 ref={resultRef} tabIndex={-1} className="tc-panel__title">
        {claimResult === "claimed" ? "🎉 This display is yours!" : "What's next?"}
      </h3>
      <p className="p2">
        Head back to the workshop. Your first stop is the {WORLD_OBJECTS.materials}: collect Wood and Fabric, craft a{" "}
        {TOY_RECIPES[0].displayName} at {WORLD_OBJECTS.assembly}, then sell it at the {WORLD_OBJECTS.cashier}.
      </p>
      <TeleportButton destination="materials" className="tc-cta">
        Go to the {WORLD_OBJECTS.materials}
      </TeleportButton>
    </div>
  );

  const renderAction = () => {
    if (isOwnedByVisitor) return <AbandonBoothButton teleportToMainScene />;
    if (ownsBoothInThisWorld) return <TeleportButton destination="my-booth">Go to my display</TeleportButton>;
    if (claimResult === "allBoothsTaken") {
      return (
        <p ref={allTakenRef} tabIndex={-1} className="p2" role="status">
          All displays in this world are taken right now. We've let the world admin know.
        </p>
      );
    }
    // Claims this display; if someone else just took it, the player gets (and is sent to) another open one
    return (
      <button
        type="button"
        className={isClaimed ? "btn" : "tc-cta"}
        disabled={isClaiming}
        onClick={() => claimBooth({ teleportAfterClaim: true, currentSceneDropId: sceneDropId })}
      >
        {isClaiming ? "Claiming..." : isClaimed ? "Find me an open display" : "Claim this display"}
      </button>
    );
  };

  // The owner's lifetime stats, leaving out any that couldn't be read
  const ownerStatRows = [
    { label: "Toys created", value: ownerStats?.totalToysCrafted },
    { label: "Toys sold", value: ownerStats?.totalToysSold },
    { label: "Experience Points", value: ownerStats?.totalXp },
  ].filter(({ value }) => value != null);

  const title = !isClaimed ? "Open Display" : isOwnedByVisitor ? "Your Display" : `${ownerDisplayName}'s Display`;
  const claimedOn = claimDate ? new Date(claimDate).toLocaleDateString() : null;

  return (
    <div className="tc-workshop">
      <div className="tc-workshop__top">
        <h2 className="tc-sign">{title}</h2>
        <p className="tc-hint">
          {isClaimed
            ? `Level ${level}${claimedOn ? ` · Claimed ${claimedOn}` : ""}`
            : ownsBoothInThisWorld
              ? "You already have a display in this world."
              : "Claim it to show off the toys you make!"}
        </p>
      </div>

      <div className="tc-welcome">
        {isOwnedByVisitor && (claimResult === "claimed" || !hasStarted) && renderNextStep()}

        {isOwnedByVisitor && <DisplayDecor />}

        {ownerStatRows.length > 0 && (
          <ul className="tc-panel tc-booth-stats">
            {ownerStatRows.map(({ label, value }) => (
              <li key={label} className="tc-booth-stats__item">
                <span className="tc-booth-stats__value">{value?.toLocaleString()}</span>
                {label}
              </li>
            ))}
          </ul>
        )}

        <div className="tc-panel tc-booth-actions">
          {renderAction()}
          <TeleportButton destination="main-scene" className="btn btn-outline">
            Back to the workshop
          </TeleportButton>
        </div>
      </div>
    </div>
  );
};

export default BoothView;
