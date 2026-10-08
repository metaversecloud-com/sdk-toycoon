import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { BoothView, Leaderboard, PageContainer, StartHere } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams, targetBooth } = useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);

  // Lets Topia bust the server's ecosystem inventory cache when new items are uploaded
  const [searchParams] = useSearchParams();
  const forceRefreshInventory = searchParams.get("forceRefreshInventory") === "true";

  useEffect(() => {
    if (hasInteractiveParams) {
      backendAPI
        .get("/game-state", { params: { forceRefreshInventory } })
        .then((response) => {
          setGameState(dispatch, response.data);
        })
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    }
  }, [hasInteractiveParams]);

  return (
    <PageContainer isLoading={isLoading} headerText="Toycoon">
      <div className="grid gap-6">
        {targetBooth ? <BoothView booth={targetBooth} /> : <StartHere />}
        <Leaderboard />
      </div>
    </PageContainer>
  );
};

export default Home;
