import { LEVEL_XP_THRESHOLDS } from "@shared/levels";
import { VisitorInventoryType } from "@shared/types/VisitorData";

/**
 * Level, XP progress toward the next level, and Toy Tokens — shown at the top of gameplay pages
 */
export const PlayerStats = ({ visitorInventory }: { visitorInventory?: VisitorInventoryType }) => {
  const level = visitorInventory?.level || 1;
  const xp = visitorInventory?.xp || 0;
  const tokens = visitorInventory?.coins || 0;

  const levelStart = LEVEL_XP_THRESHOLDS[level - 1] ?? 0;
  const nextLevelAt = LEVEL_XP_THRESHOLDS[level]; // undefined at max level
  const percent = nextLevelAt ? Math.min(100, Math.round(((xp - levelStart) / (nextLevelAt - levelStart)) * 100)) : 100;

  return (
    <div className="tc-stats">
      <span className="tc-stats__level">Level {level}</span>
      <div className="tc-stats__xp">
        <span className="tc-stats__label">{nextLevelAt ? `${xp} / ${nextLevelAt} XP` : `${xp} XP · Max level`}</span>
        <span
          className="tc-progress tc-stats__bar"
          role="progressbar"
          aria-label={nextLevelAt ? `XP toward level ${level + 1}` : "XP"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          {/* Width is runtime data, so it's the one inline style here */}
          <span className="tc-progress__fill" style={{ width: `${percent}%` }} />
        </span>
      </div>
      <span className="tc-stats__tokens">
        <span aria-hidden="true">🪙 </span>
        {tokens.toLocaleString()}
        <span className="sr-only"> Toy Tokens</span>
      </span>
    </div>
  );
};

export default PlayerStats;
