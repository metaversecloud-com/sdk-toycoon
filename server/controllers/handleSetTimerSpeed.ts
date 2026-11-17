import { Request, Response } from "express";
import {
  getTimerSpeedPreset,
  isValidTimerMultiplier,
  MAX_TIMER_MULTIPLIER,
  MIN_TIMER_MULTIPLIER,
} from "@shared/constants/index.js";
import { errorHandler, getCredentials, World } from "@utils/index.js";

/**
 * Admin: sets how fast this world's material and toy timers run ({ timerSpeed }: a multiplier, e.g. 2 = twice as long;
 * one of TIMER_SPEED_PRESETS or any custom value from MIN_TIMER_MULTIPLIER to MAX_TIMER_MULTIPLIER).
 * Saved on the World data object, so it applies to every player in this world from their next action. Timers already
 * running follow the new speed.
 */
export const handleSetTimerSpeed = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;
    const timerSpeed = Number(req.body?.timerSpeed);
    if (!isValidTimerMultiplier(timerSpeed)) {
      throw `Choose a timer speed from ${MIN_TIMER_MULTIPLIER} to ${MAX_TIMER_MULTIPLIER}.`;
    }

    const world = World.create(urlSlug, { credentials });
    const analyticName = `timerSpeedChanges-${getTimerSpeedPreset(timerSpeed)?.id ?? "custom"}`;
    await world.updateDataObject(
      { timerSpeed },
      { analytics: [{ analyticName, profileId, urlSlug, uniqueKey: profileId }] },
    );

    return res.json({ success: true, timerSpeed });
  } catch (error) {
    return errorHandler({ error, functionName: "handleSetTimerSpeed", message: "Error setting timer speed", req, res });
  }
};
