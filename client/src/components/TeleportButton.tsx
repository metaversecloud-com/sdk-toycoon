import { ReactNode, useContext, useState } from "react";

// context
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage } from "@/utils";

export const TeleportButton = ({
  children,
  className = "btn",
  destination,
}: {
  children: ReactNode;
  className?: string;
  destination: "my-booth" | "main-scene";
}) => {
  const dispatch = useContext(GlobalDispatchContext);
  const [isTeleporting, setIsTeleporting] = useState(false);

  const handleTeleport = () => {
    setIsTeleporting(true);
    setErrorMessage(dispatch, "");

    backendAPI
      .post(`/teleport/${destination}`)
      .catch((error) => setErrorMessage(dispatch, error as ErrorType))
      .finally(() => setIsTeleporting(false));
  };

  return (
    <button type="button" className={className} disabled={isTeleporting} onClick={handleTeleport}>
      {isTeleporting ? "Teleporting..." : children}
    </button>
  );
};

export default TeleportButton;
