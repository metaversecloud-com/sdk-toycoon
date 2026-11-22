import { useEffect, useRef, useState } from "react";

import { InventoryItemType } from "@shared/types/InventoryItems";
import { MaterialBinStateType } from "@shared/utils/getMaterialBinState";

// components
import { MaterialArt } from "./MaterialArt";

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * One workstation on the Materials floor: art, a labeled crate, and a status bubble that is the station's action —
 * Start (idle) → countdown (generating) → Collect! (ready). Full and locked stations show why they're unavailable.
 * While an Auto-Collector runs (autoState), the bubble becomes a looping "Auto" progress bar, the station bobs, and a
 * "+N" floats up whenever a unit lands.
 */
export const MaterialStation = ({
  autoState,
  isBusy,
  isDisabled,
  isFull,
  isLocked,
  material,
  now = 0,
  onCollect,
  onStart,
  ownedCount = 0,
  secondsRemaining,
  state,
}: {
  autoState?: { startedAt: number; endsAt: number } | null; // set while an Auto-Collector is running
  isBusy: boolean;
  isDisabled: boolean;
  isFull: boolean;
  isLocked: boolean;
  material: InventoryItemType;
  now?: number; // the server's clock (useServerNow)
  onCollect: () => void;
  onStart: () => void;
  ownedCount?: number; // how many the player holds, so a rise can show the "+N" pop
  secondsRemaining: number;
  state: MaterialBinStateType;
}) => {
  const { displayName, icon, name, spawnIntervalSeconds, stationImageUrl, unlockLevel, xpReward } = material;
  const isAuto = !!autoState && !isLocked && !isFull;

  // ----- "+N" pop when a unit arrives while the Auto-Collector runs -----
  const previousOwned = useRef(ownedCount);
  const [pop, setPop] = useState<{ amount: number; id: number } | null>(null);
  useEffect(() => {
    if (autoState && ownedCount > previousOwned.current) {
      const id = Date.now();
      setPop({ amount: ownedCount - previousOwned.current, id });
      setTimeout(() => setPop((current) => (current?.id === id ? null : current)), 1800);
    }
    previousOwned.current = ownedCount;
  }, [ownedCount]);

  // ----- Where this station is in its looping cycle (worked out once per booster run, then CSS animates it) -----
  const phase = useRef<{ key: string; delay: number } | null>(null);
  if (autoState && spawnIntervalSeconds > 0) {
    const key = `${autoState.startedAt}-${spawnIntervalSeconds}`;
    if (phase.current?.key !== key) {
      phase.current = { key, delay: -(((now - autoState.startedAt) / 1000) % spawnIntervalSeconds) };
    }
  }

  const renderBubble = () => {
    if (isLocked) {
      return (
        <span className="tc-bubble tc-bubble--locked">
          <span aria-hidden="true">🔒</span> Level {unlockLevel}
        </span>
      );
    }

    if (isFull) return <span className="tc-bubble tc-bubble--full">Full</span>;

    // Auto-Collector running: no manual buttons, just a looping progress bar and the time to the next unit
    if (autoState) {
      const secondsToNext =
        spawnIntervalSeconds > 0
          ? Math.max(1, Math.ceil(spawnIntervalSeconds - (((now - autoState.startedAt) / 1000) % spawnIntervalSeconds)))
          : 0;
      return (
        <span className="tc-bubble tc-bubble--auto">
          <span>
            <span className="tc-bubble__gear" aria-hidden="true">
              ⚙️
            </span>{" "}
            Auto · {formatTime(secondsToNext)}
          </span>
          <span className="tc-progress" aria-hidden="true">
            {/* Duration and start point are runtime data, so they're inline styles */}
            <span
              className="tc-progress__fill tc-progress__fill--loop"
              style={{ animationDuration: `${spawnIntervalSeconds}s`, animationDelay: `${phase.current?.delay ?? 0}s` }}
            />
          </span>
        </span>
      );
    }

    if (state === "generating") {
      const percentDone = spawnIntervalSeconds
        ? Math.round(((spawnIntervalSeconds - secondsRemaining) / spawnIntervalSeconds) * 100)
        : 100;
      return (
        <span className="tc-bubble tc-bubble--timer">
          <span>
            <span aria-hidden="true">🕒 </span>
            {formatTime(secondsRemaining)}
          </span>
          <span
            className="tc-progress"
            role="progressbar"
            aria-label={`${displayName} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentDone}
          >
            {/* Width is runtime data, so it's the one inline style here */}
            <span className="tc-progress__fill" style={{ width: `${percentDone}%` }} />
          </span>
        </span>
      );
    }

    if (state === "ready") {
      return (
        <button
          type="button"
          className="tc-bubble tc-bubble--collect"
          disabled={isDisabled}
          aria-label={`Collect ${displayName}`}
          onClick={onCollect}
        >
          {isBusy ? "Collecting..." : `Collect!${xpReward > 0 ? ` +${xpReward} XP` : ""}`}
        </button>
      );
    }

    return (
      <button
        type="button"
        className="tc-bubble tc-bubble--start"
        disabled={isDisabled}
        aria-label={`Start making ${displayName}`}
        onClick={onStart}
      >
        <span aria-hidden="true">▶</span> {isBusy ? "Starting..." : "Start"}
      </button>
    );
  };

  return (
    <li className={`tc-station${isLocked ? " tc-station--locked" : ""}${isAuto ? " tc-station--auto" : ""}`}>
      {renderBubble()}
      {pop && (
        <span key={pop.id} className="tc-auto-pop" aria-hidden="true">
          +{pop.amount}
        </span>
      )}
      <div className="tc-station__art">
        {stationImageUrl ? (
          <MaterialArt imageUrl={stationImageUrl} name={name} />
        ) : (
          <div className="tc-bench">
            <MaterialArt imageUrl={icon} name={name} />
          </div>
        )}
      </div>
      <div className="tc-crate">
        <span className="tc-crate__label">{displayName}</span>
      </div>
    </li>
  );
};

export default MaterialStation;