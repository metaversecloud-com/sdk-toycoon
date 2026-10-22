// client/src/pages/Decorations.tsx
import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ClaimBoothFirst, PageContainer, PlayerStats } from "@/components";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import { countPlaced, getDecorSlot } from "@shared/constants";

/**
 * Decoration shop + placement. Buy once per world: a purchase adds one copy, and each world that shows it uses one.
 */
export const Decorations = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { ecosystemDecorations, hasInteractiveParams, ownsBoothInThisWorld, visitorData, visitorInventory } =
    useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const [searchParams] = useSearchParams();
  const urlSlug = searchParams.get("urlSlug") || "";
  const forceRefreshInventory = searchParams.get("forceRefreshInventory") === "true";

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

  const runAction = async (id: string, request: () => Promise<unknown>, success: string) => {
    if (busyId) return;
    setBusyId(id);
    setStatusMessage("");
    setErrorMessage(dispatch, "");
    try {
      await request();
      await refresh();
      setStatusMessage(success);
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setBusyId(null);
    }
  };

  const level = visitorInventory?.level || 1;
  const tokens = visitorInventory?.coins || 0;
  const decorations = Object.values(ecosystemDecorations || {});

  if (!ownsBoothInThisWorld && !isLoading) {
    return (
      <PageContainer isLoading={isLoading}>
        <ClaimBoothFirst pageTitle="Decorations" unlocks="Decorating opens once you have your own booth." />
      </PageContainer>
    );
  }

  return (
    <PageContainer isLoading={isLoading}>
      <div className="tc-workshop">
        <div className="tc-workshop__top">
          <h2 className="tc-sign">Decorations</h2>
          <p className="tc-hint">
            <span className="tc-hint__icon" aria-hidden="true">
              ▶
            </span>
            Buy decorations, then place them in your booth!
          </p>
          <PlayerStats visitorInventory={visitorInventory} />
        </div>

        <ul className="tc-recipes" aria-label="Decorations">
          {decorations.map((item) => {
            const slot = getDecorSlot(item.name);
            const owned = visitorInventory?.decorations[item.id]?.quantity ?? 0;
            const available = owned - countPlaced(visitorData?.placedDecorations, item.name);
            const isPlacedHere = !!slot && visitorData?.placedDecorations?.[slot.id]?.[urlSlug] === item.name;
            const isLocked = level < item.unlockLevel;
            const canAfford = tokens >= item.cost;
            const isBusy = busyId === item.id;

            let reason: string | null = null;
            if (!slot) reason = "Not set up yet.";
            else if (isLocked) reason = `Reach level ${item.unlockLevel} to unlock.`;
            else if (!isPlacedHere && available < 1 && !canAfford) reason = `Need ${item.cost} Toy Tokens.`;

            let button: React.ReactNode = null;
            if (!reason || (!isLocked && slot && !isPlacedHere && available < 1)) {
              if (isPlacedHere) {
                button = (
                  <button type="button" className="tc-cta" disabled>
                    Placed ✓
                  </button>
                );
              } else if (available > 0) {
                button = (
                  <button
                    type="button"
                    className="tc-cta"
                    disabled={busyId !== null}
                    onClick={() =>
                      runAction(item.id, () => backendAPI.post("/place-decoration", { decorationId: item.id }), `Placed ${item.displayName}.`)
                    }
                  >
                    {isBusy ? "Placing..." : "Place in booth"}
                  </button>
                );
              } else {
                button = (
                  <button
                    type="button"
                    className="tc-cta"
                    disabled={busyId !== null || !canAfford}
                    onClick={() =>
                      runAction(item.id, () => backendAPI.post("/purchase-decoration", { decorationId: item.id }), `Bought ${item.displayName}.`)
                    }
                  >
                    {isBusy ? "Buying..." : `Buy · ${item.cost} Toy Tokens`}
                  </button>
                );
              }
            }

            return (
              <li key={item.id} className="tc-recipe">
                <div className="tc-recipe__header">
                  <span className="tc-recipe__art" aria-hidden="true">
                    {item.icon ? <img src={item.icon} alt="" /> : "🎀"}
                  </span>
                  <div>
                    <h3 className="tc-recipe__title">{item.displayName}</h3>
                    <p className="tc-recipe__meta">
                      {item.cost} Toy Tokens · You own {owned}
                    </p>
                  </div>
                </div>
                {button}
                {reason && <p className="tc-recipe__blocked">{reason}</p>}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="sr-only" role="status">
        {statusMessage}
      </p>
    </PageContainer>
  );
};

export default Decorations;