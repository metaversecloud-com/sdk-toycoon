export type MaterialBinStateType = "idle" | "generating" | "ready";

/**
 * Two-step timers (material bins and toy crafting): start, wait the duration, then collect, which resets to idle.
 * Nothing fills on its own. generationStartedAt is the server timestamp from the start click; null/undefined = idle.
 * On the client, pass now as the server's clock (see useServerNow) so countdowns match the server's decision.
 */
export const getMaterialBinState = (
  generationStartedAt: number | null | undefined,
  spawnIntervalSeconds: number,
  now = Date.now(),
): { state: MaterialBinStateType; secondsRemaining: number } => {
  if (!generationStartedAt) return { state: "idle", secondsRemaining: 0 };

  const msRemaining = generationStartedAt + spawnIntervalSeconds * 1000 - now;
  if (msRemaining <= 0) return { state: "ready", secondsRemaining: 0 };

  // Capped at the full duration so a start time slightly ahead of the display clock never shows e.g. 0:31 of 0:30
  return { state: "generating", secondsRemaining: Math.min(spawnIntervalSeconds, Math.ceil(msRemaining / 1000)) };
};
