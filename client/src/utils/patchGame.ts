import { Dispatch } from "react";
import { ActionType, GAME_PATCHED, GamePatchType } from "@/context/types";

/**
 * Applies a targeted game-state change (see GamePatchType). Used both for instant (optimistic) updates when the player
 * taps something and for the server's confirmed values when the request returns.
 */
export const patchGame = (dispatch: Dispatch<ActionType> | null, patch: GamePatchType) => {
  dispatch?.({ type: GAME_PATCHED, payload: { patch } });
};
