import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { PageContainer, StartHere, TeleportButton } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

/**
 * Teleport hub: jump to your booth (claiming one first if needed) or back to the Main Scene
 */
export const Teleport = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams } = useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <PageContainer isLoading={isLoading} headerText="Find your booth">
      <div className="grid gap-4">
        <StartHere />
        <TeleportButton destination="main-scene" className="btn btn-outline">
          Back to Main Scene
        </TeleportButton>
      </div>
    </PageContainer>
  );
};

export default Teleport;
