import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { ClaimBoothFirst, PageContainer, PlayerStats, RecipeCard } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// hooks
import { useServerNow } from "@/hooks/useServerNow";

// utils
import { backendAPI, patchGame, setErrorMessage, setGameState } from "@/utils";
import {
  countOwnedToys,
  describeMissingMaterials,
  getCraftedToyItem,
  getMaterialCountsByName,
  getMissingMaterials,
  toCanonicalMaterialName,
  TOY_RECIPES,
  ToyRecipeType,
  ToyTypeId,
} from "@shared/constants";
import { InventoryItemType } from "@shared/types/InventoryItems";
import { VisitorInventoryItemType } from "@shared/types/VisitorData";
import { getMaterialBinState } from "@shared/utils/getMaterialBinState";

/**
 * The Workshop: craft toys from materials. One workbench per toy the player's level has unlocked (L1 Rocking Horse,
 * L2 + Teddy Bear, L3 + Train), each crafting one at a time: Craft (materials used) → wait craftSeconds → Collect.
 * Countdowns mirror the server's timer; taps update the screen immediately and are corrected (or undone) by the server.
 */
export const Workshop = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { ecosystemToys, hasInteractiveParams, ownsBoothInThisWorld, serverTimeOffset, visitorData, visitorInventory } =
    useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);
  const now = useServerNow();
  const [busyRecipes, setBusyRecipes] = useState<Set<ToyTypeId>>(new Set());
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

  const level = visitorInventory?.level || 1;
  const materialCounts = getMaterialCountsByName(visitorInventory?.materials);
  const toyItems = Object.values(ecosystemToys || {});
  const unlockedRecipes = TOY_RECIPES.filter(({ unlockLevel }) => unlockLevel <= level);
  const nextRecipe = TOY_RECIPES.find(({ unlockLevel }) => unlockLevel > level);

  const setBusy = (recipeId: ToyTypeId, isBusy: boolean) =>
    setBusyRecipes((current) => {
      const next = new Set(current);
      if (isBusy) next.add(recipeId);
      else next.delete(recipeId);
      return next;
    });

  // The player's material items after using a recipe's materials (for the instant update)
  const materialsAfterCraft = (recipe: ToyRecipeType) => {
    const updated: { [itemId: string]: VisitorInventoryItemType } = {};
    for (const [name, needed] of Object.entries(recipe.materials)) {
      const entry = Object.entries(visitorInventory?.materials || {}).find(
        ([, item]) => toCanonicalMaterialName(item.name) === name,
      );
      if (entry) updated[entry[0]] = { ...entry[1], quantity: entry[1].quantity - needed };
    }
    return updated;
  };

  const handleCraft = async (recipe: ToyRecipeType, toyName: string) => {
    if (busyRecipes.has(recipe.id)) return;
    const previousMaterials = Object.fromEntries(
      Object.keys(materialsAfterCraft(recipe)).map((itemId) => [itemId, visitorInventory!.materials[itemId]]),
    );

    // Start the timer and use the materials right away; the server's reply confirms (or corrects) both
    patchGame(dispatch, { craftTimers: { [recipe.id]: Date.now() + (serverTimeOffset ?? 0) }, materials: materialsAfterCraft(recipe) });
    setBusy(recipe.id, true);
    setStatusMessage("");
    setErrorMessage(dispatch, "");
    try {
      const { data } = await backendAPI.post("/craft-toy", { recipeId: recipe.id });
      patchGame(dispatch, { craftTimers: { [recipe.id]: data.craftStartedAt }, materials: data.materials });
      setStatusMessage(`Started making a ${toyName}.`);
    } catch (error) {
      patchGame(dispatch, { craftTimers: { [recipe.id]: null }, materials: previousMaterials });
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setBusy(recipe.id, false);
    }
  };

  const handleCollect = async (recipe: ToyRecipeType, toyItem: InventoryItemType) => {
    if (busyRecipes.has(recipe.id)) return;
    const previousTimer = visitorData?.toyCraftStartedAt?.[recipe.id] ?? null;
    const previousToy =
      visitorInventory?.toys[toyItem.id] ??
      ({ ...toyItem, ecosystemItemId: toyItem.id, quantity: 0, availableQuantity: 0 } as VisitorInventoryItemType);
    const previousCrafted = visitorData?.totalToysCrafted || 0;

    // Put it on the shelf right away; the server's reply has the confirmed totals
    patchGame(dispatch, {
      craftTimers: { [recipe.id]: null },
      toys: { [toyItem.id]: { ...previousToy, quantity: previousToy.quantity + 1 } },
      visitorData: { totalToysCrafted: previousCrafted + 1 },
    });
    setBusy(recipe.id, true);
    setStatusMessage("");
    setErrorMessage(dispatch, "");
    try {
      const { data } = await backendAPI.post("/collect-toy", { recipeId: recipe.id });
      patchGame(dispatch, {
        toys: { [data.toy.ecosystemItemId ?? toyItem.id]: data.toy },
        visitorData: { totalToysCrafted: data.totalToysCrafted },
      });
      setStatusMessage(`Your ${toyItem.displayName} is done!`);
    } catch (error) {
      patchGame(dispatch, {
        craftTimers: { [recipe.id]: previousTimer },
        toys: { [toyItem.id]: previousToy },
        visitorData: { totalToysCrafted: previousCrafted },
      });
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setBusy(recipe.id, false);
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
            const { state, secondsRemaining } = getMaterialBinState(
              visitorData?.toyCraftStartedAt?.[recipe.id],
              recipe.craftSeconds,
              now,
            );

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
                craftState={state}
                secondsRemaining={secondsRemaining}
                isDisabled={busyRecipes.has(recipe.id)}
                onCraft={() => handleCraft(recipe, toyItem?.displayName ?? recipe.displayName)}
                onCollect={() => toyItem && handleCollect(recipe, toyItem)}
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
