const formatTime = (totalSeconds: number) =>
  `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;

/**
 * Strip at the top of the Materials page while an Auto-Collector is running.
 * `now` is the server's clock (useServerNow). The countdown is hidden from screen readers so it isn't read every second.
 */
export const AutoCollectBanner = ({ endsAt, now }: { endsAt: number; now: number }) => {
  const secondsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return (
    <div className="tc-auto-banner">
      <span className="tc-auto-banner__gear" aria-hidden="true">
        ⚙️
      </span>
      <div>
        <p className="tc-auto-banner__title">Auto-Collector running</p>
        <p className="tc-auto-banner__text">
          Your stations are working on their own<span aria-hidden="true"> · {formatTime(secondsLeft)} left</span>
        </p>
      </div>
    </div>
  );
};

/**
 * Welcome-back card: what the Auto-Collector delivered since the player last looked.
 */
export const AutoCollectAwayCard = ({
  onDismiss,
  summary,
}: {
  onDismiss: () => void;
  summary: { unitsCollected: number; xpEarned: number; levelsGained: number[] };
}) => {
  const { levelsGained, unitsCollected, xpEarned } = summary;
  return (
    <div className="tc-away" role="status">
      <p className="tc-away__title">Auto-Collector delivered!</p>
      <p className="tc-away__text">
        +{unitsCollected} {unitsCollected === 1 ? "unit" : "units"} of materials
        {xpEarned > 0 ? ` · +${xpEarned} XP` : ""}
        {levelsGained.length > 0 ? ` · Level up!` : ""}
      </p>
      <button type="button" className="tc-cta" onClick={onDismiss}>
        Nice!
      </button>
    </div>
  );
};