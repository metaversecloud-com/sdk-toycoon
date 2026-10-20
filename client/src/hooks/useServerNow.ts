import { useContext, useEffect, useState } from "react";

import { GlobalStateContext } from "@/context/GlobalContext";

/**
 * The server's current time, ticking once a second. Timers are started with server timestamps, so countdowns use the
 * server's clock (this computer's clock + the offset measured when game state loaded). That way a player whose clock is
 * off still sees a station become ready exactly when the server will accept Collect.
 */
export const useServerNow = () => {
  const { serverTimeOffset = 0 } = useContext(GlobalStateContext);
  const [now, setNow] = useState(() => Date.now() + serverTimeOffset);

  useEffect(() => {
    setNow(Date.now() + serverTimeOffset);
    const timer = setInterval(() => setNow(Date.now() + serverTimeOffset), 1000);
    return () => clearInterval(timer);
  }, [serverTimeOffset]);

  return now;
};

export default useServerNow;
