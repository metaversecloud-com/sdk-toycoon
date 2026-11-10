import { Request, Response } from "express";
import { isTimerSpeed } from "@shared/constants/index.js";
import { errorHandler, getCredentials, World } from "@utils/index.js";

/**
 * Admin: sets how fast this world's material and toy timers run ({ timerSpeed }: one of TIMER_SPEEDS — half, default, slow, slower, slowest).
 * Saved on the World data object, so it applies to every player in this world from their next action. Timers already
 * running follow the new speed.
 */
export const handleSetTimerSpeed = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;
    const { timerSpeed } = req.body || {};
    if (!isTimerSpeed(timerSpeed)) throw "Choose a timer speed.";

    const world = World.create(urlSlug, { credentials });
    await world.updateDataObject(
      { timerSpeed },
      { analytics: [{ analyticName: `timerSpeedChanges-${timerSpeed}`, profileId, urlSlug, uniqueKey: profileId }] },
    );

    return res.json({ success: true, timerSpeed });
  } catch (error) {
    return errorHandler({ error, functionName: "handleSetTimerSpeed", message: "Error setting timer speed", req, res });
  }
};
