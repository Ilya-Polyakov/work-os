import { useEffect, useRef } from "react";
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

  // Track pending auto-complete login timeout
  const autoCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressUpdateRef = useRef(0); // is used to throttle how often the loading progress is updated in response to cross-tab sync events.

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Helper to check for recent logout
      function isRecentLogout() {
        const recentLogout = localStorage.getItem("user-logout");
        if (recentLogout) {
          try {
            const logoutData = JSON.parse(recentLogout);
            const timeSinceLogout = Date.now() - logoutData.timestamp;
            if (timeSinceLogout < 2000) return true;
          } catch {}
        }
        return false;
      }

      if (e.key === "user-logout" && e.newValue) {
        if (autoCompleteTimeoutRef.current) {
          clearTimeout(autoCompleteTimeoutRef.current);
          autoCompleteTimeoutRef.current = null;
        }
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

      // Guard: If a recent logout happened, ignore all work-os-storage events
      if (e.key === "work-os-storage" && e.newValue && isRecentLogout()) {
        return;
      }

      if (e.key === "work-os-storage" && e.newValue) {
        try {
          const { state } = JSON.parse(e.newValue);
          const currentState = useWorkOSStore.getState();

          // This prevents rapid, repeated updates to the loading progress, which could cause unnecessary re-renders or UI flicker.
          function setThrottledLoadingProgress(progress: number) {
            const now = Date.now();
            if (now - lastProgressUpdateRef.current > 400) {
              // 400ms throttle
              useWorkOSStore.getState().setLoadingProgress(progress);
              lastProgressUpdateRef.current = now;
            }
          }

          // Initial loading sync
          if (
            state.isLoading &&
            state.loadingController &&
            state.loadingController !== tabId &&
            !currentState.isLoading
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
            if (autoCompleteTimeoutRef.current) {
              clearTimeout(autoCompleteTimeoutRef.current);
            }
            autoCompleteTimeoutRef.current = setTimeout(() => {
              // Double-check before setting logged in
              if (!isRecentLogout()) {
                setIsLoggedIn(true);
                setIsLoading(false);
                setUsername(state.username);
              }
              autoCompleteTimeoutRef.current = null;
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
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (autoCompleteTimeoutRef.current) {
        clearTimeout(autoCompleteTimeoutRef.current);
      }
    };
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
