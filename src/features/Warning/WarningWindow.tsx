import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

import Window from "@/components/Window";
import useWorkOSStore from "@/hooks/useWorkOSStore";
import { useIdleWarning } from "@/hooks/idle-warning/useIdleWarning";

import { IDLE_TIMEOUT } from "@/constants/timing";

import {
  warningTitles,
  warningMessages,
  loggedOutCopy,
  userActiveCopy,
  defaultWarningCopy,
} from "./WarningWindowCopy";

interface WarningWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const WarningWindow = ({ isOpen, onClose }: WarningWindowProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const { idleWarningCount, isUserActive, idleCountdown, isLoggedOutFromIdle } =
    useWorkOSStore();

  const { handleModalDismissal } = useIdleWarning();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !isOpen) return null;

  const handleClose = () => {
    // If this is a logout modal, handle differently
    if (isLoggedOutFromIdle) {
      // Reset store and actually log the user out
      const { resetStore } = useWorkOSStore.getState();
      resetStore();
      onClose();
      return;
    }

    // Handle modal dismissal logic (increment warning count if user was active)
    handleModalDismissal();

    onClose();
  };

  // Get warning content based on state
  const getWarningContent = () => {
    if (isLoggedOutFromIdle) {
      return {
        ...loggedOutCopy,
        showCountdown: false,
        showButton: true,
      };
    }

    const title = warningTitles[idleWarningCount] || defaultWarningCopy.title;
    const message =
      warningMessages[idleWarningCount]?.(IDLE_TIMEOUT) ||
      defaultWarningCopy.message;

    if (isUserActive) {
      return {
        ...userActiveCopy,
        showCountdown: false,
        showButton: true,
      };
    }

    return {
      title,
      message,
      showCountdown: true,
      showButton: true,
      buttonText: defaultWarningCopy.buttonText,
    };
  };

  const content = getWarningContent();
  const eyesState = isLoggedOutFromIdle
    ? "furious"
    : isUserActive
    ? "calm"
    : "angry";

  return createPortal(
    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <Window
        onClose={handleClose}
        titleBarContent={
          <>
            <Image
              src="/logo.png"
              alt="WorkOS Logo"
              width={14}
              height={14}
              priority
            />
            {isLoggedOutFromIdle ? "Session Expired" : "Get back to work!"}
          </>
        }
        windowContent={
          <>
            <div className="flex flex-col items-center">
              <Image
                src={`/images/eyes-${eyesState}.png`}
                alt={`${eyesState} Eyes`}
                width={128}
                height={128}
              />
              <div className="flex flex-col items-center text-center gap-2">
                <p>
                  <strong>{content.title}</strong>
                </p>

                <p>{content.message}</p>
                {content.showCountdown && (
                  <p>
                    You have <strong>{idleCountdown} seconds</strong> to return.
                  </p>
                )}
                {content.showButton && (
                  <button onClick={handleClose}>{content.buttonText}</button>
                )}
              </div>
            </div>
          </>
        }
      />
    </div>,
    document.body
  );
};

export default WarningWindow;
