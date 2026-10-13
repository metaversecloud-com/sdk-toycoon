export type MaterialBinStateType = "idle" | "generating" | "ready";

/**
 * Two-step bins: the player clicks an idle bin to start it, waits spawnIntervalSeconds, then clicks again to collect
 * one unit, which puts the bin back to idle. Bins never fill on their own.
 * generationStartedAt is the server timestamp from the start click; null/undefined means idle.
 */
export const getMaterialBinState = (
  generationStartedAt: number | null | undefined,
  spawnIntervalSeconds: number,
  now = Date.now(),
): { state: MaterialBinStateType; secondsRemaining: number } => {
  if (!generationStartedAt) return { state: "idle", secondsRemaining: 0 };

  const msRemaining = generationStartedAt + spawnIntervalSeconds * 1000 - now;
  if (msRemaining <= 0) return { state: "ready", secondsRemaining: 0 };

  return { state: "generating", secondsRemaining: Math.ceil(msRemaining / 1000) };
};
