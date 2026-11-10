import { KeyboardEvent, useContext, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { BadgeCase, ConfirmationModal, LeaderboardTable, PageContainer } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

// types
import { LeaderboardResponseType } from "@shared/types/LeaderboardTypes";

const TABS = [
  { id: "leaderboard", label: "Leaderboard" },
  { id: "badges", label: "Badges" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * The trophy's page (opened from its own asset in the world): this world's leaderboard and the player's badges, each on
 * a tab. Admins can reset the leaderboard here.
 */
export const Trophy = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams, isAdmin } = useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("leaderboard");
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponseType | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const tabRefs = useRef<{ [id: string]: HTMLButtonElement | null }>({});

  // Lets Topia bust the server's ecosystem inventory cache when new items (e.g. badges) are uploaded
  const [searchParams] = useSearchParams();
  const forceRefreshInventory = searchParams.get("forceRefreshInventory") === "true";

  const fetchLeaderboard = () => {
    setIsLoadingLeaderboard(true);
    return backendAPI
      .get("/leaderboard")
      .then((response) => setLeaderboard(response.data))
      .catch((error) => setErrorMessage(dispatch, error as ErrorType))
      .finally(() => setIsLoadingLeaderboard(false));
  };

  useEffect(() => {
    if (hasInteractiveParams) {
      Promise.all([
        backendAPI
          .get("/game-state", { params: { forceRefreshInventory, page: "trophy" } })
          .then((response) => setGameState(dispatch, response.data)),
        fetchLeaderboard(),
      ])
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    }
  }, [hasInteractiveParams]);

  const resetLeaderboard = async () => {
    try {
      await backendAPI.post("/admin/reset-leaderboard");
      await fetchLeaderboard();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setShowResetConfirm(false);
    }
  };

  // Switching tabs is counted for analytics (the first Leaderboard view is counted with the page open). Best-effort.
  const selectTab = (id: TabId) => {
    if (id === activeTab) return;
    setActiveTab(id);
    backendAPI.post("/track-event", { event: `trophyTabViews-${id}` }).catch(() => undefined);
  };

  // Arrow keys (and Home/End) move between tabs, as in the WAI-ARIA tabs pattern
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex(({ id }) => id === activeTab);
    const nextIndex = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    }[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextId = TABS[nextIndex].id;
    selectTab(nextId);
    tabRefs.current[nextId]?.focus();
  };

  const renderLeaderboard = () => {
    if (isLoadingLeaderboard && !leaderboard)
      return (
        <p className="p2" role="status">
          Loading leaderboard...
        </p>
      );
    return (
      <>
        {leaderboard && <LeaderboardTable data={leaderboard} />}
        {isAdmin && (
          <button
            type="button"
            className="btn btn-danger-outline"
            disabled={isLoadingLeaderboard}
            onClick={() => setShowResetConfirm(true)}
          >
            Reset leaderboard
          </button>
        )}
      </>
    );
  };

  return (
    <PageContainer isLoading={isLoading}>
      <div className="tc-workshop">
        <div className="tc-workshop__top">
          <h2 className="tc-sign">Trophy Case</h2>
          <p className="tc-hint">See this world's top toymakers and every badge you can earn.</p>
        </div>

        <div className="tc-welcome">
          <div className="tc-tabs" role="tablist" aria-label="Trophy case">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                ref={(element) => (tabRefs.current[id] = element)}
                type="button"
                role="tab"
                id={`tc-tab-${id}`}
                className="tc-tab"
                aria-selected={activeTab === id}
                aria-controls={`tc-tabpanel-${id}`}
                tabIndex={activeTab === id ? 0 : -1}
                onClick={() => selectTab(id)}
                onKeyDown={handleTabKeyDown}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            className="tc-panel tc-tabpanel"
            role="tabpanel"
            id={`tc-tabpanel-${activeTab}`}
            aria-labelledby={`tc-tab-${activeTab}`}
            tabIndex={0}
          >
            {activeTab === "leaderboard" ? renderLeaderboard() : <BadgeCase />}
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <ConfirmationModal
          title="Reset leaderboard?"
          message="Everyone will be removed from this world's leaderboard. Players keep their XP, level, Toy Tokens, badges, and decor, and reappear as they keep playing. This can't be undone."
          confirmLabel="Reset leaderboard"
          handleOnConfirm={resetLeaderboard}
          handleToggleShowConfirmationModal={() => setShowResetConfirm(false)}
        />
      )}
    </PageContainer>
  );
};

export default Trophy;
