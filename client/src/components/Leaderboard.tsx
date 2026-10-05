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
    if (isLoading) return <p className="p2" role="status">Loading leaderboard...</p>;
    if (!data) return null;
    if (data.leaderboard.length === 0) return <p className="p2">No players on the leaderboard yet.</p>;

    const { leaderboard, myEntry } = data;
    const isMeInTop = leaderboard.some(({ profileId }) => profileId === myEntry?.profileId);

    return (
      <div className="grid gap-2">
        <table className="table">
          <caption className="sr-only">Top {leaderboard.length} players in this world</caption>
          <thead>
            <tr>
              <th scope="col" className="h5">Rank</th>
              <th scope="col" className="h5">Player</th>
              <th scope="col" className="h5">Level</th>
              <th scope="col" className="h5">Total XP</th>
              <th scope="col" className="h5">Toys crafted</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => {
              const isMe = entry.profileId === myEntry?.profileId;
              return (
                <tr key={entry.profileId} aria-current={isMe ? "true" : undefined}>
                  <td className="p2">{entry.rank}</td>
                  <td className="p2">{isMe ? <strong>{entry.displayName} (you)</strong> : entry.displayName}</td>
                  <td className="p2">{entry.level}</td>
                  <td className="p2">{entry.totalXp.toLocaleString()}</td>
                  <td className="p2">{entry.totalToysCrafted.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {myEntry && !isMeInTop && (
          <p className="p2">
            You're #{myEntry.rank} with {myEntry.totalXp.toLocaleString()} XP.
          </p>
        )}
      </div>
    );
  };

  return (
    <Accordion title="Leaderboard" onToggle={handleToggle}>
      {renderContent()}
    </Accordion>
  );
};

export default Leaderboard;
