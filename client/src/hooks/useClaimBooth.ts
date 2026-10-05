import { useContext, useState } from "react";

// context
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import { ClaimBoothResultType } from "@shared/types/BoothTypes";

/**
 * Claims an open booth for the visitor (optionally teleporting them to it), then refreshes game state
 */
export const useClaimBooth = () => {
  const dispatch = useContext(GlobalDispatchContext);

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimBoothResultType | null>(null);

  const claimBooth = async ({ teleportAfterClaim = false } = {}) => {
    setIsClaiming(true);
    setErrorMessage(dispatch, "");

    try {
      const { data } = await backendAPI.post("/claim-booth");
      setClaimResult(data.result);

      if (teleportAfterClaim && data.result !== "allBoothsTaken") await backendAPI.post("/teleport/my-booth");

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
