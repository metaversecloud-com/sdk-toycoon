import { useContext, useEffect, useRef } from "react";

// components
import { TeleportButton } from "@/components";

// context
import { GlobalStateContext } from "@/context/GlobalContext";

// hooks
import { useClaimBooth } from "@/hooks/useClaimBooth";

// types
import { TargetBoothType } from "@shared/types/BoothTypes";

/**
 * Read-only view of a booth, shown to every visitor who clicks a booth's key asset
 */
export const BoothView = ({ booth }: { booth: TargetBoothType }) => {
  const { ownsBoothInThisWorld } = useContext(GlobalStateContext);
  const { claimBooth, claimResult, isClaiming } = useClaimBooth();
  const resultRef = useRef<HTMLParagraphElement>(null);

  const { claimDate, isClaimed, isOwnedByVisitor, level, ownerDisplayName } = booth;

  useEffect(() => {
    if (claimResult === "allBoothsTaken") resultRef.current?.focus();
  }, [claimResult]);

  const renderMyBoothAction = () => {
    if (isOwnedByVisitor) return null;
    if (ownsBoothInThisWorld) return <TeleportButton destination="my-booth">Go to my booth</TeleportButton>;
    if (claimResult === "allBoothsTaken") {
      return (
        <p ref={resultRef} tabIndex={-1} className="p2" role="status">
          All booths in this world are taken right now. We've let the world admin know.
        </p>
      );
    }
    return (
      <button type="button" className="btn" disabled={isClaiming} onClick={() => claimBooth({ teleportAfterClaim: true })}>
        {isClaiming ? "Finding you a booth..." : "Teleport to an open booth"}
      </button>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="card">
        <div className="card-details">
          {isClaimed ? (
            <>
              <h3 className="card-title h3">{isOwnedByVisitor ? "Your booth" : `${ownerDisplayName}'s booth`}</h3>
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
              <h3 className="card-title h3">Open booth</h3>
              <p className="card-description p2">
                Booth not claimed yet...{ownsBoothInThisWorld ? "" : " Teleport to an open one?"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        {renderMyBoothAction()}
        <TeleportButton destination="main-scene" className="btn btn-outline">
          Back to Main Scene
        </TeleportButton>
      </div>
    </div>
  );
};

export default BoothView;
