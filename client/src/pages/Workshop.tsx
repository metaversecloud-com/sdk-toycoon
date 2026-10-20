import { useContext, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { AssemblyStageType, ClaimBoothFirst, PageContainer, PlayerStats, RecipeCard } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType, INVENTORY_UPDATED } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import {
  countOwnedToys,
  describeMissingMaterials,
  getCraftedToyItem,
  getMaterialCountsByName,
  getMissingMaterials,
  TOY_RECIPES,
  ToyTypeId,
} from "@shared/constants";

const STAGE_MS = 450;
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The Workshop: craft toys from materials. One card per toy the player's level has unlocked (L1 Rocking Horse,
 * L2 + Teddy Bear, L3 + Train). Crafting is a quick, satisfying tap — the server does the real work.
 */
export const Workshop = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { ecosystemToys, hasInteractiveParams, ownsBoothInThisWorld, visitorData, visitorInventory } =
    useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);
  const [assembly, setAssembly] = useState<{ recipeId: ToyTypeId; stage: AssemblyStageType } | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
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
  const materialCounts = getMaterialCountsByName(visitorInventory?.materials);
  const toyItems = Object.values(ecosystemToys || {});
  const unlockedRecipes = TOY_RECIPES.filter(({ unlockLevel }) => unlockLevel <= level);
  const nextRecipe = TOY_RECIPES.find(({ unlockLevel }) => unlockLevel > level);

  const handleCraft = async (recipeId: ToyTypeId, toyName: string) => {
    if (assembly || !visitorData || !visitorInventory) return;
    setStatusMessage("");
    setErrorMessage(dispatch, "");

    const animate = !prefersReducedMotion();
    setAssembly({ recipeId, stage: "loose" });

    try {
      const request = backendAPI.post("/craft-toy", { recipeId });
      if (animate) {
        await wait(STAGE_MS);
        if (isMounted.current) setAssembly({ recipeId, stage: "wip" });
        await wait(STAGE_MS);
      }
      const { data } = await request;
      if (!isMounted.current) return;

      dispatch!({
        type: INVENTORY_UPDATED,
        payload: {
          visitorData: { ...visitorData, totalToysCrafted: data.totalToysCrafted },
          visitorInventory: {
            ...visitorInventory,
            materials: { ...visitorInventory.materials, ...data.materials },
            toys: { ...visitorInventory.toys, [data.toy.ecosystemItemId]: data.toy },
          },
        },
      });
      setAssembly({ recipeId, stage: "done" });
      setStatusMessage(`Crafted a ${toyName}!`);
      await wait(animate ? 1400 : 0);
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      if (isMounted.current) setAssembly(null);
    }
  };

  if (!ownsBoothInThisWorld && !isLoading) {
    return (
      <PageContainer isLoading={isLoading}>
        <ClaimBoothFirst pageTitle="Workshop" unlocks="The Workshop opens once you have your own booth." />
      </PageContainer>
    );
  }

  return (
    <PageContainer isLoading={isLoading}>
      <div className="tc-workshop">
        <div className="tc-workshop__top">
          <h2 className="tc-sign">Workshop</h2>
          <p className="tc-hint">
            <span className="tc-hint__icon" aria-hidden="true">
              ▶
            </span>
            Turn your materials into toys!
          </p>
          <PlayerStats visitorInventory={visitorInventory} />
        </div>

        <ul className="tc-recipes" aria-label="Toys you can craft">
          {unlockedRecipes.map((recipe) => {
            // Each recipe crafts one item (Brown Teddy Bear, Black Train); other colors are decoration-only
            const toyItem = getCraftedToyItem(recipe, toyItems);
            const ownedToyCount = countOwnedToys(recipe, visitorInventory?.toys);
            const missing = getMissingMaterials(recipe, materialCounts);

            let blockedReason: string | null = null;
            if (!toyItem) blockedReason = `The ${recipe.displayName} isn't set up yet.`;
            else if (ownedToyCount >= recipe.cap) blockedReason = "Your shelf is full — sell some at the Sell counter.";
            else if (Object.keys(missing).length) blockedReason = `Need ${describeMissingMaterials(missing)}.`;

            return (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                toyItem={toyItem}
                materialCounts={materialCounts}
                ownedToyCount={ownedToyCount}
                blockedReason={blockedReason}
                assemblyStage={assembly?.recipeId === recipe.id ? assembly.stage : null}
                isDisabled={assembly !== null}
                onCraft={() => handleCraft(recipe.id, toyItem?.displayName ?? recipe.displayName)}
              />
            );
          })}
        </ul>

        {nextRecipe && (
          <p className="tc-hint tc-unlock-hint">
            <span aria-hidden="true">🔒</span>
            Reach level {nextRecipe.unlockLevel} to craft {nextRecipe.displayName}s
          </p>
        )}
      </div>

      <p className="sr-only" role="status">
        {statusMessage}
      </p>
    </PageContainer>
  );
};

export default Workshop;
