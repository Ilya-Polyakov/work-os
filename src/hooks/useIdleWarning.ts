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

    // CRITICAL FIX: Clear any existing idle timer when countdown starts
    // This prevents the idle timer from firing during countdown and causing flickering
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
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

        // Show logout modal before resetting store
        setIsLoggedOutFromIdle(true);
        setModalIsOpen(true);

        // Broadcast logout to other tabs
        localStorage.setItem(
          "idle-logout",
          JSON.stringify({
            timestamp: Date.now(),
            tabId: Math.random().toString(36).substr(2, 9),
          })
        );

        // Don't immediately reset store - let the modal show first
        // Store will be reset when user clicks OK on logout modal
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
    setModalIsOpen,
    idleWarningCount,
    setIdleWarningCount,
  ]);

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Don't start idle timer if ANY countdown is active, user is logged out, OR modal is active
    // This prevents the 5-second idle timer from interfering with 10-second countdowns
    if (
      isLoggedIn &&
      !isCountingDownRef.current &&
      !useWorkOSStore.getState().isLoggedOutFromIdle &&
      !isIdleWarningActive
    ) {
      idleTimerRef.current = setTimeout(() => {
        // Check if this is the 4th idle period (after 3 warnings)
        if (idleWarningCount >= 3) {
          console.log("Final warning exceeded - immediate logout");
          setIsLoggedOutFromIdle(true);
          setModalIsOpen(true);

          // Broadcast logout to other tabs
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
          // User became idle again while modal is open
          console.log("User became idle again while modal is open", {
            isUserActive: useWorkOSStore.getState().isUserActive,
            idleWarningCount,
            currentTime: Date.now(),
          });

          // Get the current user active state from the store to avoid stale closure values
          const currentIsUserActive = useWorkOSStore.getState().isUserActive;

          // If user was in calm state (active), advance to next warning
          if (currentIsUserActive) {
            console.log("User was in calm state - advancing to next warning");
            const nextWarningCount = idleWarningCount + 1;

            // If this would be the 4th warning, log out immediately
            if (nextWarningCount >= 3) {
              console.log("Would be 4th warning - immediate logout instead");
              setIsLoggedOutFromIdle(true);
              setModalIsOpen(true);

              // Broadcast logout to other tabs
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

            // Broadcast warning advancement to other tabs
            localStorage.setItem(
              "idle-warning-triggered",
              JSON.stringify({
                warningCount: nextWarningCount,
                timestamp: Date.now(),
                tabId: Math.random().toString(36).substr(2, 9),
              })
            );
          } else {
            // User was already idle, just restart countdown at same warning level
            console.log(
              "User was already idle - restarting countdown at same level"
            );
            setIsUserActive(false);
            startCountdown();
          }
        } else {
          // First idle timeout - show initial warning modal
          setIsIdleWarningActive(true);
          setIsUserActive(false);
          setModalIsOpen(true);
          startCountdown();

          // Broadcast initial warning to other tabs - use current warning count
          localStorage.setItem(
            "idle-warning-triggered",
            JSON.stringify({
              warningCount: idleWarningCount, // Use current count, not hardcoded 0
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

    // Don't process activity if already logged out
    if (useWorkOSStore.getState().isLoggedOutFromIdle) {
      return;
    }

    const now = Date.now();
    setLastActivityTime(now);

    // CRITICAL FIX: Always broadcast activity to other tabs to keep idle timers in sync
    // This prevents other tabs from triggering warnings when user is active in this tab
    localStorage.setItem(
      "idle-activity-detected",
      JSON.stringify({
        timestamp: now,
        tabId: Math.random().toString(36).substr(2, 9),
      })
    );

    // If warning is active and user becomes active for the first time
    if (isIdleWarningActive && !isUserActive) {
      console.log("User became active during warning - entering calm state", {
        idleWarningCount,
        isIdleWarningActive,
        isUserActive,
      });
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
      // But don't reset if we're at warning count >= 3
      if (useWorkOSStore.getState().idleWarningCount < 3) {
        console.log("Resuming idle timer in calm state");
        resetIdleTimer();
      }
      return;
    }

    // If warning is active and user is already active, reset idle timer
    // This allows continued mouse movement to reset the idle countdown
    // BUT don't reset if countdown is actively running to prevent flickering
    if (isIdleWarningActive && isUserActive && !isCountingDownRef.current) {
      if (useWorkOSStore.getState().idleWarningCount < 3) {
        resetIdleTimer(); // Reset the idle timer on continued activity
      }
      return;
    }

    // If user is active and modal was dismissed (warning not active), restart idle timer
    if (!isIdleWarningActive && isUserActive) {
      if (useWorkOSStore.getState().idleWarningCount < 3) {
        resetIdleTimer();
      }
      return;
    }

    // Normal case: no warning active, restart idle timer for any activity
    if (!isIdleWarningActive) {
      if (useWorkOSStore.getState().idleWarningCount < 3) {
        resetIdleTimer();
      }
    }
  }, [
    isLoggedIn,
    isIdleWarningActive,
    isUserActive,
    idleWarningCount,
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
            console.log(
              "Received idle-warning-triggered:",
              data,
              "Current count:",
              idleWarningCount
            );

            // CRITICAL FIX: Only sync if the broadcast warning count is HIGHER than current
            // This prevents tabs from downgrading each other's warning levels
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
              // If same warning level but we're not active, sync the modal state
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

            // If warning is active, handle warning-specific activity
            if (isIdleWarningActive) {
              setIsUserActive(true);
              if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
              }
              isCountingDownRef.current = false;
            }

            // CRITICAL FIX: Always reset idle timer when receiving cross-tab activity
            // This prevents tabs from triggering warnings when user is active in other tabs
            if (
              useWorkOSStore.getState().idleWarningCount < 3 &&
              !isIdleWarningActive
            ) {
              resetIdleTimer();
            }
          }
          break;

        case "idle-logout":
          if (e.newValue) {
            setIsLoggedOutFromIdle(true);
            setModalIsOpen(true);
            // Don't immediately reset store - let logout modal show first
          }
          break;

        case "idle-modal-dismissed":
          if (e.newValue && isIdleWarningActive) {
            const data = JSON.parse(e.newValue);

            // Only sync if the broadcast warning count is HIGHER OR EQUAL
            // This prevents tabs from being downgraded by other tab dismissals
            if (data.warningCount >= idleWarningCount) {
              setIdleWarningCount(data.warningCount);
              setIsIdleWarningActive(false);
              setIsUserActive(false);
              setModalIsOpen(false);
              // Don't restart idle timers to avoid countdown interference
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
    console.log("Modal dismissed by user - Current state:", {
      idleWarningCount,
      isUserActive,
      isIdleWarningActive,
    });

    // Stop any active countdown timer when user dismisses modal
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    isCountingDownRef.current = false;

    // Always increment warning count when user dismisses modal
    const newWarningCount = idleWarningCount + 1;
    setIdleWarningCount(newWarningCount);

    console.log("Warning dismissed - advancing to level:", newWarningCount);

    // Reset user active state for next warning cycle
    setIsUserActive(false);

    // Close modal and return to work app
    setIsIdleWarningActive(false);
    setModalIsOpen(false);

    // Broadcast modal dismissal to other tabs to keep them in sync
    localStorage.setItem(
      "idle-modal-dismissed",
      JSON.stringify({
        warningCount: newWarningCount,
        timestamp: Date.now(),
        tabId: Math.random().toString(36).substr(2, 9),
      })
    );

    // Always restart idle timer to continue monitoring
    // The resetIdleTimer logic will handle what happens when count >= 3
    resetIdleTimer();
  }, [
    idleWarningCount,
    isUserActive,
    isIdleWarningActive,
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
