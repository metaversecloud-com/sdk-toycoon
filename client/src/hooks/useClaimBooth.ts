import { useContext, useState } from "react";

// context
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import { ClaimBoothResultType } from "@shared/types/BoothTypes";

/**
 * Claims an open booth for the visitor, then refreshes game state. Claiming from an open booth's own asset claims that
 * booth (the server tries the clicked booth first). teleportAfterClaim sends the player to their new booth — unless it's
 * the booth they're standing at (pass its sceneDropId as currentSceneDropId).
 */
export const useClaimBooth = () => {
  const dispatch = useContext(GlobalDispatchContext);

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimBoothResultType | null>(null);

  const claimBooth = async ({
    currentSceneDropId,
    teleportAfterClaim = false,
  }: { currentSceneDropId?: string; teleportAfterClaim?: boolean } = {}) => {
    setIsClaiming(true);
    setErrorMessage(dispatch, "");

    try {
      const { data } = await backendAPI.post("/claim-booth");
      setClaimResult(data.result);

      const isElsewhere = data.ownedBoothSceneDropId !== currentSceneDropId;
      if (teleportAfterClaim && data.result !== "allBoothsTaken" && isElsewhere) await backendAPI.post("/teleport/my-booth");

      const { data: gameState } = await backendAPI.get("/game-state");
      setGameState(dispatch, gameState);
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsClaiming(false);
    }
  };

  return { claimBooth, claimResult, isClaiming };
};

export default useClaimBooth;
