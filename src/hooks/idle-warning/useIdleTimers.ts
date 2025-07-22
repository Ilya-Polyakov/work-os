import { useCallback } from "react";
import { IDLE_TIMEOUT, COUNTDOWN_DURATION } from "@/constants/timing";
import useWorkOSStore from "@/hooks/useWorkOSStore";

export const useIdleTimers = ({
  idleTimerRef,
  countdownTimerRef,
  isCountingDownRef,
}: {
  idleTimerRef: React.RefObject<NodeJS.Timeout | null>;
  countdownTimerRef: React.RefObject<NodeJS.Timeout | null>;
  isCountingDownRef: React.RefObject<boolean>;
}) => {
  const {
    setIdleCountdown,
    setIsLoggedOutFromIdle,
    setModalIsOpen,
    setIdleWarningCount,
    setIsIdleWarningActive,
    setIsUserActive,
    isLoggedIn,
    idleWarningCount,
    isIdleWarningActive,
  } = useWorkOSStore();

  // Start countdown timer
  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    isCountingDownRef.current = true;
    setIdleCountdown(COUNTDOWN_DURATION);

    const runCountdown = (currentCount: number) => {
      if (!isCountingDownRef.current) return;
      if (currentCount <= 0) {
        isCountingDownRef.current = false;
        const currentWarningCount = useWorkOSStore.getState().idleWarningCount;
        setIdleWarningCount(currentWarningCount + 1);
        setIsLoggedOutFromIdle(true);
        setModalIsOpen(true);
        localStorage.setItem(
          "idle-logout",
          JSON.stringify({
            timestamp: Date.now(),
            tabId: Math.random().toString(36).substr(2, 9),
          })
        );
        return;
      }
      setIdleCountdown(currentCount);
      if (isCountingDownRef.current) {
        countdownTimerRef.current = setTimeout(() => {
          runCountdown(currentCount - 1);
        }, 1000);
      }
    };
    countdownTimerRef.current = setTimeout(() => {
      runCountdown(COUNTDOWN_DURATION - 1);
    }, 1000);
  }, [
    setIdleCountdown,
    setIsLoggedOutFromIdle,
    setModalIsOpen,
    setIdleWarningCount,
    idleTimerRef,
    countdownTimerRef,
    isCountingDownRef,
  ]);

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (
      isLoggedIn &&
      !isCountingDownRef.current &&
      !useWorkOSStore.getState().isLoggedOutFromIdle &&
      (!isIdleWarningActive || useWorkOSStore.getState().isUserActive)
    ) {
      idleTimerRef.current = setTimeout(() => {
        if (idleWarningCount >= 3) {
          setIsLoggedOutFromIdle(true);
          setModalIsOpen(true);
          localStorage.setItem(
            "idle-logout",
            JSON.stringify({
              timestamp: Date.now(),
              tabId: Math.random().toString(36).substr(2, 9),
            })
          );
          return;
        }
        if (isIdleWarningActive) {
          const currentIsUserActive = useWorkOSStore.getState().isUserActive;
          if (currentIsUserActive) {
            const nextWarningCount = idleWarningCount + 1;
            if (nextWarningCount >= 3) {
              setIsLoggedOutFromIdle(true);
              setModalIsOpen(true);
              localStorage.setItem(
                "idle-logout",
                JSON.stringify({
                  timestamp: Date.now(),
                  tabId: Math.random().toString(36).substr(2, 9),
                })
              );
              return;
            }
            setIdleWarningCount(nextWarningCount);
            setIsUserActive(false);
            startCountdown();
            localStorage.setItem(
              "idle-warning-triggered",
              JSON.stringify({
                warningCount: nextWarningCount,
                timestamp: Date.now(),
                tabId: Math.random().toString(36).substr(2, 9),
              })
            );
          } else {
            setIsUserActive(false);
            startCountdown();
          }
        } else {
          setIsIdleWarningActive(true);
          setIsUserActive(false);
          setModalIsOpen(true);
          startCountdown();
          localStorage.setItem(
            "idle-warning-triggered",
            JSON.stringify({
              warningCount: idleWarningCount,
              timestamp: Date.now(),
              tabId: Math.random().toString(36).substr(2, 9),
            })
          );
        }
      }, IDLE_TIMEOUT);
    }
  }, [
    isLoggedIn,
    idleWarningCount,
    isIdleWarningActive,
    setIsLoggedOutFromIdle,
    setModalIsOpen,
    setIsIdleWarningActive,
    setIdleWarningCount,
    setIsUserActive,
    startCountdown,
    isCountingDownRef,
    idleTimerRef,
  ]);

  return { startCountdown, resetIdleTimer };
};
