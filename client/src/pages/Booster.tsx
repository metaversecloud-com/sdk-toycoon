import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { ActionAlert, ClaimBoothFirst, PageContainer, PlayerStats } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// hooks
import { useServerNow } from "@/hooks/useServerNow";

// utils
import { backendAPI, getErrorText, setErrorMessage, setGameState } from "@/utils";
import { BOOSTERS, BoosterConfigType, BoosterIdType, getActiveBooster, getBoosterForItem } from "@shared/constants";

/**
 * Boosters page: one card per booster in BOOSTERS (shared/constants/economy.ts).
 * Flow: Buy (Toy Tokens -> adds one to your inventory) -> Activate (starts its timer) -> it expires.
 * The server decides everything; this page just shows state and calls /purchase-booster and /activate-booster.
 */

// Placeholder card art until real icons exist
const BOOSTER_EMOJI: { [id in BoosterIdType]: string } = {
  auto_collect: "🤖",
  material_speed: "⏩",
  instant_craft: "⚡",
};

const formatTime = (totalSeconds: number) =>
  `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;

// What each booster does, in player words
const describe = (booster: BoosterConfigType) => {
  const minutes = Math.round(booster.durationSeconds / 60);
  const time = minutes >= 1 ? `${minutes} min` : `${booster.durationSeconds}s`;
  if (booster.id === "auto_collect") {
    return `Your stations make and collect materials on their own for ${time}, even while you're away.`;
  }
  if (booster.id === "material_speed") return `Material stations you start take half the time for ${time}.`;
  return `Your next ${booster.maxUses} crafts finish instantly (within ${time}).`;
};

export const Boosters = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams, ownsBoothInThisWorld, visitorData, visitorInventory } = useContext(GlobalStateContext);

  // ----- Page state -----
  const [isLoading, setIsLoading] = useState(true);
  const now = useServerNow(); // keeps the "time left" countdown ticking
  const [busyKey, setBusyKey] = useState<string | null>(null); // "<boosterId>:buy" or "<boosterId>:activate"
  const [statusMessage, setStatusMessage] = useState(""); // read aloud by screen readers
  const [actionError, setActionError] = useState("");

  // Lets Topia bust the server's ecosystem inventory cache when new items are uploaded
  const [searchParams] = useSearchParams();
  const forceRefreshInventory = searchParams.get("forceRefreshInventory") === "true";

  // ----- Load the game state when the page opens -----
  const refresh = async () => {
    const { data } = await backendAPI.get("/game-state", { params: { forceRefreshInventory } });
    setGameState(dispatch, data);
  };

  useEffect(() => {
    if (hasInteractiveParams) {
      refresh()
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    }
  }, [hasInteractiveParams, dispatch]);

  // ----- Buy / Activate: call the server, then reload game state so everything stays in sync -----
  const runAction = async (booster: BoosterConfigType, action: "buy" | "activate") => {
    if (busyKey) return;
    setBusyKey(`${booster.id}:${action}`);
    setStatusMessage("");
    setActionError("");
    try {
      await backendAPI.post(action === "buy" ? "/purchase-booster" : "/activate-booster", { boosterId: booster.id });
      await refresh();
      setStatusMessage(action === "buy" ? `Bought ${booster.displayName}.` : `${booster.displayName} is active!`);
    } catch (error) {
      setActionError(getErrorText(error as ErrorType));
    } finally {
      setBusyKey(null);
    }
  };

  const level = visitorInventory?.level || 1;
  const tokens = visitorInventory?.coins || 0;
  const ownedItems = Object.values(visitorInventory?.boosters || {});

  // ----- Players without a booth in this world can't use boosters yet -----
  if (!ownsBoothInThisWorld && !isLoading) {
    return (
      <PageContainer isLoading={isLoading}>
        <ClaimBoothFirst pageTitle="Boosters" unlocks="Boosters open once you have your own display." />
      </PageContainer>
    );
  }

  // ----- The page -----
  return (
    <PageContainer isLoading={isLoading}>
      <div className="tc-workshop">
        <div className="tc-workshop__top">
          <h2 className="tc-sign">Boosters</h2>
          <p className="tc-hint">One-time power-ups. Buy one, then activate it when you're ready!</p>
          <PlayerStats visitorInventory={visitorInventory} />
        </div>

        {/* One card per booster */}
        <ul className="tc-recipes" aria-label="Boosters">
          {Object.values(BOOSTERS).map((booster) => {
            const owned = ownedItems
              .filter((item) => getBoosterForItem(item)?.id === booster.id)
              .reduce((total, item) => total + (item.quantity || 0), 0);
            const active = getActiveBooster(visitorData?.activeBoosters, booster.id, now);
            const isLocked = level < booster.unlockLevel;
            const canAfford = tokens >= booster.cost;
            const isBusy = busyKey !== null;

            // Why a button is disabled (shown under the buttons), if it is
            let reason: string | null = null;
            if (isLocked) reason = `Reach level ${booster.unlockLevel} to unlock.`;
            else if (!canAfford) reason = `Need ${booster.cost} Toy Tokens to buy.`;

            return (
              <li key={booster.id} className="tc-recipe">
                <div className="tc-recipe__header">
                  <span className="tc-recipe__art" aria-hidden="true">
                    {BOOSTER_EMOJI[booster.id]}
                  </span>
                  <div>
                    <h3 className="tc-recipe__title">{booster.displayName}</h3>
                    <p className="tc-recipe__meta">
                      {booster.cost} Toy Tokens · You have {owned}
                    </p>
                  </div>
                </div>

                <p className="p2">{describe(booster)}</p>

                {/* Countdown while running */}
                {active && (
                  <p className="tc-recipe__meta" aria-live="off">
                    <span aria-hidden="true">🕒 </span>Active · {formatTime(Math.max(0, Math.ceil((active.endsAt - now) / 1000)))} left
                    {active.usesLeft !== undefined ? ` · ${active.usesLeft} uses left` : ""}
                  </p>
                )}

                {/* Activate (only if you own one and it isn't already running) */}
                {owned > 0 && !isLocked && (
                  <button
                    type="button"
                    className="tc-cta"
                    disabled={isBusy || !!active}
                    onClick={() => runAction(booster, "activate")}
                  >
                    {busyKey === `${booster.id}:activate` ? "Activating..." : active ? "Running" : "Activate"}
                  </button>
                )}

                {/* Buy (always available when unlocked and affordable) */}
                <button
                  type="button"
                  className="tc-cta"
                  disabled={isBusy || isLocked || !canAfford}
                  onClick={() => runAction(booster, "buy")}
                >
                  {busyKey === `${booster.id}:buy` ? "Buying..." : `Buy · ${booster.cost} Toy Tokens`}
                </button>
                {reason && <p className="tc-recipe__blocked">{reason}</p>}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Read aloud by screen readers */}
      <p className="sr-only" role="status">
        {statusMessage}
      </p>

      {/* Error messages */}
      <div className="tc-dock">
        <ActionAlert message={actionError} onDismiss={() => setActionError("")} />
      </div>
    </PageContainer>
  );
};

export default Boosters;