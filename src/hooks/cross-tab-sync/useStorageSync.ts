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

      if (e.key === "work-os-storage" && e.newValue) {
        try {
          const { state } = JSON.parse(e.newValue);
          const currentState = useWorkOSStore.getState();

          // Initial loading sync
          if (
            state.isLoading &&
            state.loadingController &&
            state.loadingController !== tabId &&
            !currentState.isLoading
          ) {
            setIsLoading(true);
            setUsername(state.username);
            setLoadingProgress(state.loadingProgress);
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
            setLoadingProgress(state.loadingProgress);
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
