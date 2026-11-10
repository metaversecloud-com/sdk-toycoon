import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { ActionAlert, ClaimBoothFirst, PageContainer, PlayerStats } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, getErrorText, setErrorMessage, setGameState } from "@/utils";
import { BOOSTERS, BoosterConfigType, BoosterIdType } from "@shared/constants";

/**
 * Boosters page: one card per booster from BOOSTERS (shared/constants/economy.ts).
 * Boosters are one-time use: buy one with Toy Tokens, activate it, and it expires.
 *
 * STATUS: this is the UI only. The server side is NOT built yet:
 *   - POST /purchase-booster  { boosterId }   -> take Toy Tokens, add one booster to the player
 *   - POST /activate-booster  { boosterId }   -> start the booster's timer (and use count)
 *   - game state needs to return what the player owns and what is active (see getBoosterState below)
 * Until those exist, pressing Buy or Activate will show the server's error in the alert.
 */

// What the server will eventually send for each booster. Adjust once the visitor data shape is decided.
type BoosterStateType = {
  owned: number; // boosters bought but not activated yet
  activeUntil: number | null; // server ms timestamp when the active booster ends; null = not active
  usesLeft: number | null; // for boosters with maxUses (Instant Craft)
};

// Reads booster state from game state. Returns "nothing owned, nothing active" until the server provides it.
// TODO: replace the cast with a real field on VisitorDataObjectType (for example visitorData.boosters).
const getBoosterState = (visitorData: unknown, id: BoosterIdType): BoosterStateType => {
  const boosters = (visitorData as { boosters?: { [id: string]: Partial<BoosterStateType> } } | undefined)?.boosters;
  const state = boosters?.[id];
  return { owned: state?.owned ?? 0, activeUntil: state?.activeUntil ?? null, usesLeft: state?.usesLeft ?? null };
};

// Placeholder art (an up-arrow style icon per booster) until real art exists
const BOOSTER_EMOJI: { [id in BoosterIdType]: string } = {
  auto_collect: "🤖",
  material_speed: "⏩",
  instant_craft: "⚡",
};

// Short, player-facing description of what each booster does
const describe = (booster: BoosterConfigType) => {
  const minutes = Math.round(booster.durationSeconds / 60);
  const time = minutes >= 1 ? `${minutes} min` : `${booster.durationSeconds}s`;
  if (booster.id === "auto_collect") return `Stations start and collect on their own for ${time}.`;
  if (booster.id === "material_speed") return `Material stations run twice as fast for ${time}.`;
  return `Your next ${booster.maxUses} crafts finish instantly (within ${time}).`;
};

export const Boosters = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams, ownsBoothInThisWorld, visitorData, visitorInventory } = useContext(GlobalStateContext);

  // ----- Page state -----
  const [isLoading, setIsLoading] = useState(true);
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
      const path = action === "buy" ? "/purchase-booster" : "/activate-booster";
      await backendAPI.post(path, { boosterId: booster.id });
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
  const boosters = Object.values(BOOSTERS);

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
          {boosters.map((booster) => {
            const { owned, activeUntil, usesLeft } = getBoosterState(visitorData, booster.id);
            const isActive = activeUntil !== null && activeUntil > Date.now();
            const isLocked = level < booster.unlockLevel;
            const canAfford = tokens >= booster.cost;

            // Why the button is disabled (shown under it), if it is
            let reason: string | null = null;
            if (isLocked) reason = `Reach level ${booster.unlockLevel} to unlock.`;
            else if (isActive) reason = "Already running.";
            else if (owned < 1 && !canAfford) reason = `Need ${booster.cost} Toy Tokens.`;

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

                {isActive && (
                  <p className="tc-recipe__meta">
                    Active{usesLeft !== null ? ` · ${usesLeft} uses left` : ""}
                  </p>
                )}

                {/* Owned and not running: Activate. Otherwise: Buy. */}
                {owned > 0 && !isActive && !isLocked ? (
                  <button
                    type="button"
                    className="tc-cta"
                    disabled={busyKey !== null}
                    onClick={() => runAction(booster, "activate")}
                  >
                    {busyKey === `${booster.id}:activate` ? "Activating..." : "Activate"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="tc-cta"
                    disabled={busyKey !== null || isLocked || isActive || !canAfford}
                    onClick={() => runAction(booster, "buy")}
                  >
                    {busyKey === `${booster.id}:buy` ? "Buying..." : `Buy · ${booster.cost} Toy Tokens`}
                  </button>
                )}
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