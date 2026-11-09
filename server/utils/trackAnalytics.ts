import { VisitorInterface } from "@rtsdk/topia";
import { Credentials } from "../types/index.js";
import { errorHandler } from "./errorHandler.js";

export type AnalyticsEventType = { name: string; incrementBy?: number };

/**
 * Sends analytics events for the player, with no data change. Every event carries the player's profile id and the
 * world's URL slug, and uses the profile id as its unique key, so the dashboard shows a total and a count of distinct
 * players (the Monster Mash convention; see the Toycoon Analytics doc). Never throws and isn't meant to be awaited:
 * analytics must not slow down or fail what the player did.
 */
export const trackAnalytics = ({
  credentials,
  events,
  visitor,
}: {
  credentials: Credentials;
  events: AnalyticsEventType[];
  visitor: VisitorInterface;
}) => {
  if (events.length === 0) return Promise.resolve();
  const { profileId, urlSlug } = credentials;

  return visitor
    .updateDataObject(
      {},
      {
        analytics: events.map(({ name, incrementBy }) => ({
          analyticName: name,
          profileId,
          urlSlug,
          uniqueKey: profileId,
          ...(incrementBy !== undefined && { incrementBy }),
        })),
      },
    )
    .catch((error: any) =>
      errorHandler({
        error,
        functionName: "trackAnalytics",
        message: `Error tracking ${events.map(({ name }) => name).join(", ")}`,
      }),
    );
};
