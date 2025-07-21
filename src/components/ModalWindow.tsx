import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

import Window from "./Window";
import useWorkOSStore from "@/hooks/useWorkOSStore";
import { useIdleWarning } from "@/hooks/useIdleWarning";

interface ModalWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalWindow = ({ isOpen, onClose }: ModalWindowProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const {
    idleWarningCount,
    isUserActive,
    idleCountdown,
    isLoggedOutFromIdle,
    setIsIdleWarningActive,
  } = useWorkOSStore();

  // Get idle warning functions
  const { handleModalDismissal } = useIdleWarning();

  useEffect(() => {
    // Set mounted to true after component mounts (client-side)
    setIsMounted(true);
  }, []);

  // Don't render anything on server-side or if not open
  if (!isMounted || !isOpen) return null;

  // Close modal handler
  const handleClose = () => {
    console.log("Modal closing - user clicked continue");

    // If this is a logout modal, handle differently
    if (isLoggedOutFromIdle) {
      console.log("Handling logout modal dismissal");
      // Reset store and actually log the user out
      const { resetStore } = useWorkOSStore.getState();
      resetStore();
      onClose();
      return;
    }

    // Handle modal dismissal logic (increment warning count if user was active)
    handleModalDismissal();

    setIsIdleWarningActive(false);
    onClose();

    // Don't restart idle timer automatically - wait for real user activity
    // The idle timer will restart when handleActivity detects real activity
  };

  // Get warning content based on state
  const getWarningContent = () => {
    if (isLoggedOutFromIdle) {
      return {
        title: "Logged Out!",
        message:
          "You have been logged out due to inactivity. Report to your nearest supervisor for reprimanding.",
        showCountdown: false,
        showButton: true,
        buttonText: "OK",
      };
    }

    const warningTitles = ["First Warning", "Second Warning", "Final Warning"];

    const warningMessages = [
      "You have been idle for over 30 seconds.",
      "Return to work immediately.",
      "There will be consequences.",
    ];

    const title = warningTitles[idleWarningCount] || "Warning";
    const message = warningMessages[idleWarningCount] || "You have been idle.";

    if (isUserActive) {
      return {
        title,
        message: "Good, you're back to work!",
        showCountdown: false,
        showButton: true,
        buttonText: "Continue",
      };
    }

    return {
      title,
      message,
      showCountdown: true,
      showButton: true,
      buttonText: "Continue",
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

export default ModalWindow;
