// client/src/pages/Decorations.tsx
import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ActionAlert, ClaimBoothFirst, PageContainer, PlayerStats, ShopItemCard } from "@/components";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, getErrorText, setErrorMessage, setGameState, WORLD_OBJECTS } from "@/utils";
import {
  DECOR_SLOT_TYPE_LABELS,
  DecorSlotType,
  getDecorPrice,
  getDecorSlotType,
  getOwnedDecorCount,
} from "@shared/constants";
import { InventoryItemType } from "@shared/types/InventoryItems";

// The order the shop's sections appear in
const SLOT_TYPE_ORDER: DecorSlotType[] = ["toy", "rug", "awning", "lights"];

/**
 * Decoration shop: buy toys, rugs, awnings, and lights with Toy Tokens, in one section per kind with small cards two
 * per row. Each purchase adds one copy; players set them out on their display from the display itself
 * (BoothView → DisplayDecor), one item per spot. Toys bought here are display pieces, separate from the toys players
 * craft and sell.
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

  // isOpening: the page's first load, counted as an app open; refreshes after a purchase aren't
  const refresh = async (isOpening = false) => {
    const { data } = await backendAPI.get("/game-state", {
      params: { forceRefreshInventory, page: isOpening ? "decorations" : undefined },
    });
    setGameState(dispatch, data);
  };

  useEffect(() => {
    if (hasInteractiveParams) {
      refresh(true)
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
  // Everything that can go on a display, with the kind of spot it goes on
  const catalog = [...Object.values(ecosystemToys || {}), ...Object.values(ecosystemDecorations || {})]
    .map((item) => ({ item, slotType: getDecorSlotType(item) }))
    .filter((entry): entry is { item: InventoryItemType; slotType: DecorSlotType } => !!entry.slotType);

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

        <div className="tc-shop">
          {SLOT_TYPE_ORDER.map((slotType) => {
            const items = catalog.filter((entry) => entry.slotType === slotType).map(({ item }) => item);
            if (!items.length) return null;
            return (
              <section key={slotType} aria-labelledby={`tc-shop-${slotType}`}>
                <h3 id={`tc-shop-${slotType}`} className="tc-section-title">
                  {DECOR_SLOT_TYPE_LABELS[slotType]}
                </h3>
                <ul className="tc-shop-items">
                  {items.map((item) => {
                    const price = getDecorPrice(item);
                    const blockedReason =
                      level < item.unlockLevel
                        ? `Level ${item.unlockLevel}`
                        : tokens < price
                          ? `You need ${price - tokens} more Toy Tokens`
                          : null;
                    return (
                      <ShopItemCard
                        key={item.id}
                        item={item}
                        price={price}
                        owned={getOwnedDecorCount(item, visitorInventory, visitorData)}
                        blockedReason={blockedReason}
                        isBusy={busyId === item.id}
                        isDisabled={busyId !== null}
                        onBuy={() =>
                          runAction(
                            item.id,
                            () => backendAPI.post("/purchase-decoration", { decorationId: item.id }),
                            `Bought ${item.displayName}. Set it out from your display.`,
                          )
                        }
                      />
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
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
