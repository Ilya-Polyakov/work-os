import useWorkOSStore from "@/hooks/useWorkOSStore";

export const createStorageHandler = ({
  isCountingDownRef,
  countdownTimerRef,
  resetIdleTimer,
  startCountdown,
  setIdleWarningCount,
  setIsIdleWarningActive,
  setIsUserActive,
  setModalIsOpen,
  setLastActivityTime,
  setIsLoggedOutFromIdle,
  setRequestingTabId,
  idleWarningCount,
  isIdleWarningActive,
  isUserActive,
  isLoggedIn,
}: {
  isCountingDownRef: React.RefObject<boolean>;
  countdownTimerRef: React.RefObject<NodeJS.Timeout | null>;
  resetIdleTimer: () => void;
  startCountdown: () => void;
  setIdleWarningCount: (count: number) => void;
  setIsIdleWarningActive: (active: boolean) => void;
  setIsUserActive: (active: boolean) => void;
  setModalIsOpen: (open: boolean) => void;
  setLastActivityTime: (timestamp: number) => void;
  setIsLoggedOutFromIdle: (loggedOut: boolean) => void;
  setRequestingTabId: (tabId: string | null) => void;
  idleWarningCount: number;
  isIdleWarningActive: boolean;
  isUserActive: boolean;
  isLoggedIn: boolean;
}) => {
  return (e: StorageEvent) => {
    if (!isLoggedIn) return;

    switch (e.key) {
      case "idle-warning-triggered":
        if (e.newValue) {
          const data = JSON.parse(e.newValue);
          if (data.warningCount > idleWarningCount) {
            setIdleWarningCount(data.warningCount);
            setIsIdleWarningActive(true);
            setIsUserActive(false);
            setModalIsOpen(true);
            startCountdown();
          } else if (
            data.warningCount === idleWarningCount &&
            !isIdleWarningActive
          ) {
            setIsIdleWarningActive(true);
            setIsUserActive(false);
            setModalIsOpen(true);
            startCountdown();
          }
        }
        break;
      case "idle-activity-detected":
        if (e.newValue) {
          const data = JSON.parse(e.newValue);
          setLastActivityTime(data.timestamp);
          if (isIdleWarningActive) {
            setIsUserActive(true);
            if (countdownTimerRef.current) {
              clearTimeout(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            isCountingDownRef.current = false;
            resetIdleTimer();
          }
          if (!isIdleWarningActive) {
            resetIdleTimer();
          }
        }
        break;
      case "idle-logout":
        if (e.newValue) {
          setIsLoggedOutFromIdle(true);
          setModalIsOpen(true);
        }
        break;
      case "idle-modal-dismissed":
        if (e.newValue && isIdleWarningActive) {
          const data = JSON.parse(e.newValue);
          if (data.warningCount >= idleWarningCount) {
            setIdleWarningCount(data.warningCount);
            setIsIdleWarningActive(false);
            setIsUserActive(false);
            setModalIsOpen(false);
          }
        }
        break;
      case "idle-state-request":
        if (e.newValue) {
          const data = JSON.parse(e.newValue);
          if (
            isIdleWarningActive ||
            useWorkOSStore.getState().isLoggedOutFromIdle
          ) {
            localStorage.setItem(
              "idle-state-response",
              JSON.stringify({
                isIdleWarningActive: isIdleWarningActive,
                isUserActive: isUserActive,
                idleWarningCount: idleWarningCount,
                isLoggedOutFromIdle:
                  useWorkOSStore.getState().isLoggedOutFromIdle,
                timestamp: Date.now(),
                respondingTabId: Math.random().toString(36).substr(2, 9),
                forRequestingTabId: data.requestingTabId,
              })
            );
          }
        }
        break;
      case "idle-state-response":
        if (e.newValue) {
          const data = JSON.parse(e.newValue);
          const currentRequestingTabId =
            useWorkOSStore.getState().requestingTabId;
          if (
            currentRequestingTabId &&
            data.forRequestingTabId === currentRequestingTabId
          ) {
            if (
              data.isLoggedOutFromIdle &&
              !useWorkOSStore.getState().isLoggedOutFromIdle
            ) {
              setIsLoggedOutFromIdle(true);
              setModalIsOpen(true);
              setRequestingTabId(null);
              return;
            }
            if (!isIdleWarningActive && data.isIdleWarningActive) {
              setIdleWarningCount(data.idleWarningCount);
              setIsIdleWarningActive(true);
              setIsUserActive(data.isUserActive);
              setModalIsOpen(true);
              setRequestingTabId(null);
              if (!data.isUserActive) {
                startCountdown();
              } else {
                resetIdleTimer();
              }
            }
          }
        }
        break;
    }
  };
};
