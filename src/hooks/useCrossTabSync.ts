import { useEffect, useCallback, useRef } from "react";
import useWorkOSStore from "./useWorkOSStore";

/**
 * Hook to handle cross-tab synchronization for login/logout events
 * Listens for storage changes and handles authentication state across tabs
 */
export const useCrossTabSync = () => {
  const {
    setIsLoggedIn,
    setUsername,
    setIsLoading,
    setLoadingProgress,
    setLoadingController,
    loadingProgress: currentLoadingProgress,
    isLoggedIn: currentlyLoggedIn,
    username: currentUsername,
    loadingController,
    isLoading: currentIsLoading,
    totalClicks: currentTotalClicks,
    clearLogoutFlag, // Add this to access the logout flag reset function
  } = useWorkOSStore();

  // Generate a unique tab ID with timestamp for priority ordering
  const tabId = useRef(
    `${Date.now()}-${Math.random().toString(36).substring(7)}`
  );

  // Track when we last saw a progress update to detect controller failure
  const lastProgressUpdate = useRef(Date.now());
  const controllerHealthCheck = useRef<NodeJS.Timeout | null>(null);

  // Health check for controller when we're syncing
  useEffect(() => {
    // Only run health check if we're currently loading but not the controller
    if (
      currentIsLoading &&
      loadingController &&
      loadingController !== tabId.current
    ) {
      // Clear any existing health check
      if (controllerHealthCheck.current) {
        clearInterval(controllerHealthCheck.current);
      }

      // Reset the progress update timer since we're starting fresh
      lastProgressUpdate.current = Date.now();

      // Check every 3 seconds for controller activity
      controllerHealthCheck.current = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastProgressUpdate.current;
        const currentState = useWorkOSStore.getState();

        // If no progress update for 3 seconds and we're still loading, assume controller is dead
        // BUT: Don't auto-complete if username is empty (indicates logout in progress)
        if (
          timeSinceLastUpdate > 3000 &&
          currentState.isLoading &&
          !currentState.isLoggedIn &&
          currentState.username &&
          currentState.username.trim() !== "" // Make sure it's not empty (logout state)
        ) {
          // Check if the controller tab is still present in localStorage
          const storageRaw = localStorage.getItem("work-os-storage");
          let controllerStillSet = false;
          if (storageRaw) {
            try {
              const storageState = JSON.parse(storageRaw);
              controllerStillSet =
                storageState.state.loadingController &&
                storageState.state.loadingController !== tabId.current;
            } catch {}
          }

          // If controller is missing or no progress update, auto-complete
          if (!controllerStillSet || timeSinceLastUpdate > 6000) {
            if (controllerHealthCheck.current) {
              clearInterval(controllerHealthCheck.current);
              controllerHealthCheck.current = null;
            }
            setLoadingProgress(100);
            setTimeout(() => {
              setIsLoggedIn(true);
              setIsLoading(false);
            }, 500);
          }
        }
      }, 3000); // Check every 3 seconds
    } else {
      // Clear health check if we're not in a syncing state
      if (controllerHealthCheck.current) {
        clearInterval(controllerHealthCheck.current);
        controllerHealthCheck.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (controllerHealthCheck.current) {
        clearInterval(controllerHealthCheck.current);
      }
    };
  }, [
    currentIsLoading,
    loadingController,
    setIsLoggedIn,
    setIsLoading,
    setLoadingProgress,
  ]);

  // Safety mechanism: detect and clear stuck loading states on mount
  useEffect(() => {
    const currentState = useWorkOSStore.getState();

    // Immediately sync if there's already a loading state from another tab
    if (
      currentState.isLoading &&
      currentState.loadingController &&
      currentState.loadingController !== tabId.current &&
      !currentState.isLoggedIn
    ) {
      console.log(
        `Tab ${tabId.current}: Syncing loading state from controller ${currentState.loadingController}`
      );
      setIsLoading(true);
      setUsername(currentState.username);
      setLoadingProgress(currentState.loadingProgress);
      setLoadingController(currentState.loadingController); // CRITICAL: Sync controller on mount too!
      lastProgressUpdate.current = Date.now();
      return; // Don't run safety checks if we're syncing\
    }

    // CRITICAL: Handle stuck loading state (loading=true but no controller)
    // BUT: Don't auto-complete if username is empty (indicates logout)
    if (
      currentState.isLoading &&
      !currentState.loadingController && // Controller is gone
      !currentState.isLoggedIn &&
      currentState.username &&
      currentState.username.trim() !== ""
    ) {
      // Controller is gone, auto-complete loading in this tab
      setLoadingProgress(100);
      setTimeout(() => {
        setIsLoggedIn(true);
        setIsLoading(false);
        setUsername(currentState.username);
      }, 500);
      return;
    }
  }, [
    setIsLoading,
    setUsername,
    setLoadingProgress,
    setIsLoggedIn,
    setLoadingController,
  ]);

  const simulateLoading = useCallback(
    (totalDuration: number, onComplete: () => void, controllerId?: string) => {
      // Use provided controllerId or check current controller
      const isController = controllerId
        ? controllerId === tabId.current
        : loadingController === tabId.current;

      if (!isController) {
        return;
      }

      setLoadingProgress(0);
      let currentProgress = 0;
      const startTime = Date.now();

      const updateProgress = () => {
        // Check if we're still the controller
        const currentState = useWorkOSStore.getState();
        if (currentState.loadingController !== tabId.current) {
          return; // Another tab took over
        }

        const elapsedTime = Date.now() - startTime;

        if (elapsedTime >= totalDuration) {
          setLoadingProgress(100);

          // Broadcast final state to localStorage so followers can complete login
          const currentState = useWorkOSStore.getState();
          localStorage.setItem(
            "work-os-storage",
            JSON.stringify({
              state: {
                isLoggedIn: true,
                username: currentState.username,
                isLoading: false,
                loadingController: null,
                loadingProgress: 100,
                totalClicks: currentState.totalClicks,
              },
            })
          );

          setTimeout(() => {
            onComplete();
            setLoadingController(null); // Release control
          }, 1000); // Small delay to show 100% completion
          return;
        }

        // Calculate random increment (1-8% at a time)
        const randomIncrement = Math.random() * 7 + 1;

        // Don't let progress exceed what it should be based on time elapsed
        const timeBasedProgress = (elapsedTime / totalDuration) * 85; // Cap at 85% until complete
        const newProgress = Math.min(
          currentProgress + randomIncrement,
          timeBasedProgress,
          95 // Never exceed 95% until completion
        );

        currentProgress = newProgress;
        setLoadingProgress(Math.floor(currentProgress));

        // Schedule next update with random delay (100-800ms)
        const randomDelay = Math.random() * 700 + 100;
        setTimeout(updateProgress, randomDelay);
      };

      updateProgress();
    },
    [setLoadingProgress, setLoadingController, loadingController]
  );

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Handle explicit user logout broadcast - this takes PRIORITY over everything else
      if (e.key === "user-logout" && e.newValue) {
        setIsLoggedIn(false);
        setIsLoading(false); // <-- Add this line
        setLoadingProgress(0); // <-- Add this line
        setLoadingController(null); // <-- Add this line
        setUsername("");

        // Also clear any idle warning state
        const {
          setIsLoggedOutFromIdle,
          setModalIsOpen,
          resetIdleWarningSystem,
        } = useWorkOSStore.getState();
        setIsLoggedOutFromIdle(false);
        setModalIsOpen(false);
        resetIdleWarningSystem();

        // Clear the global logout flag to allow future logouts
        setTimeout(() => {
          clearLogoutFlag();
        }, 100);
        return;
      }

      // Check if the change is to our work-os-storage key
      if (e.key === "work-os-storage" && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          const newStateData = newState.state;

          // Ignore redundant storage events to prevent infinite loops
          if (
            newStateData?.isLoggedIn === currentlyLoggedIn &&
            newStateData?.isLoading === currentIsLoading &&
            newStateData?.username === currentUsername &&
            newStateData?.loadingProgress ===
              useWorkOSStore.getState().loadingProgress &&
            newStateData?.totalClicks === currentTotalClicks
          ) {
            // No state change, ignore event
            return;
          }

          // If controller is gone and we're still loading, auto-complete
          if (
            newStateData?.isLoading &&
            !newStateData?.loadingController &&
            !currentlyLoggedIn &&
            currentIsLoading &&
            newStateData?.username &&
            newStateData.username.trim() !== ""
          ) {
            setLoadingProgress(100);
            setTimeout(() => {
              setIsLoggedIn(true);
              setIsLoading(false);
              setUsername(newStateData.username);
            }, 500);
            return;
          }

          console.log("🔍 work-os-storage event - newStateData:", {
            isLoggedIn: newStateData?.isLoggedIn,
            username: newStateData?.username,
            isLoading: newStateData?.isLoading,
            loadingController: newStateData?.loadingController,
            totalClicks: newStateData?.totalClicks,
          });
          console.log("🔍 Current local state:", {
            currentlyLoggedIn,
            currentUsername,
            currentIsLoading,
            currentTotalClicks,
          });

          // CRITICAL: Check if we just received a user-logout broadcast recently
          // If so, ignore any login-related storage events for a brief period
          const recentLogout = localStorage.getItem("user-logout");
          let shouldIgnoreLogin = false;
          if (recentLogout) {
            try {
              const logoutData = JSON.parse(recentLogout);
              const timeSinceLogout = Date.now() - logoutData.timestamp;
              if (timeSinceLogout < 2000) {
                // 2 second window
                shouldIgnoreLogin = true;
              }
            } catch {
              // Ignore parsing errors
            }
          }

          // console.log("currentTotalClicks:", currentTotalClicks);
          // console.log("newStateData.totalClicks:", newStateData?.totalClicks);

          // Handle totalClicks sync (sync clicks across tabs)
          if (
            newStateData?.totalClicks !== undefined &&
            newStateData.totalClicks !== currentTotalClicks &&
            newStateData.totalClicks > currentTotalClicks // prevent improper syncing
          ) {
            console.log("🔄 Syncing totalClicks across tabs:");
            useWorkOSStore.setState({ totalClicks: newStateData.totalClicks });
          }

          // Handle controller loss: complete login immediately instead of competing
          // BUT: Don't auto-complete if username is empty (indicates logout)
          // Controller loss: complete login only if not already logged in
          if (
            newStateData?.isLoading &&
            !newStateData?.loadingController &&
            !currentlyLoggedIn &&
            currentIsLoading &&
            newStateData?.username &&
            newStateData.username.trim() !== ""
          ) {
            setTimeout(() => {
              const latestState = useWorkOSStore.getState();
              if (
                latestState.isLoading &&
                !latestState.loadingController &&
                !latestState.isLoggedIn &&
                latestState.username &&
                latestState.username.trim() !== ""
              ) {
                // Only complete login if not already logged in
                if (!latestState.isLoggedIn) {
                  setLoadingProgress(100);
                  setTimeout(() => {
                    setIsLoggedIn(true);
                    setIsLoading(false);
                  }, 500);
                }
              }
            }, 1500);
          }

          // Login completion: only if not already logged in
          if (
            newStateData?.isLoggedIn &&
            newStateData?.username &&
            !newStateData?.isLoading &&
            !currentlyLoggedIn &&
            !shouldIgnoreLogin
          ) {
            if (!currentlyLoggedIn) {
              setIsLoggedIn(true);
              setIsLoading(false);
              setUsername(newStateData.username);
            }
          }

          // Sync loading state when a new login starts in another tab (controller)
          if (
            newStateData?.isLoading &&
            newStateData?.loadingController &&
            newStateData.loadingController !== tabId.current &&
            !currentIsLoading && // Only sync if we're NOT already loading
            !shouldIgnoreLogin // Don't auto-login if recent logout detected
          ) {
            console.log(
              `Tab ${tabId.current}: Syncing loading state from controller ${newStateData.loadingController} (via storage event)`
            );
            setIsLoading(true);
            setUsername(newStateData.username);
            setLoadingProgress(newStateData.loadingProgress);
            setLoadingController(newStateData.loadingController);
            lastProgressUpdate.current = Date.now();
          }

          // Sync loading progress from the controlling tab (but only if we're not the controller and already loading)
          if (
            newStateData?.isLoading &&
            newStateData?.loadingController &&
            newStateData.loadingController !== tabId.current &&
            typeof newStateData.loadingProgress === "number" &&
            currentIsLoading // Only sync progress if we're already in loading state
          ) {
            setLoadingProgress(newStateData.loadingProgress);
            lastProgressUpdate.current = Date.now();
          }

          // Handle login completion (another tab finished logging in)
          // BUT: Don't auto-login if the storage event shows logout (no username)
          // AND: Don't auto-login if we just received a logout broadcast
          if (
            newStateData?.isLoggedIn &&
            newStateData?.username &&
            !newStateData?.isLoading &&
            !currentlyLoggedIn &&
            !shouldIgnoreLogin // Don't auto-login if recent logout detected
          ) {
            // Complete the login in this tab too
            setIsLoggedIn(true);
            setIsLoading(false);
            setUsername(newStateData.username);
          } else if (
            !newStateData?.isLoggedIn &&
            !newStateData?.username &&
            currentlyLoggedIn
          ) {
            // Another tab logged out - sync the logout
            setIsLoggedIn(false);
            setUsername("");
          }
        } catch (error) {
          console.error("Error parsing storage event:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [
    currentlyLoggedIn,
    currentUsername,
    currentIsLoading,
    currentTotalClicks,
    currentLoadingProgress,
    setIsLoggedIn,
    setUsername,
    setIsLoading,
    setLoadingProgress,
    setLoadingController,
    clearLogoutFlag,
  ]);

  // Only clear controller on actual tab close, not on tab switch/minimize
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only clear controller if the page is actually being unloaded (closed)
      // Check if this is a real close vs just switching tabs/minimizing
      const currentState = useWorkOSStore.getState();
      if (
        currentState.loadingController === tabId.current &&
        currentState.isLoading
      ) {
        console.log(
          `Tab ${tabId.current}: Page unloading, clearing controller`
        );
        setLoadingController(null);
        localStorage.setItem(
          "work-os-storage",
          JSON.stringify({
            state: {
              ...currentState,
              loadingController: null,
            },
          })
        );
        // Don't prevent the unload, just clear the controller
      }
    };

    // Use pagehide as backup - it's more reliable for detecting actual navigation away
    const handlePageHide = (e: PageTransitionEvent) => {
      if (!e.persisted) {
        // Only if page is not going into cache
        const currentState = useWorkOSStore.getState();
        if (
          currentState.loadingController === tabId.current &&
          currentState.isLoading
        ) {
          console.log(
            `Tab ${tabId.current}: Page hidden permanently, clearing controller`
          );
          setLoadingController(null);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [setLoadingController]);

  // Return the simulateLoading function and tabId for use by login components
  return {
    simulateLoading,
    tabId: tabId.current,
  };
};
