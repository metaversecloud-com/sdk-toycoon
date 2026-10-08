import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { PageContainer } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType, MATERIAL_COLLECTED } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import { MATERIAL_BIN_CAP } from "@shared/constants";
import { getAvailableMaterial } from "@shared/utils/getAvailableMaterial";

/**
 * Material bins: each refills one unit every spawnIntervalSeconds (up to MATERIAL_BIN_CAP). The countdown here only
 * mirrors the server's timer for display — the server decides what can actually be collected.
 */
export const Materials = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { ecosystemMaterials, hasInteractiveParams, visitorData, visitorInventory } = useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [collectingId, setCollectingId] = useState<string | null>(null);
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

  const handleCollect = async (materialId: string, materialName: string) => {
    if (collectingId || !visitorData || !visitorInventory) return;
    setCollectingId(materialId);
    setStatusMessage("");
    setErrorMessage(dispatch, "");

    try {
      const { data } = await backendAPI.post("/collect-material", { materialId });
      dispatch!({
        type: MATERIAL_COLLECTED,
        payload: {
          visitorData: {
            ...visitorData,
            materialCollectedAt: { ...visitorData.materialCollectedAt, [materialName]: data.collectedAt },
          },
          visitorInventory: {
            ...visitorInventory,
            materials: { ...visitorInventory.materials, [materialId]: data.item },
          },
        },
      });
      setStatusMessage(`Collected ${data.collected} ${materialName}.`);
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setCollectingId(null);
    }
  };

  const materials = Object.values(ecosystemMaterials || {});

  return (
    <PageContainer isLoading={isLoading} headerText="Materials">
      <p className="p2 mb-4" role="status">
        {statusMessage}
      </p>

      {materials.length === 0 ? (
        <p className="p2">No materials are set up yet.</p>
      ) : (
        <ul className="grid gap-4">
          {materials.map((material) => {
            const { displayName, icon, id, name, spawnIntervalSeconds, unlockLevel } = material;
            const isLocked = (visitorInventory?.level || 1) < unlockLevel;
            const last = visitorData?.materialCollectedAt?.[name];
            const available = getAvailableMaterial(last, spawnIntervalSeconds, MATERIAL_BIN_CAP, now);
            const owned = visitorInventory?.materials[id]?.quantity ?? 0;

            // Seconds until the next unit appears (only meaningful while the bin isn't full)
            const intervalMs = spawnIntervalSeconds * 1000;
            const nextInSeconds =
              last !== undefined && available < MATERIAL_BIN_CAP && intervalMs > 0
                ? Math.ceil((intervalMs - ((now - last) % intervalMs)) / 1000)
                : null;

            return (
              <li key={id} className="card">
                <div className="card-details grid gap-2">
                  <div className="flex items-center gap-2">
                    {icon && <img src={icon} alt="" aria-hidden="true" className="w-10 h-10" />}
                    <h3 className="card-title h4">{displayName}</h3>
                  </div>

                  {isLocked ? (
                    <p className="p2">Unlocks at level {unlockLevel}</p>
                  ) : (
                    <>
                      <p className="p2">
                        In bin: {available}/{MATERIAL_BIN_CAP} · You have: {owned}
                      </p>
                      {nextInSeconds !== null && <p className="p3">Next one in {nextInSeconds}s</p>}
                      <button
                        type="button"
                        className="btn"
                        disabled={available < 1 || collectingId !== null}
                        onClick={() => handleCollect(id, name)}
                      >
                        {collectingId === id ? "Collecting..." : available < 1 ? "Nothing to collect" : `Collect ${available}`}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
};

export default Materials;
