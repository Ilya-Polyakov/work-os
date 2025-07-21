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
    isLoggedIn: currentlyLoggedIn,
    username: currentUsername,
    loadingController,
    isLoading: currentIsLoading,
    totalClicks: currentTotalClicks,
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
        if (
          timeSinceLastUpdate > 3000 &&
          currentState.isLoading &&
          !currentState.isLoggedIn &&
          currentState.username
        ) {
          // Clear the health check
          if (controllerHealthCheck.current) {
            clearInterval(controllerHealthCheck.current);
            controllerHealthCheck.current = null;
          }

          // Complete the login
          setLoadingProgress(100);
          setTimeout(() => {
            setIsLoggedIn(true);
            setIsLoading(false);
          }, 500);
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
      setIsLoading(true);
      setUsername(currentState.username);
      setLoadingProgress(currentState.loadingProgress);
      setLoadingController(currentState.loadingController); // CRITICAL: Sync controller on mount too!
      lastProgressUpdate.current = Date.now();
      return; // Don't run safety checks if we're syncing
    }

    // CRITICAL: Handle stuck loading state (loading=true but no controller)
    if (
      currentState.isLoading &&
      !currentState.loadingController && // No controller
      !currentState.isLoggedIn &&
      currentState.username // There's a username being loaded
    ) {
      // Complete the login immediately since we're stuck
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
          // Loading complete
          setLoadingProgress(100);
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
      // Check if the change is to our work-os-storage key
      if (e.key === "work-os-storage" && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          const newStateData = newState.state;

          // Handle totalClicks sync (sync clicks across tabs)
          if (
            newStateData?.totalClicks !== undefined &&
            newStateData.totalClicks !== currentTotalClicks
          ) {
            // Don't use incrementClicks or resetClicks as they would trigger more storage events
            // Instead, set the totalClicks directly via the store
            useWorkOSStore.setState({ totalClicks: newStateData.totalClicks });
          }

          // Handle logout (another tab logged out)
          if (!newStateData?.username && currentlyLoggedIn) {
            // Force a page reload to redirect to login
            window.location.href = "/";
            return;
          }

          // Handle controller loss: complete login immediately instead of competing
          if (
            newStateData?.isLoading &&
            !newStateData?.loadingController && // No controller
            !currentlyLoggedIn &&
            currentIsLoading && // We're already in loading state
            newStateData?.username // There's a username being loaded
          ) {
            // Wait a bit to see if the controller really is gone
            // This prevents immediate completion when there are just temporary storage events
            setTimeout(() => {
              const latestState = useWorkOSStore.getState();
              const currentLoadingState = latestState.isLoading; // Get fresh loading state

              // Double-check that we still don't have a controller after the delay
              if (
                latestState.isLoading &&
                !latestState.loadingController &&
                !latestState.isLoggedIn &&
                currentLoadingState // Use fresh loading state instead of stale closure variable
              ) {
                setLoadingProgress(100);
                setTimeout(() => {
                  setIsLoggedIn(true);
                  setIsLoading(false);
                }, 500); // Brief delay to show 100% completion
              }
            }, 1500); // Wait 1.5 seconds to confirm controller is really gone
          }

          // Handle login start (another tab started logging in) - ONLY if we're not already synced
          if (
            newStateData?.isLoading &&
            newStateData?.username &&
            newStateData?.loadingController &&
            newStateData.loadingController !== tabId.current &&
            !currentlyLoggedIn &&
            !currentIsLoading // Only sync if we're NOT already loading
          ) {
            // Sync the loading state, username, and controller info
            setIsLoading(true);
            setUsername(newStateData.username);
            setLoadingController(newStateData.loadingController); // CRITICAL: Sync the controller too!
            // Initialize the progress tracking timestamp
            lastProgressUpdate.current = Date.now();
          }

          // Sync loading progress from the controlling tab (but only if we're not the controller and already loading)
          if (
            newStateData?.isLoading &&
            newStateData?.loadingController &&
            newStateData.loadingController !== tabId.current &&
            newStateData?.loadingProgress !== undefined &&
            !currentlyLoggedIn &&
            currentIsLoading // Only sync progress if we're already in loading state
          ) {
            // Only sync progress, don't interfere with the simulation
            setLoadingProgress(newStateData.loadingProgress);
            // Track that we saw a progress update (for controller health monitoring)
            lastProgressUpdate.current = Date.now();
          }

          // Handle login completion (another tab finished logging in)
          if (
            newStateData?.isLoggedIn &&
            newStateData?.username &&
            !newStateData?.isLoading &&
            !currentlyLoggedIn
          ) {
            // Complete the login in this tab too
            setIsLoggedIn(true);
            setIsLoading(false);
            setUsername(newStateData.username);
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
    setIsLoggedIn,
    setUsername,
    setIsLoading,
    setLoadingProgress,
    setLoadingController,
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
