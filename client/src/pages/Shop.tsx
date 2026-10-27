import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { ActionAlert, ClaimBoothFirst, DisplaySpot, PageContainer, PlayerStats, ShopItemCard } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, getErrorText, patchGame, setErrorMessage, setGameState, WORLD_OBJECTS } from "@/utils";
import {
  countPlacements,
  DECOR_SLOT_TYPE_LABELS,
  DECOR_SPOT_LABELS,
  DECOR_SPOTS,
  DecorSlotType,
  getClaimedSignText,
  getDecorPrice,
  getDecorSlotType,
  PlacedDecorationsType,
} from "@shared/constants";
import { InventoryItemType } from "@shared/types/InventoryItems";

const SLOT_TYPE_ORDER: DecorSlotType[] = ["toy", "rug", "awning", "lights"];

/**
 * The Decor Shop: buy rugs, awnings, lights, and toys with Toy Tokens, and choose what goes on each spot of your
 * display in this world. The display's sign shows the owner's name automatically.
 * Placing and removing update the screen immediately and are undone if the server refuses.
 */
export const Shop = () => {
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
  const [busyKey, setBusyKey] = useState<string | null>(null); // the spot or item id with a request in flight
  const [statusMessage, setStatusMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const [searchParams] = useSearchParams();
  const forceRefreshInventory = searchParams.get("forceRefreshInventory") === "true";
  const urlSlug = searchParams.get("urlSlug") || "";
  const displayName = searchParams.get("displayName") || "";

  useEffect(() => {
    if (hasInteractiveParams) {
      backendAPI
        .get("/game-state", { params: { forceRefreshInventory } })
        .then((response) => setGameState(dispatch, response.data))
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    }
  }, [hasInteractiveParams, dispatch]);

  const level = visitorInventory?.level || 1;
  const coins = visitorInventory?.coins || 0;
  const placedDecorations = visitorData?.placedDecorations;

  // Everything sold here, with where it goes: every decoration with a known spot, plus every toy
  const catalog = [...Object.values(ecosystemToys || {}), ...Object.values(ecosystemDecorations || {})]
    .map((item) => ({ item, slotType: getDecorSlotType(item) }))
    .filter((entry): entry is { item: InventoryItemType; slotType: DecorSlotType } => !!entry.slotType);
  const itemsByName = Object.fromEntries(catalog.map(({ item }) => [item.name, item]));

  const ownedCount = (item: InventoryItemType) =>
    (visitorInventory?.decorations[item.id] ?? visitorInventory?.toys[item.id])?.quantity ?? 0;

  // What can go on a spot right now: the right kind of item, with a copy not already on display somewhere else
  const optionsForSpot = (spot: string) =>
    catalog
      .filter(({ slotType }) => slotType === DECOR_SPOTS[spot])
      .map(({ item }) => item)
      .filter((item) => ownedCount(item) - countPlacements(placedDecorations, item.name, { spot, urlSlug }) >= 1);

  const withPlacement = (spot: string, itemName: string | null): PlacedDecorationsType => ({
    ...placedDecorations,
    [spot]: { ...placedDecorations?.[spot], [urlSlug]: itemName },
  });

  const handleSpotChange = async (spot: string, itemId: string | null) => {
    if (busyKey) return;
    const previous = placedDecorations;
    const item = itemId ? catalog.find(({ item: candidate }) => candidate.id === itemId)?.item : undefined;

    patchGame(dispatch, { placedDecorations: withPlacement(spot, item?.name ?? null) });
    setBusyKey(spot);
    setStatusMessage("");
    setActionError("");
    try {
      const { data } = item
        ? await backendAPI.post("/place-decoration", { itemId: item.id, spot })
        : await backendAPI.post("/remove-decoration", { spot });
      patchGame(dispatch, { placedDecorations: data.placedDecorations });
      setStatusMessage(
        item
          ? `${item.displayName} is on your ${DECOR_SPOT_LABELS[spot]} spot.`
          : `${DECOR_SPOT_LABELS[spot]} spot cleared.`,
      );
    } catch (error) {
      patchGame(dispatch, { placedDecorations: previous });
      setActionError(getErrorText(error as ErrorType));
    } finally {
      setBusyKey(null);
    }
  };

  const handleBuy = async (item: InventoryItemType) => {
    if (busyKey) return;
    setBusyKey(item.id);
    setStatusMessage("");
    setActionError("");
    try {
      const { data } = await backendAPI.post("/purchase-decoration", { decorationId: item.id });
      const key = item.type === "toy" ? "toys" : "decorations";
      patchGame(dispatch, {
        inventory: { coins: data.coins },
        [key]: { [data.item.ecosystemItemId ?? item.id]: data.item },
      });
      setStatusMessage(`Bought ${item.displayName} for ${data.price} Toy Tokens.`);
    } catch (error) {
      setActionError(getErrorText(error as ErrorType));
    } finally {
      setBusyKey(null);
    }
  };

  if (!ownsBoothInThisWorld && !isLoading) {
    return (
      <PageContainer isLoading={isLoading}>
        <ClaimBoothFirst
          pageTitle={WORLD_OBJECTS.shop}
          unlocks={`The ${WORLD_OBJECTS.shop} opens once you have your own display.`}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer isLoading={isLoading}>
      <div className="tc-workshop">
        <div className="tc-workshop__top">
          <h2 className="tc-sign">{WORLD_OBJECTS.shop}</h2>
          <p className="tc-hint">Decorate your display!</p>
          <PlayerStats visitorInventory={visitorInventory} />
        </div>

        <div className="tc-shop">
          <section aria-labelledby="tc-my-display">
            <h3 id="tc-my-display" className="tc-section-title">
              Your display
            </h3>
            <p className="tc-shop__sign">
              <span aria-hidden="true">🪧 </span>Your sign reads “{getClaimedSignText(displayName)}”
            </p>
            <ul className="tc-spots">
              {Object.keys(DECOR_SPOTS).map((spot) => {
                const currentName = placedDecorations?.[spot]?.[urlSlug];
                return (
                  <DisplaySpot
                    key={spot}
                    label={DECOR_SPOT_LABELS[spot]}
                    current={currentName ? itemsByName[currentName] : undefined}
                    options={optionsForSpot(spot)}
                    isBusy={busyKey === spot}
                    isDisabled={busyKey !== null}
                    onChange={(itemId) => handleSpotChange(spot, itemId)}
                  />
                );
              })}
            </ul>
          </section>

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
                        : coins < price
                          ? `You need ${price - coins} more Toy Tokens`
                          : null;
                    return (
                      <ShopItemCard
                        key={item.id}
                        item={item}
                        price={price}
                        owned={ownedCount(item)}
                        blockedReason={blockedReason}
                        isBusy={busyKey === item.id}
                        isDisabled={busyKey !== null}
                        onBuy={() => handleBuy(item)}
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

export default Shop;
