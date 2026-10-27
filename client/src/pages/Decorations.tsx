// client/src/pages/Decorations.tsx
import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ActionAlert, ClaimBoothFirst, PageContainer, PlayerStats } from "@/components";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, getErrorText, setErrorMessage, setGameState, WORLD_OBJECTS } from "@/utils";
import { countPlacements, getDecorPrice, getDecorSlotType } from "@shared/constants";
import { InventoryItemType } from "@shared/types/InventoryItems";

/**
 * Decoration shop: buy rugs, awnings, lights, and toys with Toy Tokens. Each purchase adds one copy; players set them
 * out on their display from the display itself (BoothView → DisplayDecor), one item per spot.
 */
export const Decorations = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const {
    ecosystemDecorations,
    ecosystemToys,
    hasInteractiveParams,
    ownsBoothInThisWorld,
    visitorData,
    visitorInventory,
  } = useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const [searchParams] = useSearchParams();
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
    setActionError("");
    try {
      await request();
      await refresh();
      setStatusMessage(success);
    } catch (error) {
      setActionError(getErrorText(error as ErrorType));
    } finally {
      setBusyId(null);
    }
  };

  const level = visitorInventory?.level || 1;
  const tokens = visitorInventory?.coins || 0;
  // Everything that can go on a display: toys first, then rugs, awnings, and lights
  const items: InventoryItemType[] = [
    ...Object.values(ecosystemToys || {}),
    ...Object.values(ecosystemDecorations || {}),
  ].filter((item) => !!getDecorSlotType(item));

  if (!ownsBoothInThisWorld && !isLoading) {
    return (
      <PageContainer isLoading={isLoading}>
        <ClaimBoothFirst pageTitle={WORLD_OBJECTS.shop} unlocks="Decorating opens once you have your own display." />
      </PageContainer>
    );
  }

  return (
    <PageContainer isLoading={isLoading}>
      <div className="tc-workshop">
        <div className="tc-workshop__top">
          <h2 className="tc-sign">{WORLD_OBJECTS.shop}</h2>
          <p className="tc-hint">Buy decorations, then set them out on your display!</p>
          <PlayerStats visitorInventory={visitorInventory} />
        </div>

        <ul className="tc-recipes" aria-label="Decorations">
          {items.map((item) => {
            const price = getDecorPrice(item);
            const owned = (visitorInventory?.decorations[item.id] ?? visitorInventory?.toys[item.id])?.quantity ?? 0;
            const onDisplay = countPlacements(visitorData?.placedDecorations, item.name);
            const isLocked = level < item.unlockLevel;
            const canAfford = tokens >= price;
            const isBusy = busyId === item.id;

            let reason: string | null = null;
            if (isLocked) reason = `Reach level ${item.unlockLevel} to unlock.`;
            else if (!canAfford) reason = `Need ${price - tokens} more Toy Tokens.`;

            return (
              <li key={item.id} className="tc-recipe">
                <div className="tc-recipe__header">
                  <span className="tc-recipe__art" aria-hidden="true">
                    {item.icon ? <img src={item.icon} alt="" /> : "🎀"}
                  </span>
                  <div>
                    <h3 className="tc-recipe__title">{item.displayName}</h3>
                    <p className="tc-recipe__meta">
                      {price} Toy Tokens · You own {owned}
                      {onDisplay > 0 && ` (${onDisplay} on display)`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="tc-cta"
                  disabled={busyId !== null || !!reason}
                  onClick={() =>
                    runAction(
                      item.id,
                      () => backendAPI.post("/purchase-decoration", { decorationId: item.id }),
                      `Bought ${item.displayName}. Set it out from your display.`,
                    )
                  }
                >
                  {isBusy ? "Buying..." : `Buy · ${price} Toy Tokens`}
                </button>
                {reason && <p className="tc-recipe__blocked">{reason}</p>}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="sr-only" role="status">
        {statusMessage}
      </p>

      <div className="tc-dock">
        <ActionAlert message={actionError} onDismiss={() => setActionError("")} />
      </div>
    </PageContainer>
  );
};

export default Decorations;
