import { useEffect, useRef, useCallback } from "react";
import useWorkOSStore from "./useWorkOSStore";

const IDLE_TIMEOUT = 5000; // 5 seconds
const COUNTDOWN_DURATION = 10; // 10 seconds

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
    resetStore,
  } = useWorkOSStore();

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCountingDownRef = useRef(false);

  // Start countdown timer
  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
    }

    isCountingDownRef.current = true;
    setIdleCountdown(COUNTDOWN_DURATION);

    // Create countdown function that doesn't depend on closure
    const runCountdown = (currentCount: number) => {
      if (currentCount <= 0) {
        console.log("Countdown finished - logging out");
        isCountingDownRef.current = false;

        // Increment warning count when countdown completes
        setIdleWarningCount(idleWarningCount + 1);

        setIsLoggedOutFromIdle(true);
        resetStore();

        localStorage.setItem(
          "idle-logout",
          JSON.stringify({
            timestamp: Date.now(),
            tabId: Math.random().toString(36).substr(2, 9),
          })
        );
        return;
      }

      // Update countdown in store
      setIdleCountdown(currentCount);

      // Schedule next tick if still counting
      if (isCountingDownRef.current) {
        countdownTimerRef.current = setTimeout(() => {
          runCountdown(currentCount - 1);
        }, 1000);
      }
    };

    // Start countdown
    setTimeout(() => {
      runCountdown(COUNTDOWN_DURATION - 1);
    }, 1000);
  }, [
    setIdleCountdown,
    setIsLoggedOutFromIdle,
    resetStore,
    idleWarningCount,
    setIdleWarningCount,
  ]);

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Don't start idle timer if countdown is active
    if (isLoggedIn && !isCountingDownRef.current) {
      idleTimerRef.current = setTimeout(() => {
        // Check if this is the 4th idle period (after 3 warnings)
        if (idleWarningCount >= 3) {
          console.log("Final warning exceeded - immediate logout");
          setIsLoggedOutFromIdle(true);
          setModalIsOpen(true);
          resetStore();
          return;
        }

        if (isIdleWarningActive) {
          // User became idle again while modal is open - advance to next warning
          const nextWarningCount = idleWarningCount + 1;

          // If this would be the 4th warning, log out immediately
          if (nextWarningCount >= 3) {
            setIsLoggedOutFromIdle(true);
            setModalIsOpen(true);
            resetStore();
            return;
          }

          setIdleWarningCount(nextWarningCount);
          setIsUserActive(false);
          startCountdown();
        } else {
          // First idle timeout - show initial warning modal
          setIsIdleWarningActive(true);
          setIsUserActive(false);
          setModalIsOpen(true);
          startCountdown();
        }

        // Broadcast warning to other tabs
        localStorage.setItem(
          "idle-warning-triggered",
          JSON.stringify({
            warningCount: idleWarningCount + 1, // This is what the count WILL be
            timestamp: Date.now(),
            tabId: Math.random().toString(36).substr(2, 9),
          })
        );
      }, IDLE_TIMEOUT);
    }
  }, [
    isLoggedIn,
    isIdleWarningActive,
    idleWarningCount,
    setIsLoggedOutFromIdle,
    setModalIsOpen,
    resetStore,
    setIsIdleWarningActive,
    setIdleWarningCount,
    setIsUserActive,
    startCountdown,
  ]);

  // Activity detection
  const handleActivity = useCallback(() => {
    if (!isLoggedIn) return;

    const now = Date.now();
    setLastActivityTime(now);

    // If warning is active and user becomes active for the first time
    if (isIdleWarningActive && !isUserActive) {
      setIsUserActive(true);

      // Stop countdown timer when user becomes active
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      isCountingDownRef.current = false;

      // IMPORTANT: Clear any existing idle timer to prevent false next warning triggers
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      // Resume idle timer now that user is active - mouse movement will reset this
      resetIdleTimer();

      // DON'T restart idle timer here - wait for modal to be dismissed
      // This prevents triggering next warning while user is still interacting with current modal

      // Broadcast activity to other tabs
      localStorage.setItem(
        "idle-activity-detected",
        JSON.stringify({
          timestamp: now,
          tabId: Math.random().toString(36).substr(2, 9),
        })
      );
      return;
    }

    // If warning is active and user is already active, reset idle timer
    // This allows continued mouse movement to reset the idle countdown
    if (isIdleWarningActive && isUserActive) {
      resetIdleTimer(); // Reset the idle timer on continued activity
      return;
    }

    // If user is active and modal was dismissed (warning not active), restart idle timer
    if (!isIdleWarningActive && isUserActive) {
      resetIdleTimer();
      return;
    }

    // Normal case: no warning active, restart idle timer for any activity
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
            setIdleWarningCount(data.warningCount);
            setIsIdleWarningActive(true);
            setIsUserActive(false);
            setModalIsOpen(true);
            startCountdown();
          }
          break;

        case "idle-activity-detected":
          if (e.newValue && isIdleWarningActive) {
            const data = JSON.parse(e.newValue);
            setIsUserActive(true);
            setLastActivityTime(data.timestamp);
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            isCountingDownRef.current = false;
          }
          break;

        case "idle-logout":
          if (e.newValue) {
            setIsLoggedOutFromIdle(true);
            resetStore();
          }
          break;
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, [
    isLoggedIn,
    isIdleWarningActive,
    setIdleWarningCount,
    setIsIdleWarningActive,
    setIsUserActive,
    setLastActivityTime,
    setModalIsOpen,
    setIsLoggedOutFromIdle,
    resetStore,
    startCountdown,
    resetIdleTimer,
  ]);

  // Set up activity listeners
  useEffect(() => {
    if (!isLoggedIn) return;

    const events = ["keydown", "click", "mousemove"];

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start idle timer
    resetIdleTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });

      const idleTimer = idleTimerRef.current;
      const countdownTimer = countdownTimerRef.current;

      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      if (countdownTimer) {
        clearInterval(countdownTimer);
      }
    };
  }, [isLoggedIn, handleActivity, resetIdleTimer]);

  // Clean up timers when user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }
  }, [isLoggedIn]);

  // Handle modal dismissal - increment warning count if user was active and no progression happened
  const handleModalDismissal = useCallback(() => {
    // Only increment if user was active (meaning they stopped a countdown but didn't trigger a new warning)
    if (isUserActive) {
      setIdleWarningCount(idleWarningCount + 1);
    }

    // Reset user active state for next warning cycle
    setIsUserActive(false);

    // Restart idle timer now that modal is dismissed
    resetIdleTimer();
  }, [
    isUserActive,
    idleWarningCount,
    setIdleWarningCount,
    setIsUserActive,
    resetIdleTimer,
  ]);

  return {
    handleActivity,
    resetIdleTimer,
    handleModalDismissal,
  };
};
