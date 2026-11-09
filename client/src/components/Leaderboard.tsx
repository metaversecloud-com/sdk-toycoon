import { useContext, useState } from "react";

// components
import { Accordion } from "@/components";

// context
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage } from "@/utils";

// types
import { LeaderboardResponseType } from "@shared/types/LeaderboardTypes";

// The booth page and admin view leave the leaderboard out for now (the trophy shows it); flip this to bring them back
export const SHOW_LEADERBOARD = false;

/**
 * This world's top players (rank, level, XP, toys crafted), with the viewer's own rank if they're further down.
 * A stacked list rather than a table, so it fits the narrow drawer: each player's stats sit under their name.
 */
export const LeaderboardTable = ({ data }: { data: LeaderboardResponseType }) => {
  if (data.leaderboard.length === 0) return <p className="p2">No players on the leaderboard yet.</p>;

  const { leaderboard, myEntry } = data;
  const isMeInTop = leaderboard.some(({ profileId }) => profileId === myEntry?.profileId);

  return (
    <div className="grid gap-2">
      <ol className="tc-leaderboard" aria-label={`Top ${leaderboard.length} players in this world`}>
        {leaderboard.map((entry) => {
          const isMe = entry.profileId === myEntry?.profileId;
          return (
            <li
              key={entry.profileId}
              className={`tc-leaderboard__row${isMe ? " tc-leaderboard__row--me" : ""}`}
              aria-current={isMe ? "true" : undefined}
            >
              <span className="tc-leaderboard__rank">
                <span className="sr-only">Rank </span>
                {entry.rank}
              </span>
              <span className="tc-leaderboard__player">
                <span className="tc-leaderboard__name">
                  {entry.displayName}
                  {isMe && " (you)"}
                </span>
                <span className="tc-leaderboard__stats">
                  Level {entry.level} · {entry.totalXp.toLocaleString()} XP · {entry.totalToysCrafted.toLocaleString()}{" "}
                  {entry.totalToysCrafted === 1 ? "toy" : "toys"} crafted
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {myEntry && !isMeInTop && (
        <p className="p2">
          You're #{myEntry.rank} with {myEntry.totalXp.toLocaleString()} XP.
        </p>
      )}
    </div>
  );
};

/**
 * This world's top players. Only fetched the first time the accordion is opened so it doesn't slow down every drawer load.
 */
export const Leaderboard = () => {
  const dispatch = useContext(GlobalDispatchContext);

  const [data, setData] = useState<LeaderboardResponseType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = (isOpen: boolean) => {
    if (!isOpen || data || isLoading) return;

    setIsLoading(true);
    backendAPI
      .get("/leaderboard")
      .then((response) => setData(response.data))
      .catch((error) => setErrorMessage(dispatch, error as ErrorType))
      .finally(() => setIsLoading(false));
  };

  const renderContent = () => {
    if (isLoading)
      return (
        <p className="p2" role="status">
          Loading leaderboard...
        </p>
      );
    if (!data) return null;
    return <LeaderboardTable data={data} />;
  };

  return (
    <Accordion title="Leaderboard" onToggle={handleToggle}>
      {renderContent()}
    </Accordion>
  );
};

export default Leaderboard;
