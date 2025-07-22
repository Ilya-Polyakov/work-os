import { useEffect } from "react";
import useWorkOSStore from "@/hooks/useWorkOSStore";

export const useLoadingSafetyCheck = (tabId: string) => {
  const {
    setIsLoading,
    setIsLoggedIn,
    setUsername,
    setLoadingProgress,
    setLoadingController,
  } = useWorkOSStore();

  useEffect(() => {
    const state = useWorkOSStore.getState();

    if (
      state.isLoading &&
      state.loadingController &&
      state.loadingController !== tabId &&
      !state.isLoggedIn
    ) {
      setIsLoading(true);
      setUsername(state.username);
      setLoadingProgress(state.loadingProgress);
      setLoadingController(state.loadingController);
      return;
    }

    if (
      state.isLoading &&
      !state.loadingController &&
      !state.isLoggedIn &&
      state.username?.trim()
    ) {
      setLoadingProgress(100);
      setTimeout(() => {
        setIsLoggedIn(true);
        setIsLoading(false);
        setUsername(state.username);
      }, 500);
    }
  }, [
    tabId,
    setIsLoading,
    setIsLoggedIn,
    setUsername,
    setLoadingProgress,
    setLoadingController,
  ]);
};
