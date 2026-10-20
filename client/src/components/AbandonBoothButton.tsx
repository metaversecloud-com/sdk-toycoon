import { useContext, useState } from "react";

// components
import { ConfirmationModal } from "@/components";

// context
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

/**
 * Gives up the player's booth in this world, after a confirmation. Their materials, toys, Toy Tokens, and XP stay with
 * them; decor placed in the booth goes back to their inventory. Players standing in the booth are sent back to the
 * Main Scene, since it's no longer theirs.
 */
export const AbandonBoothButton = ({
  onAbandoned,
  teleportToMainScene = false,
}: {
  onAbandoned?: () => void;
  teleportToMainScene?: boolean;
}) => {
  const dispatch = useContext(GlobalDispatchContext);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);

  const abandonBooth = async () => {
    setIsAbandoning(true);
    setErrorMessage(dispatch, "");
    try {
      await backendAPI.post("/abandon-booth");
      // Best-effort: the booth is already released even if the teleport fails
      if (teleportToMainScene) await backendAPI.post("/teleport/main-scene").catch(() => undefined);

      const { data: gameState } = await backendAPI.get("/game-state");
      setGameState(dispatch, gameState);
      onAbandoned?.();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsAbandoning(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-danger-outline"
        disabled={isAbandoning}
        onClick={() => setIsConfirming(true)}
      >
        {isAbandoning ? "Giving up booth..." : "Abandon my booth"}
      </button>

      {isConfirming && (
        <ConfirmationModal
          title="Abandon your booth?"
          message="Your booth will open up for someone else to claim, and any decorations in it go back to your inventory. You keep your materials, toys, Toy Tokens, and XP, and you can claim a new booth any time."
          confirmLabel="Abandon booth"
          handleOnConfirm={abandonBooth}
          handleToggleShowConfirmationModal={() => setIsConfirming(false)}
        />
      )}
    </>
  );
};

export default AbandonBoothButton;
