import { TargetBoothType } from "@shared/types/BoothTypes.js";
import { AnalyticsEventType } from "./trackAnalytics.js";

// The pages that report an app open (each page sends its name with /game-state). A refresh inside an open page, e.g.
// after an admin action, sends none and isn't counted.
const PAGE_VIEWS: { [page: string]: string } = {
  materials: "pageViews-materials",
  workshop: "pageViews-workshop",
  sell: "pageViews-cashier",
  decorations: "pageViews-decorations",
  trophy: "pageViews-trophy",
  boosters: "pageViews-boosters",
};

// Return windows after a player's first day, matching the Monster Mash goals (1-week return = opens again 7–13 days
// after the first open, and so on)
const WEEK_RETURNS = [
  { name: "weekReturns-1", from: 7, to: 13 },
  { name: "weekReturns-2", from: 14, to: 20 },
  { name: "weekReturns-3", from: 21, to: 27 },
];

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5);

/**
 * The analytics for opening the app: the open itself, what was opened (a station page, the trophy, or a display — your
 * own, someone else's, or an open one; the Start Here screen otherwise), and on a player's first open of a day, whether
 * it's their first day, a return, and which return window it falls in. Days are UTC dates ("YYYY-MM-DD").
 */
export const getOpenAnalytics = ({
  daysPlayed = {},
  page,
  targetBooth,
  today,
}: {
  daysPlayed?: { [day: string]: boolean };
  page?: string;
  targetBooth: TargetBoothType | null;
  today: string;
}): AnalyticsEventType[] => {
  if (!page) return [];

  const events: AnalyticsEventType[] = [{ name: "appOpens" }];

  if (page === "home") {
    if (!targetBooth) events.push({ name: "pageViews-startHere" });
    else if (!targetBooth.isClaimed) events.push({ name: "displayViews-open" });
    else events.push({ name: targetBooth.isOwnedByVisitor ? "displayViews-own" : "displayViews-other" });
  } else if (PAGE_VIEWS[page]) {
    events.push({ name: PAGE_VIEWS[page] });
    // The trophy opens on its Leaderboard tab
    if (page === "trophy") events.push({ name: "trophyTabViews-leaderboard" });
  }

  if (!daysPlayed[today]) {
    const days = Object.keys(daysPlayed).sort();
    if (days.length === 0) {
      events.push({ name: "firstDayPlays" });
    } else {
      events.push({ name: "returnDayPlays" });
      if (daysBetween(days.at(-1)!, today) === 1) events.push({ name: "nextDayReturns" });
      const sinceFirst = daysBetween(days[0], today);
      const window = WEEK_RETURNS.find(({ from, to }) => sinceFirst >= from && sinceFirst <= to);
      if (window) events.push({ name: window.name });
    }
  }

  return events;
};
