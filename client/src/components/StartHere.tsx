import { useContext, useEffect, useRef } from "react";

// components
import { TeleportButton } from "@/components";

// context
import { GlobalStateContext } from "@/context/GlobalContext";

// hooks
import { useClaimBooth } from "@/hooks/useClaimBooth";

/**
 * "Start Here" panel: claims a booth for visitors who don't have one in this world yet, or sends owners to theirs
 */
export const StartHere = () => {
  const { availableBoothCount, ownsBoothInThisWorld } = useContext(GlobalStateContext);
  const { claimBooth, claimResult, isClaiming } = useClaimBooth();
  const resultRef = useRef<HTMLParagraphElement>(null);

  // The claim button disappears once used, so move focus to the result instead of stranding keyboard users
  useEffect(() => {
    if (claimResult) resultRef.current?.focus();
  }, [claimResult]);

  if (claimResult === "allBoothsTaken") {
    return (
      <p ref={resultRef} tabIndex={-1} className="p2" role="status">
        All booths in this world are taken right now. We've let the world admin know.
      </p>
    );
  }

  if (ownsBoothInThisWorld) {
    return (
      <div className="grid gap-2">
        <p ref={resultRef} tabIndex={-1} className="p2" role="status">
          {claimResult === "claimed" ? "Booth claimed! It's all yours." : "You already have a booth in this world."}
        </p>
        <TeleportButton destination="my-booth">Go to my booth</TeleportButton>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <p className="p2">Claim a booth to start building your toy empire.</p>
      <p className="p3">
        {availableBoothCount === 1 ? "1 booth open" : `${availableBoothCount ?? 0} booths open`}
      </p>
      <button type="button" className="btn" disabled={isClaiming} onClick={() => claimBooth()}>
        {isClaiming ? "Claiming..." : "Claim a booth"}
      </button>
    </div>
  );
};

export default StartHere;
