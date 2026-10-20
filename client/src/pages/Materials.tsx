import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { ClaimBoothFirst, MaterialStation, MaterialsInventoryBar, PageContainer, PlayerStats } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// hooks
import { useServerNow } from "@/hooks/useServerNow";

// utils
import { backendAPI, patchGame, setErrorMessage, setGameState } from "@/utils";
import { getMaterialCap } from "@shared/constants";
import { InventoryItemType } from "@shared/types/InventoryItems";
import { VisitorInventoryItemType } from "@shared/types/VisitorData";
import { getMaterialBinState } from "@shared/utils/getMaterialBinState";

/**
 * The materials workshop. Every material item in the ecosystem gets a station automatically — adding a material later
 * only needs the item (plus a stationImageUrl in its metadata for real art). Each station is two steps:
 * Start → wait spawnIntervalSeconds → Collect (one unit). Countdowns here only mirror the server's timer for display;
 * the server decides when a station is ready. Each material is capped (Wood 20, Fabric 10, …).
 * Taps update the screen immediately (optimistic) and are corrected by the server's reply — or undone if it refuses.
 */
export const Materials = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const {
    ecosystemMaterials,
    hasInteractiveParams,
    ownsBoothInThisWorld,
    serverTimeOffset,
    visitorData,
    visitorInventory,
  } = useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);
  const now = useServerNow();
  // Stations with a request in flight ("all" while Collect All runs). Each station is independent, so several can be
  // started back to back without waiting for each other.
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState("");

  // Lets Topia bust the server's ecosystem inventory cache when new items are uploaded
  const [searchParams] = useSearchParams();
  const forceRefreshInventory = searchParams.get("forceRefreshInventory") === "true";

  useEffect(() => {
    if (hasInteractiveParams) {
      backendAPI
        .get("/game-state", { params: { forceRefreshInventory } })
        .then((response) => setGameState(dispatch, response.data))
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    }
  }, [hasInteractiveParams, dispatch]);

  // Only materials the player's level has unlocked are shown (L1: Rocking Horse materials, L2: + Teddy Bear, L3: all)
  const level = visitorInventory?.level || 1;
  const allMaterials = Object.values(ecosystemMaterials || {});
  const materials = allMaterials.filter(({ unlockLevel }) => unlockLevel <= level);
  const lockedMaterials = allMaterials.filter(({ unlockLevel }) => unlockLevel > level);
  const nextUnlockLevel = lockedMaterials.length ? Math.min(...lockedMaterials.map(({ unlockLevel }) => unlockLevel)) : null;
  const nextUnlockCount = lockedMaterials.filter(({ unlockLevel }) => unlockLevel === nextUnlockLevel).length;

  const stations = materials.map((material) => {
    const owned = visitorInventory?.materials[material.id]?.quantity ?? 0;
    const isLocked = level < material.unlockLevel;
    const isFull = owned >= getMaterialCap(material.name);
    const { state, secondsRemaining } = getMaterialBinState(
      visitorData?.materialGenerationStartedAt?.[material.name],
      material.spawnIntervalSeconds,
      now,
    );
    return { material, isLocked, isFull, state, secondsRemaining, canCollect: !isLocked && !isFull && state === "ready" };
  });
  const readyCount = stations.filter(({ canCollect }) => canCollect).length;

  const setBusy = (key: string, isBusy: boolean) =>
    setBusyIds((current) => {
      const next = new Set(current);
      if (isBusy) next.add(key);
      else next.delete(key);
      return next;
    });

  // The player's item for a material, or a zero-quantity stand-in if they've never collected any
  const ownedItem = (material: InventoryItemType): VisitorInventoryItemType =>
    visitorInventory?.materials[material.id] ??
    ({ ...material, ecosystemItemId: material.id, quantity: 0, availableQuantity: 0 } as VisitorInventoryItemType);
  const withQuantity = (item: VisitorInventoryItemType, quantity: number) => ({ ...item, quantity, availableQuantity: quantity });

  const handleStart = async (material: InventoryItemType) => {
    const { id, name, displayName } = material;
    if (busyIds.has(id) || busyIds.has("all")) return;
    const previousTimer = visitorData?.materialGenerationStartedAt?.[name] ?? null;

    // Start the countdown right away; the server's reply confirms (or corrects) the start time
    patchGame(dispatch, { materialTimers: { [name]: Date.now() + (serverTimeOffset ?? 0) } });
    setBusy(id, true);
    setStatusMessage("");
    setErrorMessage(dispatch, "");
    try {
      const { data } = await backendAPI.post("/start-material", { materialId: id });
      patchGame(dispatch, { materialTimers: { [name]: data.generationStartedAt } });
      setStatusMessage(`Started making ${displayName}.`);
    } catch (error) {
      patchGame(dispatch, { materialTimers: { [name]: previousTimer } });
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setBusy(id, false);
    }
  };

  const handleCollect = async (material: InventoryItemType) => {
    const { id, name, displayName } = material;
    if (busyIds.has(id) || busyIds.has("all")) return;
    const previousTimer = visitorData?.materialGenerationStartedAt?.[name] ?? null;
    const previousItem = ownedItem(material);

    // Count it and reset the station right away; the server's reply has the confirmed total
    patchGame(dispatch, {
      materialTimers: { [name]: null },
      materials: { [id]: withQuantity(previousItem, previousItem.quantity + 1) },
    });
    setBusy(id, true);
    setStatusMessage("");
    setErrorMessage(dispatch, "");
    try {
      const { data } = await backendAPI.post("/collect-material", { materialId: id });
      patchGame(dispatch, { materials: { [id]: data.item } });
      setStatusMessage(`Collected 1 ${displayName}.`);
    } catch (error) {
      patchGame(dispatch, { materialTimers: { [name]: previousTimer }, materials: { [id]: previousItem } });
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setBusy(id, false);
    }
  };

  const handleCollectAll = async () => {
    if (busyIds.size > 0) return;
    const ready = stations.filter(({ canCollect }) => canCollect).map(({ material }) => material);
    if (ready.length === 0) return;
    const previous = ready.map((material) => ({
      material,
      timer: visitorData?.materialGenerationStartedAt?.[material.name] ?? null,
      item: ownedItem(material),
    }));

    patchGame(dispatch, {
      materialTimers: Object.fromEntries(ready.map(({ name }) => [name, null])),
      materials: Object.fromEntries(previous.map(({ material, item }) => [material.id, withQuantity(item, item.quantity + 1)])),
    });
    setBusy("all", true);
    setStatusMessage("");
    setErrorMessage(dispatch, "");
    try {
      const { data } = await backendAPI.post("/collect-all-materials");
      const collected: { [id: string]: VisitorInventoryItemType } = data.collected;
      // Anything the server skipped (e.g. collected in another tab) goes back to how it was
      const skipped = previous.filter(({ material }) => !collected[material.id]);
      patchGame(dispatch, {
        materials: { ...Object.fromEntries(skipped.map(({ material, item }) => [material.id, item])), ...collected },
        materialTimers: Object.fromEntries(skipped.map(({ material, timer }) => [material.name, timer])),
      });
      const names = Object.values(collected).map(({ displayName, name }) => displayName || name);
      setStatusMessage(`Collected ${names.join(", ")}.`);
    } catch (error) {
      patchGame(dispatch, {
        materialTimers: Object.fromEntries(previous.map(({ material, timer }) => [material.name, timer])),
        materials: Object.fromEntries(previous.map(({ material, item }) => [material.id, item])),
      });
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setBusy("all", false);
    }
  };

  if (!ownsBoothInThisWorld) {
    return (
      <PageContainer isLoading={isLoading}>
        <ClaimBoothFirst pageTitle="Materials" unlocks="The material stations open once you have your own booth." />
      </PageContainer>
    );
  }

  return (
    <PageContainer isLoading={isLoading}>
      <div className="tc-workshop">
        <div className="tc-workshop__top">
          <h2 className="tc-sign">Materials</h2>
          <p className="tc-hint">
            <span className="tc-hint__icon" aria-hidden="true">
              ▶
            </span>
            Start a station, wait, then collect!
          </p>
          <PlayerStats visitorInventory={visitorInventory} />
        </div>

        {allMaterials.length === 0 ? (
          <p className="tc-hint mx-4 mb-6">No materials are set up yet.</p>
        ) : (
          <ul className="tc-floor" aria-label="Material stations">
            {stations.map(({ material, isLocked, isFull, state, secondsRemaining }) => (
              <MaterialStation
                key={material.id}
                material={material}
                state={state}
                secondsRemaining={secondsRemaining}
                isLocked={isLocked}
                isFull={isFull}
                isBusy={false}
                isDisabled={busyIds.has(material.id) || busyIds.has("all")}
                onStart={() => handleStart(material)}
                onCollect={() => handleCollect(material)}
              />
            ))}
          </ul>
        )}

        {nextUnlockLevel !== null && (
          <p className="tc-hint tc-unlock-hint">
            <span aria-hidden="true">🔒</span>
            Reach level {nextUnlockLevel} to unlock {nextUnlockCount} more {nextUnlockCount === 1 ? "material" : "materials"}
          </p>
        )}
      </div>

      <p className="sr-only" role="status">
        {statusMessage}
      </p>

      {materials.length > 0 && (
        <div className="tc-dock">
          <button
            type="button"
            className="tc-collect-all"
            disabled={readyCount === 0 || busyIds.size > 0}
            onClick={handleCollectAll}
          >
            {busyIds.has("all") ? "Collecting..." : readyCount > 0 ? `Collect All (${readyCount})` : "Collect All"}
          </button>
          <MaterialsInventoryBar materials={materials} visitorInventory={visitorInventory} />
        </div>
      )}
    </PageContainer>
  );
};

export default Materials;
