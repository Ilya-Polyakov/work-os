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
    console.log(`Tab ${tabId.current}: Health check useEffect triggered:`, {
      currentIsLoading,
      loadingController,
      isOurController: loadingController === tabId.current,
      shouldStartHealthCheck:
        currentIsLoading &&
        loadingController &&
        loadingController !== tabId.current,
    });

    // Only run health check if we're currently loading but not the controller
    if (
      currentIsLoading &&
      loadingController &&
      loadingController !== tabId.current
    ) {
      console.log(
        `Tab ${tabId.current}: Starting controller health check for ${loadingController}`
      );

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

        console.log(
          `Tab ${tabId.current}: Health check - Time since last update: ${timeSinceLastUpdate}ms, State:`,
          {
            isLoading: currentState.isLoading,
            isLoggedIn: currentState.isLoggedIn,
            hasUsername: !!currentState.username,
            controller: currentState.loadingController,
          }
        );

        // If no progress update for 3 seconds and we're still loading, assume controller is dead
        if (
          timeSinceLastUpdate > 3000 &&
          currentState.isLoading &&
          !currentState.isLoggedIn &&
          currentState.username
        ) {
          console.log(
            `Tab ${tabId.current}: Controller appears dead (no updates for 3+ seconds), completing login...`
          );

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
        console.log(`Tab ${tabId.current}: Clearing controller health check`);
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
        `Tab ${tabId.current}: Found existing loading state on mount, syncing...`
      );
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
      console.log(
        `Tab ${tabId.current}: Found stuck loading state on mount (no controller), completing login...`
      );
      // Complete the login immediately since we're stuck
      setLoadingProgress(100);
      setTimeout(() => {
        setIsLoggedIn(true);
        setIsLoading(false);
        setUsername(currentState.username);
      }, 500);
      return;
    }

    console.log(`Tab ${tabId.current}: No stuck loading state found on mount`);
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

  // Function to continue loading from a specific progress point (for controller failover)
  const simulateLoadingFromProgress = useCallback(
    (
      startProgress: number,
      remainingDuration: number,
      onComplete: () => void
    ) => {
      let currentProgress = startProgress;
      const startTime = Date.now();

      const updateProgress = () => {
        // Check if we're still the controller
        const currentState = useWorkOSStore.getState();
        if (currentState.loadingController !== tabId.current) {
          return; // Stop if we're no longer the controller
        }

        const elapsedTime = Date.now() - startTime;

        if (elapsedTime >= remainingDuration) {
          // Loading complete
          setLoadingProgress(100);
          setTimeout(() => {
            onComplete();
          }, 1000);
          return;
        }

        // Calculate random increment
        const randomIncrement = Math.random() * 7 + 1;
        const timeBasedProgress =
          startProgress +
          (elapsedTime / remainingDuration) * (100 - startProgress);
        const newProgress = Math.min(
          currentProgress + randomIncrement,
          timeBasedProgress,
          95
        );

        currentProgress = newProgress;
        setLoadingProgress(Math.floor(currentProgress));

        // Schedule next update with random delay
        const randomDelay = Math.random() * 700 + 100;
        setTimeout(updateProgress, randomDelay);
      };

      updateProgress();
    },
    [setLoadingProgress]
  );

  // DISABLED: Failover mechanism - now handled via storage events
  useEffect(() => {
    console.log(`Tab ${tabId.current}: Failover handled via storage events`);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      console.log(
        `Tab ${tabId.current}: Storage event received`,
        e.key,
        e.newValue ? "has data" : "no data"
      );

      // Check if the change is to our work-os-storage key
      if (e.key === "work-os-storage" && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          const newStateData = newState.state;

          console.log(`Tab ${tabId.current}: Storage data:`, {
            loading: newStateData?.isLoading,
            controller: newStateData?.loadingController,
            progress: newStateData?.loadingProgress,
            currentlyLoading: currentIsLoading,
          });

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
            console.log(
              `Tab ${tabId.current}: Controller lost, waiting to see if it's permanent...`
            );
            // Wait a bit to see if the controller really is gone
            // This prevents immediate completion when there are just temporary storage events
            setTimeout(() => {
              const latestState = useWorkOSStore.getState();
              const currentLoadingState = latestState.isLoading; // Get fresh loading state

              console.log(
                `Tab ${tabId.current}: Checking controller loss after delay:`,
                {
                  stillLoading: latestState.isLoading,
                  hasController: !!latestState.loadingController,
                  isLoggedIn: latestState.isLoggedIn,
                  currentLoadingState,
                }
              );

              // Double-check that we still don't have a controller after the delay
              if (
                latestState.isLoading &&
                !latestState.loadingController &&
                !latestState.isLoggedIn &&
                currentLoadingState // Use fresh loading state instead of stale closure variable
              ) {
                console.log(
                  `Tab ${tabId.current}: Controller loss confirmed, completing login to avoid getting stuck...`
                );
                setLoadingProgress(100);
                setTimeout(() => {
                  setIsLoggedIn(true);
                  setIsLoading(false);
                }, 500); // Brief delay to show 100% completion
              } else {
                console.log(
                  `Tab ${tabId.current}: Controller loss check failed - not completing login`
                );
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
            console.log(
              `Tab ${tabId.current}: Another tab started logging in, syncing loading state...`
            );
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
            console.log(
              `Tab ${tabId.current}: Syncing progress ${newStateData.loadingProgress}% from controller ${newStateData.loadingController}`
            );
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
            console.log(
              "Another tab completed login, completing login here..."
            );
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
    setIsLoggedIn,
    setUsername,
    setIsLoading,
    setLoadingProgress,
    setLoadingController,
    simulateLoadingFromProgress,
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
