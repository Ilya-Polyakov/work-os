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
