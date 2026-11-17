// How fast a world's timers run, set by an admin and saved on the World data object (timerSpeed) as a multiplier:
// every material station and toy craft timer is multiplied by it, so the times keep their proportions. Admins pick
// one of these presets or type their own multiplier.
export const TIMER_SPEED_PRESETS = [
  { id: "half", multiplier: 0.5, label: "Half time", description: "Twice as fast" },
  { id: "default", multiplier: 1, label: "Default", description: "The normal times" },
  { id: "slow", multiplier: 2, label: "Slow", description: "2 times as long" },
  { id: "verySlow", multiplier: 6, label: "Very slow", description: "6 times as long" },
  { id: "testing", multiplier: 20, label: "Testing", description: "20 times as long, to slow play right down" },
] as const;

export const DEFAULT_TIMER_MULTIPLIER = 1;

// The range a typed-in (custom) multiplier must fall in
export const MIN_TIMER_MULTIPLIER = 0.1;
export const MAX_TIMER_MULTIPLIER = 50;

// Worlds set before multipliers saved a preset name; these keep running at the speed they were set to
const LEGACY_TIMER_SPEEDS: { [name: string]: number } = { half: 0.5, default: 1, slow: 2, slower: 4, slowest: 6 };

export const isValidTimerMultiplier = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= MIN_TIMER_MULTIPLIER && value <= MAX_TIMER_MULTIPLIER;

// A world's multiplier from what's saved: a number, an old preset name, or nothing (Default)
export const getTimerMultiplier = (saved: unknown) => {
  if (isValidTimerMultiplier(saved)) return saved;
  if (typeof saved === "string" && LEGACY_TIMER_SPEEDS[saved] !== undefined) return LEGACY_TIMER_SPEEDS[saved];
  return DEFAULT_TIMER_MULTIPLIER;
};

// The preset a multiplier matches, if any (otherwise it's a custom multiplier)
export const getTimerSpeedPreset = (multiplier: number) =>
  TIMER_SPEED_PRESETS.find((preset) => preset.multiplier === multiplier);

// "Slow (×2)" for a preset, "Custom (×3.5)" otherwise
export const describeTimerMultiplier = (multiplier: number) =>
  `${getTimerSpeedPreset(multiplier)?.label ?? "Custom"} (×${multiplier})`;

// A timer's length in this world: its base seconds × the world's multiplier, rounded to whole seconds (at least 1)
export const getTimerSeconds = (baseSeconds: number, timerSpeed?: unknown) => {
  if (!baseSeconds) return baseSeconds;
  return Math.max(1, Math.round(baseSeconds * getTimerMultiplier(timerSpeed)));
};
