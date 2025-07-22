import { useEffect } from "react";
import useWorkOSStore from "@/hooks/useWorkOSStore";

export const useStorageSync = (tabId: string) => {
  const {
    setIsLoggedIn,
    setUsername,
    setIsLoading,
    setLoadingProgress,
    setLoadingController,
    clearLogoutFlag,
  } = useWorkOSStore();

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user-logout" && e.newValue) {
        setIsLoggedIn(false);
        setIsLoading(false);
        setLoadingProgress(0);
        setLoadingController(null);
        setUsername("");

        const {
          setIsLoggedOutFromIdle,
          setModalIsOpen,
          resetIdleWarningSystem,
        } = useWorkOSStore.getState();

        setIsLoggedOutFromIdle(false);
        setModalIsOpen(false);
        resetIdleWarningSystem();

        setTimeout(clearLogoutFlag, 100);
        return;
      }

      let lastProgressUpdate = 0;

      function setThrottledLoadingProgress(progress: number) {
        const now = Date.now();
        if (now - lastProgressUpdate > 400) {
          // 400ms throttle
          useWorkOSStore.getState().setLoadingProgress(progress);
          lastProgressUpdate = now;
        }
      }

      if (e.key === "work-os-storage" && e.newValue) {
        try {
          const { state } = JSON.parse(e.newValue);
          const currentState = useWorkOSStore.getState();

          function shouldIgnoreLoginFn() {
            const recentLogout = localStorage.getItem("user-logout");
            if (recentLogout) {
              try {
                const logoutData = JSON.parse(recentLogout);
                const timeSinceLogout = Date.now() - logoutData.timestamp;
                if (timeSinceLogout < 2000) {
                  return true;
                }
              } catch {
                // Ignore parsing errors
              }
            }
            return false;
          }

          const shouldIgnoreLogin = shouldIgnoreLoginFn();

          // Initial loading sync
          if (
            state.isLoading &&
            state.loadingController &&
            state.loadingController !== tabId &&
            !currentState.isLoading &&
            !shouldIgnoreLogin
          ) {
            setIsLoading(true);
            setUsername(state.username);
            setThrottledLoadingProgress(state.loadingProgress);
            setLoadingController(state.loadingController);
          }

          // Progress sync
          if (
            state.isLoading &&
            state.loadingController &&
            state.loadingController !== tabId &&
            typeof state.loadingProgress === "number" &&
            currentState.isLoading
          ) {
            setThrottledLoadingProgress(state.loadingProgress);
          }

          // Complete login if another tab finished logging in
          if (
            state.isLoggedIn &&
            state.username &&
            !state.isLoading &&
            !currentState.isLoggedIn
          ) {
            setIsLoggedIn(true);
            setIsLoading(false);
            setUsername(state.username);
          }

          // Handle case where loading controller is gone
          if (
            state.isLoading &&
            !state.loadingController &&
            !currentState.isLoggedIn &&
            currentState.isLoading &&
            state.username
          ) {
            setThrottledLoadingProgress(100);
            setTimeout(() => {
              setIsLoggedIn(true);
              setIsLoading(false);
              setUsername(state.username);
            }, 500);
          }

          if (
            state.totalClicks !== undefined &&
            state.totalClicks > currentState.totalClicks
          ) {
            useWorkOSStore.setState({ totalClicks: state.totalClicks });
          }
        } catch (err) {
          console.error("Failed to parse localStorage update:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [
    tabId,
    setIsLoggedIn,
    setUsername,
    setIsLoading,
    setLoadingProgress,
    setLoadingController,
    clearLogoutFlag,
  ]);
};
