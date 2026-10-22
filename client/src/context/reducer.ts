import {
  ActionType,
  InitialState,
  GAME_PATCHED,
  SET_ERROR,
  SET_GAME_STATE,
  SET_HAS_INTERACTIVE_PARAMS,
} from "./types";

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
        ecosystemDecorations: payload.ecosystemDecorations,
        ownsBoothInThisWorld: payload.ownsBoothInThisWorld,
        ownedBoothSceneDropId: payload.ownedBoothSceneDropId,
        targetBooth: payload.targetBooth,
        availableBoothCount: payload.availableBoothCount,
        boothsFullAlert: payload.boothsFullAlert,
        // How far the server's clock is from this computer's, so countdowns match the server's timers
        serverTimeOffset: payload.serverTime ? payload.serverTime - Date.now() : (state.serverTimeOffset ?? 0),
        error: "",
      };
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
        },
        visitorInventory: {
          ...state.visitorInventory,
          ...patch.inventory,
          materials: { ...state.visitorInventory.materials, ...patch.materials },
          toys: { ...state.visitorInventory.toys, ...patch.toys },
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
