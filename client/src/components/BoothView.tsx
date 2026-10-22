import { useContext, useEffect, useRef } from "react";

// components
import { AbandonBoothButton, TeleportButton } from "@/components";

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
 * An open display can be claimed right here; once it's yours, it tells you where to go next.
 */
export const BoothView = ({ booth }: { booth: TargetBoothType }) => {
  const { ownsBoothInThisWorld, visitorInventory } = useContext(GlobalStateContext);
  const { claimBooth, claimResult, isClaiming } = useClaimBooth();
  const resultRef = useRef<HTMLHeadingElement>(null);
  const allTakenRef = useRef<HTMLParagraphElement>(null);

  const { claimDate, isClaimed, isOwnedByVisitor, level, ownerDisplayName, sceneDropId } = booth;
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

  return (
    <div className="grid gap-4">
      <div className="card">
        <div className="card-details">
          {isClaimed ? (
            <>
              <h3 className="card-title h3">{isOwnedByVisitor ? "Your display" : `${ownerDisplayName}'s display`}</h3>
              <dl className="grid grid-cols-2 gap-1 p2">
                <dt>Owner</dt>
                <dd>{ownerDisplayName}</dd>
                <dt>Level</dt>
                <dd>{level}</dd>
                {claimDate && (
                  <>
                    <dt>Claimed</dt>
                    <dd>
                      <time dateTime={claimDate}>{new Date(claimDate).toLocaleDateString()}</time>
                    </dd>
                  </>
                )}
              </dl>
            </>
          ) : (
            <>
              <h3 className="card-title h3">Open display</h3>
              <p className="card-description p2">
                {ownsBoothInThisWorld
                  ? "Nobody has claimed this display yet. You already have one in this world."
                  : "Nobody has claimed this display yet. Claim it to show off the toys you make!"}
              </p>
            </>
          )}
        </div>
      </div>

      {isOwnedByVisitor && (claimResult === "claimed" || !hasStarted) && renderNextStep()}

      <div className="grid gap-2">
        {renderAction()}
        <TeleportButton destination="main-scene" className="btn btn-outline">
          Back to the workshop
        </TeleportButton>
      </div>
    </div>
  );
};

export default BoothView;
