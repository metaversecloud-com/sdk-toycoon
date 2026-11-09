import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitorInstance, trackAnalytics } from "@utils/index.js";

// Events only the page itself knows about (no other request happens), e.g. switching tabs on the trophy. Anything else
// is refused, so the page can't add events nobody planned for.
const PAGE_EVENTS = ["trophyTabViews-leaderboard", "trophyTabViews-badges"];

/**
 * Records one page-only analytics event ({ event }) for the player.
 */
export const handleTrackEvent = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { event } = req.body || {};
    if (!PAGE_EVENTS.includes(event)) throw "Unknown event";

    const visitor = await getVisitorInstance(credentials);
    await trackAnalytics({ credentials, events: [{ name: event }], visitor });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({ error, functionName: "handleTrackEvent", message: "Error tracking event", req, res });
  }
};
