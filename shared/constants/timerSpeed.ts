// How fast a world's timers run, chosen by an admin and saved on the World data object (timerSpeed). Every material
// station and toy craft timer is scaled by the same factor, so the times keep their proportions.
export const TIMER_SPEEDS = {
  half: { label: "Half time", multiplier: 0.5, description: "Twice as fast" },
  default: { label: "Default", multiplier: 1, description: "The normal times" },
  slow: { label: "Slow", multiplier: 2, description: "2 times as long" },
  slower: { label: "Slower", multiplier: 4, description: "4 times as long" },
  slowest: { label: "Slowest", multiplier: 6, description: "6 times as long" },
};

export type TimerSpeedType = keyof typeof TIMER_SPEEDS;

export const DEFAULT_TIMER_SPEED: TimerSpeedType = "default";

export const isTimerSpeed = (value: unknown): value is TimerSpeedType =>
  typeof value === "string" && Object.keys(TIMER_SPEEDS).includes(value);

// A timer's length in this world: its base seconds × the world's speed, rounded to whole seconds (at least 1)
export const getTimerSeconds = (baseSeconds: number, timerSpeed?: string | null) => {
  if (!baseSeconds) return baseSeconds;
  const { multiplier } = TIMER_SPEEDS[isTimerSpeed(timerSpeed) ? timerSpeed : DEFAULT_TIMER_SPEED];
  return Math.max(1, Math.round(baseSeconds * multiplier));
};
