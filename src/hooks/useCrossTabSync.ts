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
  } = useWorkOSStore();

  // Generate a unique tab ID
  const tabId = useRef(Math.random().toString(36).substring(7));

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

          // Handle logout (another tab logged out)
          if (!newStateData?.username && currentlyLoggedIn) {
            // Force a page reload to redirect to login
            window.location.href = "/";
            return;
          }

          // Handle login start (another tab started logging in)
          if (
            newStateData?.isLoading &&
            newStateData?.username &&
            newStateData?.loadingController &&
            newStateData.loadingController !== tabId.current &&
            !currentlyLoggedIn
          ) {
            console.log(
              "Another tab started logging in, syncing loading state..."
            );
            // Sync the loading state and username
            setIsLoading(true);
            setUsername(newStateData.username);
          }

          // Sync loading progress from the controlling tab (but only if we're not the controller)
          if (
            newStateData?.isLoading &&
            newStateData?.loadingController &&
            newStateData.loadingController !== tabId.current &&
            newStateData?.loadingProgress !== undefined &&
            !currentlyLoggedIn
          ) {
            // Only sync progress, don't interfere with the simulation
            setLoadingProgress(newStateData.loadingProgress);
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
    setIsLoggedIn,
    setUsername,
    setIsLoading,
    setLoadingProgress,
  ]);

  // Return the simulateLoading function and tabId for use by login components
  return {
    simulateLoading,
    tabId: tabId.current,
  };
};
