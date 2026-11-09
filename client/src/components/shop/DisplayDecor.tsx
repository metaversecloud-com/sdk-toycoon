import { useContext, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { ActionAlert, DisplaySpot, TeleportButton } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, getErrorText, patchGame, WORLD_OBJECTS } from "@/utils";
import {
  countPlacements,
  DECOR_SPOT_LABELS,
  DECOR_SPOTS,
  DecorSlotType,
  getDecorSlotType,
  getOwnedDecorCount,
  PlacedDecorationsType,
} from "@shared/constants";
import { InventoryItemType } from "@shared/types/InventoryItems";

/**
 * The owner's view of their display: what's on each spot (Awning, Lights, Rug, Toy 1–3) with a picker to change it.
 * Items are bought at the Decorations shop; the pickers list only what the player owns and hasn't already set out
 * (in any world). Changes show immediately and are undone if the server refuses.
 */
export const DisplayDecor = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { ecosystemDecorations, ecosystemToys, visitorData, visitorInventory } = useContext(GlobalStateContext);

  const [busySpot, setBusySpot] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const [searchParams] = useSearchParams();
  const urlSlug = searchParams.get("urlSlug") || "";

  const placedDecorations = visitorData?.placedDecorations;

  // Everything that can go on a display, with the kind of spot it goes on
  const catalog = [...Object.values(ecosystemToys || {}), ...Object.values(ecosystemDecorations || {})]
    .map((item) => ({ item, slotType: getDecorSlotType(item) }))
    .filter((entry): entry is { item: InventoryItemType; slotType: DecorSlotType } => !!entry.slotType);
  const itemsByName = Object.fromEntries(catalog.map(({ item }) => [item.name, item]));

  // Toys here are the ones bought at Decorations, never crafted ones (those are for selling)
  const ownedCount = (item: InventoryItemType) => getOwnedDecorCount(item, visitorInventory, visitorData);

  // What can go on a spot right now: the right kind of item, with a copy not already set out somewhere else
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
    if (busySpot) return;
    const previous = placedDecorations;
    const item = itemId ? catalog.find(({ item: candidate }) => candidate.id === itemId)?.item : undefined;

    patchGame(dispatch, { placedDecorations: withPlacement(spot, item?.name ?? null) });
    setBusySpot(spot);
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
      setBusySpot(null);
    }
  };

  return (
    <section className="tc-display-decor" aria-labelledby="tc-display-decor-title">
      <h3 id="tc-display-decor-title" className="tc-panel__title">
        Decorate your display
      </h3>
      <ul className="tc-spots">
        {Object.keys(DECOR_SPOTS).map((spot) => {
          const currentName = placedDecorations?.[spot]?.[urlSlug];
          return (
            <DisplaySpot
              key={spot}
              label={DECOR_SPOT_LABELS[spot]}
              current={currentName ? itemsByName[currentName] : undefined}
              options={optionsForSpot(spot)}
              isBusy={busySpot === spot}
              isDisabled={busySpot !== null}
              onChange={(itemId) => handleSpotChange(spot, itemId)}
            />
          );
        })}
      </ul>
      <TeleportButton destination="shop" className="btn btn-outline">
        Buy more at {WORLD_OBJECTS.shop}
      </TeleportButton>

      <p className="sr-only" role="status">
        {statusMessage}
      </p>
      <ActionAlert message={actionError} onDismiss={() => setActionError("")} />
    </section>
  );
};

export default DisplayDecor;
