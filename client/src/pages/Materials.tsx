import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { MaterialStation, MaterialsInventoryBar, PageContainer, TeleportButton } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType, MATERIAL_UPDATED } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import { getMaterialCap } from "@shared/constants";
import { VisitorInventoryItemType } from "@shared/types/VisitorData";
import { getMaterialBinState } from "@shared/utils/getMaterialBinState";

/**
 * The materials workshop. Every material item in the ecosystem gets a station automatically — adding a material later
 * only needs the item (plus a stationImageUrl in its metadata for real art). Each station is two steps:
 * Start → wait spawnIntervalSeconds → Collect (one unit). Countdowns here only mirror the server's timer for display;
 * the server decides when a station is ready. Each material is capped (Wood 20, Fabric 10, …).
 */
export const Materials = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { ecosystemMaterials, hasInteractiveParams, ownsBoothInThisWorld, visitorData, visitorInventory } =
    useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const materials = Object.values(ecosystemMaterials || {});

  const stations = materials.map((material) => {
    const owned = visitorInventory?.materials[material.id]?.quantity ?? 0;
    const isLocked = (visitorInventory?.level || 1) < material.unlockLevel;
    const isFull = owned >= getMaterialCap(material.name);
    const { state, secondsRemaining } = getMaterialBinState(
      visitorData?.materialGenerationStartedAt?.[material.name],
      material.spawnIntervalSeconds,
      now,
    );
    return { material, isLocked, isFull, state, secondsRemaining, canCollect: !isLocked && !isFull && state === "ready" };
  });
  const readyCount = stations.filter(({ canCollect }) => canCollect).length;

  // Mirror a server result into client state: which stations reset/started and the new material counts
  const applyResult = (timers: { [materialName: string]: number | null }, items: { [id: string]: VisitorInventoryItemType }) => {
    if (!visitorData || !visitorInventory) return;
    dispatch!({
      type: MATERIAL_UPDATED,
      payload: {
        visitorData: {
          ...visitorData,
          materialGenerationStartedAt: { ...visitorData.materialGenerationStartedAt, ...timers },
        },
        visitorInventory: { ...visitorInventory, materials: { ...visitorInventory.materials, ...items } },
      },
    });
  };

  const runAction = async (busyKey: string, request: () => Promise<void>) => {
    if (busyId) return;
    setBusyId(busyKey);
    setStatusMessage("");
    setErrorMessage(dispatch, "");
    try {
      await request();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setBusyId(null);
    }
  };

  const handleStart = (materialId: string, displayName: string) =>
    runAction(materialId, async () => {
      const { data } = await backendAPI.post("/start-material", { materialId });
      applyResult({ [data.materialName]: data.generationStartedAt }, {});
      setStatusMessage(`Started making ${displayName}.`);
    });

  const handleCollect = (materialId: string, displayName: string) =>
    runAction(materialId, async () => {
      const { data } = await backendAPI.post("/collect-material", { materialId });
      applyResult({ [data.materialName]: null }, { [materialId]: data.item });
      setStatusMessage(`Collected 1 ${displayName}.`);
    });

  const handleCollectAll = () =>
    runAction("all", async () => {
      const { data } = await backendAPI.post("/collect-all-materials");
      const collected: { [id: string]: VisitorInventoryItemType } = data.collected;
      const timers = Object.fromEntries(Object.values(collected).map(({ name }) => [name, null]));
      applyResult(timers, collected);
      const names = Object.values(collected).map(({ displayName, name }) => displayName || name);
      setStatusMessage(`Collected ${names.join(", ")}.`);
    });

  if (!ownsBoothInThisWorld) {
    return (
      <PageContainer isLoading={isLoading}>
        <div className="tc-workshop">
          <div className="tc-workshop__top">
            <h2 className="tc-sign">Materials</h2>
          </div>
          <div className="tc-welcome">
            <div className="tc-panel">
              <h3 className="tc-panel__title">
                <span aria-hidden="true">🔒 </span>Claim a booth first
              </h3>
              <p className="p2">
                The material stations open once you have your own booth. Head to Start Here to claim one — it's free!
              </p>
              <TeleportButton destination="main-scene" className="tc-cta">
                Go to Start Here
              </TeleportButton>
            </div>
          </div>
        </div>
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
        </div>

        {materials.length === 0 ? (
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
                isBusy={busyId === material.id}
                isDisabled={busyId !== null}
                onStart={() => handleStart(material.id, material.displayName)}
                onCollect={() => handleCollect(material.id, material.displayName)}
              />
            ))}
          </ul>
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
            disabled={readyCount === 0 || busyId !== null}
            onClick={handleCollectAll}
          >
            {busyId === "all" ? "Collecting..." : readyCount > 0 ? `Collect All (${readyCount})` : "Collect All"}
          </button>
          <MaterialsInventoryBar materials={materials} visitorInventory={visitorInventory} />
        </div>
      )}
    </PageContainer>
  );
};

export default Materials;
