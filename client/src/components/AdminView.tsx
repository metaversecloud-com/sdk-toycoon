import { useContext, useState } from "react";

// components
import { ConfirmationModal, SHOW_LEADERBOARD } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import {
  DEFAULT_TIMER_MULTIPLIER,
  describeTimerMultiplier,
  getTimerSpeedPreset,
  isValidTimerMultiplier,
  MAX_TIMER_MULTIPLIER,
  MIN_TIMER_MULTIPLIER,
  TIMER_SPEED_PRESETS,
} from "@shared/constants";

type AdminActionType = "clear-booth" | "clear-inactive-booths" | "reset-world" | "reset-leaderboard";

const ADMIN_ACTIONS: {
  [key in AdminActionType]: { title: string; message: string; confirmLabel: string };
} = {
  "clear-booth": {
    title: "Clear this display",
    message:
      "The owner will lose this display and any decor placed on it. They keep their Toy Tokens, XP, level, and all decor they've bought.",
    confirmLabel: "Clear display",
  },
  "clear-inactive-booths": {
    title: "Clear inactive displays",
    message:
      "Every display whose owner hasn't visited it in 14+ days will be released. Owners keep their Toy Tokens, XP, level, and all decor they've bought.",
    confirmLabel: "Clear inactive displays",
  },
  "reset-leaderboard": {
    title: "Reset leaderboard",
    message:
      "Everyone will be removed from this world's leaderboard. Players keep their XP, level, Toy Tokens, badges, and decor, and reappear as they keep playing. This can't be undone.",
    confirmLabel: "Reset leaderboard",
  },
  "reset-world": {
    title: "Reset world",
    message:
      "Every display in this world will be released. Players keep their Toy Tokens, XP, level, and all decor they've bought. This can't be undone.",
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
    `${cleared === 1 ? "1 display" : `${cleared} displays`} cleared.` +
    (failed ? ` ${failed === 1 ? "1 display" : `${failed} displays`} couldn't be cleared — try again.` : "")
  );
};

