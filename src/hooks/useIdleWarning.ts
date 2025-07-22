import { useEffect, useRef, useCallback } from "react";
import useWorkOSStore from "./useWorkOSStore";

import { IDLE_TIMEOUT, COUNTDOWN_DURATION } from "@/constants/timing";

export const useIdleWarning = () => {
  const {
    isLoggedIn,
    idleWarningCount,
    isIdleWarningActive,
    isUserActive,
    setIdleWarningCount,
    setIsIdleWarningActive,
    setIsUserActive,
    setLastActivityTime,
    setIdleCountdown,
    setIsLoggedOutFromIdle,
    setModalIsOpen,
    setRequestingTabId,
  } = useWorkOSStore();

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCountingDownRef = useRef(false);

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
  ]);

  // Activity detection
  const handleActivity = useCallback(() => {
    if (!isLoggedIn) return;
    if (useWorkOSStore.getState().isLoggedOutFromIdle) return;
    const now = Date.now();
    setLastActivityTime(now);
    localStorage.setItem(
      "idle-activity-detected",
      JSON.stringify({
        timestamp: now,
        tabId: Math.random().toString(36).substr(2, 9),
      })
    );
    if (isIdleWarningActive && !isUserActive) {
      setIsUserActive(true);
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      isCountingDownRef.current = false;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      resetIdleTimer();
      return;
    }
    if (isIdleWarningActive && isUserActive && !isCountingDownRef.current) {
      resetIdleTimer();
      return;
    }
    if (!isIdleWarningActive && isUserActive) {
      resetIdleTimer();
      return;
    }
    if (!isIdleWarningActive) {
      resetIdleTimer();
    }
  }, [
    isLoggedIn,
    isIdleWarningActive,
    isUserActive,
    setLastActivityTime,
    setIsUserActive,
    resetIdleTimer,
  ]);

  // Handle cross-tab storage events
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
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
    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, [
    isLoggedIn,
    idleWarningCount,
    isIdleWarningActive,
    isUserActive,
    setIdleWarningCount,
    setIsIdleWarningActive,
    setIsUserActive,
    setLastActivityTime,
    setModalIsOpen,
    setIsLoggedOutFromIdle,
    setRequestingTabId,
    startCountdown,
    resetIdleTimer,
  ]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const events = ["keydown", "click", "mousemove"];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });
    resetIdleTimer();
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [isLoggedIn, handleActivity, resetIdleTimer]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const currentState = useWorkOSStore.getState();
    if (
      !currentState.isIdleWarningActive &&
      !currentState.isLoggedOutFromIdle
    ) {
      const requestingTabId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem(
        "idle-state-request",
        JSON.stringify({
          timestamp: Date.now(),
          requestingTabId: requestingTabId,
        })
      );
      setRequestingTabId(requestingTabId);
    }
    if (currentState.isIdleWarningActive) {
      setModalIsOpen(true);
      if (!currentState.isUserActive) {
        startCountdown();
      } else if (currentState.isUserActive) {
        resetIdleTimer();
      }
    }
  }, [
    isLoggedIn,
    isIdleWarningActive,
    isUserActive,
    idleWarningCount,
    setModalIsOpen,
    setRequestingTabId,
    startCountdown,
    resetIdleTimer,
  ]);

  useEffect(() => {
    if (!isLoggedIn) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }
  }, [isLoggedIn]);

  const handleModalDismissal = useCallback(() => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    isCountingDownRef.current = false;
    const newWarningCount = idleWarningCount + 1;
    setIdleWarningCount(newWarningCount);
    setIsUserActive(false);
    setIsIdleWarningActive(false);
    setModalIsOpen(false);
    localStorage.setItem(
      "idle-modal-dismissed",
      JSON.stringify({
        warningCount: newWarningCount,
        timestamp: Date.now(),
        tabId: Math.random().toString(36).substr(2, 9),
      })
    );
    resetIdleTimer();
  }, [
    idleWarningCount,
    setIdleWarningCount,
    setIsUserActive,
    setIsIdleWarningActive,
    setModalIsOpen,
    resetIdleTimer,
  ]);

  return {
    handleActivity,
    resetIdleTimer,
    handleModalDismissal,
  };
};
