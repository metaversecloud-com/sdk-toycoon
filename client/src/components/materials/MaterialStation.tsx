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
 */
export const MaterialStation = ({
  isBusy,
  isDisabled,
  isFull,
  isLocked,
  material,
  onCollect,
  onStart,
  secondsRemaining,
  state,
}: {
  isBusy: boolean;
  isDisabled: boolean;
  isFull: boolean;
  isLocked: boolean;
  material: InventoryItemType;
  onCollect: () => void;
  onStart: () => void;
  secondsRemaining: number;
  state: MaterialBinStateType;
}) => {
  const { displayName, icon, name, spawnIntervalSeconds, stationImageUrl, unlockLevel } = material;

  const renderBubble = () => {
    if (isLocked) {
      return (
        <span className="tc-bubble tc-bubble--locked">
          <span aria-hidden="true">🔒</span> Level {unlockLevel}
        </span>
      );
    }

    if (isFull) return <span className="tc-bubble tc-bubble--full">Full</span>;

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
          {isBusy ? "Collecting..." : "Collect!"}
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
    <li className={`tc-station${isLocked ? " tc-station--locked" : ""}`}>
      {renderBubble()}
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
