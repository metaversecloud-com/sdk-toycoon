import { useContext, useState } from "react";

// components
import { ConfirmationModal } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

type AdminActionType = "clear-booth" | "clear-inactive-booths" | "reset-world" | "reset-leaderboard";

const ADMIN_ACTIONS: {
  [key in AdminActionType]: { title: string; message: string; confirmLabel: string };
} = {
  "clear-booth": {
    title: "Clear this booth",
    message:
      "The owner will lose this booth and any decor placed in it. They keep their coins, XP, level, and all decor they've bought.",
    confirmLabel: "Clear booth",
  },
  "clear-inactive-booths": {
    title: "Clear inactive booths",
    message:
      "Every booth whose owner hasn't visited it in 14+ days will be released. Owners keep their coins, XP, level, and all decor they've bought.",
    confirmLabel: "Clear inactive booths",
  },
  "reset-leaderboard": {
    title: "Reset leaderboard",
    message:
      "Everyone will be removed from this world's leaderboard. Players keep their XP, level, coins, badges, and decor, and reappear as they keep playing. This can't be undone.",
    confirmLabel: "Reset leaderboard",
  },
  "reset-world": {
    title: "Reset world",
    message:
      "Every booth in this world will be released. Players keep their coins, XP, level, and all decor they've bought. This can't be undone.",
    confirmLabel: "Reset world",
  },
};

const describeResult = (
  action: AdminActionType,
  data: { clearedSceneDropIds?: string[]; failedSceneDropIds?: string[] },
) => {
  if (action === "reset-leaderboard") return "Leaderboard reset.";

  const cleared = data.clearedSceneDropIds?.length || 0;
  const failed = data.failedSceneDropIds?.length || 0;
  return (
    `${cleared === 1 ? "1 booth" : `${cleared} booths`} cleared.` +
    (failed ? ` ${failed === 1 ? "1 booth" : `${failed} booths`} couldn't be cleared — try again.` : "")
  );
};

export const AdminView = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { boothsFullAlert, targetBooth } = useContext(GlobalStateContext);

  const [pendingAction, setPendingAction] = useState<AdminActionType | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  const runAction = async (action: AdminActionType) => {
    setIsWorking(true);
    setResultMessage("");
    setErrorMessage(dispatch, "");

    try {
      const { data } = await backendAPI.post(`/admin/${action}`);
      setResultMessage(describeResult(action, data));

      const { data: gameState } = await backendAPI.get("/game-state");
      setGameState(dispatch, gameState);
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="grid gap-4">
      {boothsFullAlert && (
        <div className="card danger" role="status">
          <div className="card-details">
            <h3 className="card-title h4">All booths are full</h3>
            <p className="p2">
              {boothsFullAlert.turnedAwayCount === 1
                ? "1 player couldn't get a booth"
                : `${boothsFullAlert.turnedAwayCount} players couldn't get a booth`}
              , most recently on{" "}
              <time dateTime={new Date(boothsFullAlert.lastTriggeredAt).toISOString()}>
                {new Date(boothsFullAlert.lastTriggeredAt).toLocaleString()}
              </time>
              . Clearing inactive booths or adding booth scenes will make room.
            </p>
          </div>
        </div>
      )}

      {targetBooth?.isClaimed && (
        <button
          type="button"
          className="btn btn-danger-outline"
          disabled={isWorking}
          onClick={() => setPendingAction("clear-booth")}
        >
          Clear this booth ({targetBooth.ownerDisplayName})
        </button>
      )}
      <button
        type="button"
        className="btn btn-danger-outline"
        disabled={isWorking}
        onClick={() => setPendingAction("clear-inactive-booths")}
      >
        Clear inactive booths (14+ days)
      </button>
      <button
        type="button"
        className="btn btn-danger-outline"
        disabled={isWorking}
        onClick={() => setPendingAction("reset-leaderboard")}
      >
        Reset leaderboard
      </button>
      <button type="button" className="btn btn-danger" disabled={isWorking} onClick={() => setPendingAction("reset-world")}>
        Reset world
      </button>

      <p className="p2" role="status">
        {isWorking ? "Working..." : resultMessage}
      </p>

      {pendingAction && (
        <ConfirmationModal
          {...ADMIN_ACTIONS[pendingAction]}
          handleOnConfirm={() => runAction(pendingAction)}
          handleToggleShowConfirmationModal={() => setPendingAction(null)}
        />
      )}
    </div>
  );
};

export default AdminView;
