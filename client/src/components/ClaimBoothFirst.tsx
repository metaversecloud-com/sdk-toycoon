// components
import { TeleportButton } from "@/components";

/**
 * Shown on gameplay pages (Materials, Workshop) to players who haven't claimed a booth in this world yet.
 * The server enforces the same rule, so this is just the friendly version.
 */
export const ClaimBoothFirst = ({ pageTitle, unlocks }: { pageTitle: string; unlocks: string }) => (
  <div className="tc-workshop">
    <div className="tc-workshop__top">
      <h2 className="tc-sign">{pageTitle}</h2>
    </div>
    <div className="tc-welcome">
      <div className="tc-panel">
        <h3 className="tc-panel__title">
          <span aria-hidden="true">🔒 </span>Claim a booth first
        </h3>
        <p className="p2">{unlocks} Head to Start Here to claim one — it's free!</p>
        <TeleportButton destination="main-scene" className="tc-cta">
          Go to Start Here
        </TeleportButton>
      </div>
    </div>
  </div>
);

export default ClaimBoothFirst;
