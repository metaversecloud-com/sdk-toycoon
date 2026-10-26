import { useContext, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { ActionAlert, ClaimBoothFirst, LevelUpModal, PageContainer, PlayerStats, SellCard } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, getErrorText, patchGame, setErrorMessage, setGameState, WORLD_OBJECTS } from "@/utils";
import { countOwnedToys, getCraftedToyItem, TOY_RECIPES, ToyRecipeType, ToyTypeId } from "@shared/constants";

/**
 * The Cashier (Sell page): sell crafted toys for a fixed price in Toy Tokens + XP. Crossing an XP threshold levels the player
 * up, which pays a bonus and unlocks the next toy and its materials.
 */
export const Sell = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { ecosystemToys, hasInteractiveParams, ownsBoothInThisWorld, visitorData, visitorInventory } =
    useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);
  const [sellingRecipeId, setSellingRecipeId] = useState<ToyTypeId | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [levelUp, setLevelUp] = useState<{ level: number; bonusTokens: number; levelsGained: number[] } | null>(null);
  const isMounted = useRef(true);

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

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  const level = visitorInventory?.level || 1;
  const toyItems = Object.values(ecosystemToys || {});
  const unlockedRecipes = TOY_RECIPES.filter(({ unlockLevel }) => unlockLevel <= level);

  const handleSell = async (recipe: ToyRecipeType, quantity: number) => {
    const toyName = recipe.displayName;
    if (sellingRecipeId || !visitorData || !visitorInventory) return;
    setSellingRecipeId(recipe.id);
    setStatusMessage("");
    setActionError("");

    try {
      const { data } = await backendAPI.post("/sell-toy", { recipeId: recipe.id, quantity });
      if (!isMounted.current) return;

      patchGame(dispatch, {
        visitorData: { totalCoinsEarned: data.totalCoinsEarned, totalToysSold: data.totalToysSold },
        inventory: { coins: data.tokens, xp: data.xp, level: data.level },
        toys: { [data.toy.ecosystemItemId ?? data.toy.id]: data.toy },
      });
      const sold = data.quantity === 1 ? `a ${toyName}` : `${data.quantity} ${toyName}s`;
      setStatusMessage(`Sold ${sold} for ${data.tokensEarned} Toy Tokens and ${data.xpEarned} XP.`);
      if (data.levelsGained.length) {
        setLevelUp({ level: data.level, bonusTokens: data.levelUpTokens, levelsGained: data.levelsGained });
      }
    } catch (error) {
      if (isMounted.current) setActionError(getErrorText(error as ErrorType));
    } finally {
      if (isMounted.current) setSellingRecipeId(null);
    }
  };

  if (!ownsBoothInThisWorld && !isLoading) {
    return (
      <PageContainer isLoading={isLoading}>
        <ClaimBoothFirst
          pageTitle={WORLD_OBJECTS.cashier}
          unlocks={`The ${WORLD_OBJECTS.cashier} opens once you have your own display.`}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer isLoading={isLoading}>
      <div className="tc-workshop">
        <div className="tc-workshop__top">
          <h2 className="tc-sign">{WORLD_OBJECTS.cashier}</h2>
          <p className="tc-hint">Sell toys for Toy Tokens and XP!</p>
          <PlayerStats visitorInventory={visitorInventory} />
        </div>

        <ul className="tc-recipes" aria-label="Toys you can sell">
          {unlockedRecipes.map((recipe) => {
            const toyItem = getCraftedToyItem(recipe, toyItems);
            return (
              <SellCard
                key={recipe.id}
                recipe={recipe}
                toyItem={toyItem}
                ownedCount={countOwnedToys(recipe, visitorInventory?.toys)}
                isBusy={sellingRecipeId === recipe.id}
                isDisabled={sellingRecipeId !== null}
                onSell={(quantity) => handleSell(recipe, quantity)}
              />
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

      {levelUp && (
        <LevelUpModal
          level={levelUp.level}
          bonusTokens={levelUp.bonusTokens}
          levelsGained={levelUp.levelsGained}
          onClose={() => setLevelUp(null)}
        />
      )}
    </PageContainer>
  );
};

export default Sell;
