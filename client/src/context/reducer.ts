import {
  ActionType,
  AUTO_COLLECT_DISMISSED,
  AutoCollectSummaryType,
  InitialState,
  GAME_PATCHED,
  SET_ERROR,
  SET_GAME_STATE,
  SET_HAS_INTERACTIVE_PARAMS,
} from "./types";

// Adds a new Auto-Collector delivery to the summary the player hasn't seen yet (so it adds up across page loads)
const mergeAutoCollect = (current?: AutoCollectSummaryType, incoming?: AutoCollectSummaryType | null) => {
  if (!incoming || !incoming.unitsCollected) return current;
  return {
    unitsCollected: (current?.unitsCollected ?? 0) + incoming.unitsCollected,
    xpEarned: (current?.xpEarned ?? 0) + incoming.xpEarned,
    levelsGained: [...(current?.levelsGained ?? []), ...(incoming.levelsGained ?? [])],
  };
};

const globalReducer = (state: InitialState, action: ActionType) => {
  const { type, payload } = action;
  switch (type) {
    case SET_HAS_INTERACTIVE_PARAMS:
      return {
        ...state,
        hasInteractiveParams: true,
      };
    case SET_GAME_STATE:
      return {
        ...state,
        isAdmin: payload.isAdmin,
        visitorData: payload.visitorData,
        visitorInventory: payload.visitorInventory,
        ecosystemMaterials: payload.ecosystemMaterials,
        ecosystemToys: payload.ecosystemToys,
        ecosystemBoosters: payload.ecosystemBoosters,
        ecosystemDecorations: payload.ecosystemDecorations,
        ecosystemBadges: payload.ecosystemBadges,
        timerSpeed: payload.timerSpeed,
        ownsBoothInThisWorld: payload.ownsBoothInThisWorld,
        ownedBoothSceneDropId: payload.ownedBoothSceneDropId,
        targetBooth: payload.targetBooth,
        availableBoothCount: payload.availableBoothCount,
        boothsFullAlert: payload.boothsFullAlert,
        // How far the server's clock is from this computer's, so countdowns match the server's timers
        serverTimeOffset: payload.serverTime ? payload.serverTime - Date.now() : (state.serverTimeOffset ?? 0),
        // Auto-Collector delivery from this load (if any) is added to the summary the player hasn't seen yet
        autoCollectAway: mergeAutoCollect(state.autoCollectAway, payload.autoCollect),
        error: "",
      };
    case AUTO_COLLECT_DISMISSED:
      return { ...state, autoCollectAway: undefined };
    case GAME_PATCHED: {
      const { patch } = payload;
      if (!patch || !state.visitorData || !state.visitorInventory) return state;
      return {
        ...state,
        visitorData: {
          ...state.visitorData,
          ...patch.visitorData,
          materialGenerationStartedAt: { ...state.visitorData.materialGenerationStartedAt, ...patch.materialTimers },
          toyCraftStartedAt: { ...state.visitorData.toyCraftStartedAt, ...patch.craftTimers },
          placedDecorations: patch.placedDecorations ?? state.visitorData.placedDecorations,
        },
        visitorInventory: {
          ...state.visitorInventory,
          ...patch.inventory,
          materials: { ...state.visitorInventory.materials, ...patch.materials },
          toys: { ...state.visitorInventory.toys, ...patch.toys },
          decorations: { ...state.visitorInventory.decorations, ...patch.decorations },
        },
      };
    }
    case SET_ERROR:
      return {
        ...state,
        error: payload.error,
      };

    default: {
      throw new Error(`Unhandled action type: ${type}`);
    }
  }
};

export { globalReducer };