export const AdminView = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { boothsFullAlert, targetBooth, timerSpeed = DEFAULT_TIMER_MULTIPLIER } = useContext(GlobalStateContext);

  const [pendingAction, setPendingAction] = useState<AdminActionType | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  // A preset's id, or "custom" for a typed-in multiplier
  const [speedChoice, setSpeedChoice] = useState<string>(getTimerSpeedPreset(timerSpeed)?.id ?? "custom");
  const [customSpeed, setCustomSpeed] = useState(getTimerSpeedPreset(timerSpeed) ? "" : String(timerSpeed));
  const chosenSpeed =
    speedChoice === "custom"
      ? Number(customSpeed)
      : TIMER_SPEED_PRESETS.find(({ id }) => id === speedChoice)?.multiplier ?? DEFAULT_TIMER_MULTIPLIER;
  const isChosenSpeedValid = isValidTimerMultiplier(chosenSpeed);
  const isCustomInvalid = speedChoice === "custom" && customSpeed !== "" && !isChosenSpeedValid;

  // Applies to every player in this world from their next action; no confirmation, since it can be changed back
  const saveTimerSpeed = async () => {
    setIsWorking(true);
    setResultMessage("");
    setErrorMessage(dispatch, "");
    try {
      await backendAPI.post("/admin/timer-speed", { timerSpeed: chosenSpeed });
      const { data: gameState } = await backendAPI.get("/game-state");
      setGameState(dispatch, gameState);
      setResultMessage(`Timers are now set to ${describeTimerMultiplier(chosenSpeed)}.`);
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsWorking(false);
    }
  };

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
    <div className="tc-workshop">
      <div className="tc-workshop__top">
        <h2 className="tc-sign">Admin Tools</h2>
        <p className="tc-hint">Changes here affect everyone in this world.</p>
      </div>

      <div className="tc-welcome">
        {boothsFullAlert && (
          <div className="tc-admin-alert" role="status">
            <h3 className="tc-admin-section__title">All displays are full</h3>
            <p className="tc-admin-section__text">
              {boothsFullAlert.turnedAwayCount === 1
                ? "1 player couldn't get a display"
                : `${boothsFullAlert.turnedAwayCount} players couldn't get a display`}
              , most recently on{" "}
              <time dateTime={new Date(boothsFullAlert.lastTriggeredAt).toISOString()}>
                {new Date(boothsFullAlert.lastTriggeredAt).toLocaleString()}
              </time>
              . Clearing inactive displays or adding booth scenes will make room.
            </p>
          </div>
        )}

        <section className="tc-admin-section" aria-labelledby="tc-admin-timers">
          <h3 id="tc-admin-timers" className="tc-admin-section__title">
            Timer speed
          </h3>
          <p className="tc-admin-section__text">
            How long material stations and toy crafting take. Timers already running switch to the new speed.
          </p>
          <fieldset className="tc-speed-grid">
            <legend className="sr-only">Timer speed</legend>
            {TIMER_SPEED_PRESETS.map(({ id, multiplier, label, description }) => (
              <label key={id} className="tc-speed-option">
                <input
                  type="radio"
                  name="timer-speed"
                  className="sr-only"
                  value={id}
                  checked={speedChoice === id}
                  disabled={isWorking}
                  onChange={() => setSpeedChoice(id)}
                />
                <span className="tc-speed-option__multiplier" aria-hidden="true">
                  ×{multiplier}
                </span>
                <span className="tc-speed-option__label">{label}</span>
                <span className="tc-speed-option__description">{description}</span>
                {multiplier === timerSpeed && <span className="tc-speed-option__current">Current</span>}
              </label>
            ))}
            <label className="tc-speed-option">
              <input
                type="radio"
                name="timer-speed"
                className="sr-only"
                value="custom"
                checked={speedChoice === "custom"}
                disabled={isWorking}
                onChange={() => setSpeedChoice("custom")}
              />
              <span className="tc-speed-option__multiplier" aria-hidden="true">
                ×?
              </span>
              <span className="tc-speed-option__label">Custom</span>
              <span className="tc-speed-option__description">Type your own</span>
              {!getTimerSpeedPreset(timerSpeed) && (
                <span className="tc-speed-option__current">Current ×{timerSpeed}</span>
              )}
            </label>
          </fieldset>
          {speedChoice === "custom" && (
            <div className="tc-speed-custom">
              <label htmlFor="tc-custom-speed" className="tc-speed-custom__label">
                Multiplier ({MIN_TIMER_MULTIPLIER} to {MAX_TIMER_MULTIPLIER}; 1 = normal, 3 = 3 times as long)
              </label>
              <input
                id="tc-custom-speed"
                type="number"
                inputMode="decimal"
                min={MIN_TIMER_MULTIPLIER}
                max={MAX_TIMER_MULTIPLIER}
                step="0.1"
                value={customSpeed}
                disabled={isWorking}
                aria-invalid={isCustomInvalid}
                aria-describedby={isCustomInvalid ? "tc-custom-speed-error" : undefined}
                onChange={(event) => setCustomSpeed(event.target.value)}
                className="tc-speed-custom__input"
              />
              {isCustomInvalid && (
                <p id="tc-custom-speed-error" className="tc-speed-custom__error">
                  Enter a number from {MIN_TIMER_MULTIPLIER} to {MAX_TIMER_MULTIPLIER}.
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            className="tc-cta"
            disabled={isWorking || !isChosenSpeedValid || chosenSpeed === timerSpeed}
            onClick={saveTimerSpeed}
          >
            {!isChosenSpeedValid
              ? "Set timers"
              : chosenSpeed === timerSpeed
                ? `Timers are ${describeTimerMultiplier(timerSpeed)}`
                : `Set timers to ${describeTimerMultiplier(chosenSpeed)}`}
          </button>
        </section>

        <section className="tc-admin-section" aria-labelledby="tc-admin-displays">
          <h3 id="tc-admin-displays" className="tc-admin-section__title">
            Displays
          </h3>
          <div className="tc-admin-tool">
            <div>
              <p className="tc-admin-tool__name">Clear this display</p>
              <p className="tc-admin-section__text">
                {targetBooth?.isClaimed
                  ? `Frees ${targetBooth.ownerDisplayName}'s display so someone else can claim it.`
                  : "Open a claimed display to clear it."}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-danger-outline"
              disabled={isWorking || !targetBooth?.isClaimed}
              onClick={() => setPendingAction("clear-booth")}
            >
              Clear
            </button>
          </div>
          <div className="tc-admin-tool">
            <div>
              <p className="tc-admin-tool__name">Clear inactive displays</p>
              <p className="tc-admin-section__text">Frees every display whose owner hasn't visited in 14+ days.</p>
            </div>
            <button
              type="button"
              className="btn btn-danger-outline"
              disabled={isWorking}
              onClick={() => setPendingAction("clear-inactive-booths")}
            >
              Clear inactive
            </button>
          </div>
          {SHOW_LEADERBOARD && (
            <div className="tc-admin-tool">
              <div>
                <p className="tc-admin-tool__name">Reset leaderboard</p>
                <p className="tc-admin-section__text">Empties this world's leaderboard.</p>
              </div>
              <button
                type="button"
                className="btn btn-danger-outline"
                disabled={isWorking}
                onClick={() => setPendingAction("reset-leaderboard")}
              >
                Reset
              </button>
            </div>
          )}
        </section>

        <section className="tc-admin-section tc-admin-section--danger" aria-labelledby="tc-admin-danger">
          <h3 id="tc-admin-danger" className="tc-admin-section__title">
            Danger zone
          </h3>
          <div className="tc-admin-tool">
            <div>
              <p className="tc-admin-tool__name">Reset world</p>
              <p className="tc-admin-section__text">
                Frees every display in this world. Players keep their Toy Tokens, XP, level, badges, and decor.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-danger"
              disabled={isWorking}
              onClick={() => setPendingAction("reset-world")}
            >
              Reset world
            </button>
          </div>
        </section>

        <p className="tc-admin-status" role="status">
          {isWorking ? "Working..." : resultMessage}
        </p>
      </div>

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
