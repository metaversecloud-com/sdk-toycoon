// client/src/pages/Materials.tsx
import { useContext, useEffect, useState } from "react";
import { GlobalDispatchContext, GlobalStateContext } from "@context/GlobalContext";
import { backendAPI, setErrorMessage } from "@utils";
import { getAvailableMaterial } from "../../../shared/utils/getAvailableMaterial";

const MATERIAL_BIN_CAP = 10; // better: send from the server in game state

export const Materials = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { ecosystemMaterials, visitorInventory, visitorData } = useContext(GlobalStateContext);
  const [now, setNow] = useState(Date.now());
  const [collecting, setCollecting] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const handleCollect = async (materialId: string) => {
    if (collecting) return;
    setCollecting(materialId);
    try {
      const { data } = await backendAPI.post("/collect-material", { materialId });
      dispatch({ type: "MATERIAL_COLLECTED", payload: { materialId, ...data } });
    } catch (error) {
      setErrorMessage(dispatch, error);
    } finally {
      setCollecting(null);
    }
  };

  return (
    <div className="grid">
      {Object.values(ecosystemMaterials).sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((m: any) => {
        const locked = visitorInventory.level < m.unlockLevel;
        const available = getAvailableMaterial(
          visitorData?.materialCollectedAt?.[m.name],
          m.spawnIntervalSeconds,
          MATERIAL_BIN_CAP,
          now,
        );
        const owned = visitorInventory.materials[m.id]?.quantity ?? 0;

        return (
          <button
            key={m.id}
            className="card"
            disabled={locked || available < 1 || collecting === m.id}
            onClick={() => handleCollect(m.id)}
          >
            <img src={m.icon} alt={m.displayName} />
            <h4>{m.displayName}</h4>
            {locked ? (
              <p>Unlocks at level {m.unlockLevel}</p>
            ) : (
              <>
                <p>Ready: {available}/{MATERIAL_BIN_CAP}</p>
                <p>You have: {owned}</p>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
};