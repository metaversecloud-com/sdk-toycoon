// shared/utils/getAvailableMaterial.ts
export const getAvailableMaterial = (
  lastCollectedAt: number | undefined,
  intervalSeconds: number,
  cap: number,
  now = Date.now(),
) => {
  if (!intervalSeconds) return 0;
  if (lastCollectedAt === undefined) return cap;
  return Math.min(cap, Math.floor((now - lastCollectedAt) / (intervalSeconds * 1000)));
};